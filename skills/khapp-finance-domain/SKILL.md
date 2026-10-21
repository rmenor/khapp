---
name: khapp-finance-domain
description: >
  Enforces the financial domain rules of KH App: the local SQLite accounting
  database, the PDF import pipeline (S-26 / S-30), the concepts and rules that
  classify movements, the reconciliation between the summary and the ledger,
  and the rule that no PDF is ever persisted.
  Trigger: Modifying the accounting module, the finance pages, the import
  pipeline, the SQLite schema of the accounting data, or the backup/restore
  feature in KH App.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "2.0"
---

## When to Use

- When adding or modifying anything under `src/lib/finance/` (parsers, import
  pipeline, concept resolution, preview store).
- When adding or modifying anything under `src/lib/db/` (schema, queries,
  reconciliation).
- When changing the `/finance` pages or the components in
  `src/components/finance/`.
- When modifying the accounting backup/restore in `src/app/settings/page.tsx`.
- When touching `scripts/finance-*.ts` or `scripts/db-*.ts`.

## The domain moved from Firestore to local SQLite

The accounting domain no longer lives in Firestore. `transactions` and
`resolutions` are now SQLite tables in `data/contabilidad.db`. The Firestore
collections of the same name are **not used any more**: the code must not read
or write them.

Other domains (requests, publishers, groups, privileges, annual assignments)
stay in Firestore. Do not "migrate" them as a side effect.

## Critical Patterns

### 1. The data comes from the PDF, nothing is invented

Every figure shown by the app comes from the text of an imported PDF.

- A value that cannot be parsed as an amount is **discarded with a warning**,
  never replaced by a guess.
- A document with no text layer is reported as *"parece un escaneo, no puedo
  leerlo"* and **no rows are stored**.
- A document that is neither S-26 nor S-30 is **ignored without error**.
- A month whose totals do not reconcile is shown **in red with the difference**,
  not hidden and not auto-corrected.

**Anti-pattern:** never "fix" a discrepancy by adjusting a figure, and never
fall back to a default amount.

### 2. The PDF is never persisted

The uploaded files are processed in memory and discarded. The `imports` table
stores only: `source_hash`, `filename`, `imported_at`, `rows`, `warnings`,
`doc_type` and `status`.

- Do not write the PDF to disk, to `tmp`, to the vault or to any external
  service.
- The batch folder import reads the folder **read-only**: no copying, no
  moving, no deleting.
- The preview lives in memory (`src/lib/finance/preview-store.ts`) with a
  30 minute TTL.

### 3. The month comes from the header, not from the filename

The header of both documents (`"septiembre de 2026"`) is the source of truth.
The filename is only used to **warn** about a mismatch. Document type
detection is by **content** too: `HOJA DE CUENTAS (S-26)` and `INFORME MENSUAL
DE LAS CUENTAS DE LA CONGREGACIÓN (S-30)`. Filenames vary wildly
(`25-05-Mayo`, `Estado de cuentas - 08-2026.pdf` vs `Estado de cuentas -
2026-09.pdf`) and must never drive parsing.

### 4. Amounts are never summed blindly

A row can carry two amounts in different accounts (a deposit from the cash box
to the bank). It is stored as **one movement with two entries**:

- `transactions` keeps the row totals (`inflow`, `outflow`),
- `transaction_entries` keeps each amount with its `account` and `direction`,
- `account_from` / `account_to` record the accounts involved.

Summing the two amounts of a deposit as if both were income gives 440,00
instead of 0,00 and breaks the month.

**Anti-pattern:** never derive the income of a row from the sum of its amounts.

### 5. Concept kinds decide what counts as income or expense

A concept has a `kind`:

| `kind` | Meaning |
|--------|---------|
| `income` | Counts as income |
| `expense` | Counts as expense |
| `transfer` | Internal transfer between accounts: it moves funds but it is **neither** income nor expense |

A deposit from the cash box to the bank is a `transfer`. Counting it as an
expense breaks the reconciliation.

Concept resolution order: **`ct_code` → `concept_rules` (by priority) → no
concept**. A movement that matches nothing stays unclassified and is visible
as such. Do not invent a fallback concept.

### 6. The reconciliation has a 0,01 € tolerance

`src/lib/db/reconciliation.ts` compares, per month:

1. `months.income_total` (S-30) against the sum of the inflows of the
   movements whose concept is `income`.
2. `months.expense_total` (S-30) against the sum of the outflows of the
   movements whose concept is `expense`.
3. `opening_balance + (all inflows − all outflows)` against `closing_balance`.

The balance check uses **all** movements, including transfers, because a
transfer does move the congregation's funds. The income and expense checks use
only the matching concept kinds.

Any difference greater than 0,01 € must be visible in the UI.

### 7. Money is never stored negative

`inflow` and `outflow` are always positive; the direction is expressed by the
column and by `transaction_entries.direction`. This is the opposite of the old
Firestore model, where the `type` (`income` / `expense`) carried the direction.

### 8. Resolutions are deactivated, never deleted

`resolutions` is a SQLite table with an `is_active` flag. `deleteResolutionAction`
sets `is_active = 0`. Historical resolutions are kept for auditing.

### 9. Filters live in the URL

Every filter of the movements view is a query parameter (`year`, `mes`,
`trimestre`, `concepto`, `ct`, `cuenta`, `q`, `min`, `max`). The server reads
them, applies them in SQL and recalculates the totals. A new filter must
follow the same pattern so the view stays shareable.

### 10. The CSV export reuses the same filters

`/api/finance/movimientos.csv` parses the same query parameters as the page.
The exported file must contain exactly the rows of the filtered view.

## Code Examples

### Importing a movement with two amounts (a transfer)

```typescript
// Una fila con salida de caja y entrada de banco: 220,00 en cada cuenta.
entries.push(
  { account: 'caja', direction: 'salida', amount: 220 },
  { account: 'banco', direction: 'entrada', amount: 220 },
);

const isTransfer = entradaCuentas.size > 0 && salidaCuentas.size > 0 && cuentasDistintas;
```

### Assigning a concept

```typescript
export function resolveConcept(ctCode: string | null, description: string): number | null {
  if (ctCode) {
    const byCode = db.prepare('SELECT id FROM concepts WHERE ct_code = ?').get(ctCode);
    if (byCode) return byCode.id;
  }

  for (const rule of reglas) {
    if (description.toLowerCase().includes(rule.pattern.toLowerCase())) return rule.id;
  }

  return null;  // Sin clasificar: no se inventa nada.
}
```

### Writing a month atomically

```typescript
db.exec('BEGIN');
try {
  // ... inserciones ...
  db.exec('COMMIT');
} catch (error) {
  db.exec('ROLLBACK');
  return { success: false, message: '...' };
}
```

## Commands

```bash
npm run typecheck          # TypeScript
npm run lint               # ESLint
npm test                   # vitest
npm run db:init            # Crea data/contabilidad.db vacía
npm run db:demo            # Volcado de ejemplo (3 meses sintéticos)
npm run finance:inspect -- <pdf>   # Diagnóstico de un PDF
npm run finance:report     # Meses importados y ficheros fallidos
```

## Anti-Patterns (Read Before Modifying)

- ❌ **Do not** write, copy or persist the uploaded PDF anywhere.
- ❌ **Do not** invent figures, concepts or months to make a report balance.
- ❌ **Do not** parse by filename: the type and the month come from the content.
- ❌ **Do not** sum the two amounts of a row as if they were both income.
- ❌ **Do not** count a `transfer` concept as income or expense.
- ❌ **Do not** store negative amounts.
- ❌ **Do not** delete a resolution: deactivate it.
- ❌ **Do not** add a filter that does not travel in the URL.
- ❌ **Do not** touch the Firestore `transactions` or `resolutions` collections.
- ❌ **Do not** read Firestore from the finance pages: the data is in SQLite.
