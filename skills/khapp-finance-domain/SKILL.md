---
name: khapp-finance-domain
description: >
  Enforces the financial domain rules of KH App: transaction types and status derivation, branch transfer atomicity, resolutions lifecycle, soft-delete with restore, and the JSON backup/restore transform pattern.
  Trigger: Modifying the transactions or resolutions collections, the finance page, the branch transfer flow, or the Excel/JSON backup-restore feature in KH App.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- When adding or modifying any action in [actions.ts](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts) that touches the `transactions` or `resolutions` collections.
- When changing the rules that map `category` to `status` for income.
- When touching the branch transfer flow (`addBranchTransferAction`).
- When working with the backup/restore feature (Excel export, JSON import).
- When modifying the `/finance` page or the `AddTransactionDialog` / `ManageResolutionsDialog` components.

## Critical Patterns

### 1. Transaction Type Matrix

There are exactly **three** transaction types and each one has a fixed set of fields and a default status:

| `type` | `category` allowed | Default `status` | Notes |
|--------|--------------------|------------------|-------|
| `income` | `congregation`, `worldwide_work`, `renovation` | Derived (see below) | Only income has `category` |
| `expense` | _(none)_ | `'Completado'` | Always immediate |
| `branch_transfer` | _(none)_ | `'Completado'` | Created by the branch transfer flow |

Reference: [actions.ts:74-120](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts) (schemas) and [types.ts:5-19](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/types.ts) (types).

### 2. Status Derivation for Income

This rule is **non-negotiable** and lives in [actions.ts:186-191](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts):

```typescript
if (category === 'congregation') {
  status = 'Completado';
} else {
  status = 'Pendiente de envío';
}
```

Meaning:
- `congregation` income → stays in the congregation, status is final.
- `worldwide_work` and `renovation` income → must be sent to the branch, status starts as pending.

The same logic is repeated in [actions.ts:235-240](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts) for `addBatchIncomeAction` and again in [actions.ts:351-357](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts) for `updateTransactionAction` — **when in doubt, mirror these three sites**, do not invent a fourth path.

**Anti-pattern**: never let a client component set the `status` field directly. Status is always derived server-side from `type` + `category`.

### 3. Amount is Always Positive

`amount` is always a **positive number**. The transaction's `type` (`income` / `expense`) determines direction in reports — do not store negative numbers. This is enforced in every Zod schema via `z.coerce.number().positive(...)`.

### 4. Description Length Cap

`description` is capped at 100 characters in every schema. Don't bypass this in the update path either.

### 5. Branch Transfer Atomicity

The `addBranchTransferAction` ([actions.ts:288-326](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts)) is a **two-part write** that must be atomic:

1. `writeBatch.update()` every selected income transaction's `status` to `'Enviado'`.
2. `writeBatch.set()` a new `branch_transfer` document with the same `date` and `description: 'Envío a la sucursal'` (or custom).

Both go in the **same `writeBatch`** and a single `batch.commit()` finalizes them. If you split this into two separate writes, a crash between them leaves the data inconsistent.

**Anti-pattern**: do NOT call `revalidatePath` before `batch.commit()`. The revalidation must happen after the commit so the UI never sees a half-applied state.

### 6. Branch Transfer Validation

The `BranchTransferSchema` ([actions.ts:89-94](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts)) requires at least one `transactionId`. The UI must ensure all selected transactions are currently `'Pendiente de envío'` — the server trusts the input but the client filters first.

### 7. Resolutions Are Separate from Transactions

Resolutions (`resolutions` collection) are **outlays approved by the congregation** with their own lifecycle:

```typescript
{
  id: string;
  description: string;
  amount: number;
  startDate: Timestamp;   // ← Date when the resolution takes effect
  isActive: boolean;      // ← Whether the resolution is still in force
}
```

They are NOT a transaction type. They are referenced by the `ManageResolutionsDialog` ([actions.ts:640-715](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts)). When deactivating a resolution, you set `isActive: false` — do not delete it. Historical resolutions are kept for auditing.

### 8. Soft Delete + Restore via JSON

There is **no real soft delete**. `deleteTransactionAction` calls `deleteDoc` outright ([actions.ts:386](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts)). Instead, the app offers an **export-to-JSON / restore-from-JSON** flow:

- **Export** is not yet a server action; the UI must serialize the visible transactions to a JSON file with the same shape as `RestoreTransactionSchema` ([actions.ts:110-120](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts)).
- **Restore** is `restoreTransactionsAction` ([actions.ts:395-426](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts)).

The restore schema has a **non-obvious transform** ([actions.ts:113-116](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts)):

```typescript
date: z.object({
  seconds: z.number(),
  nanoseconds: z.number(),
}).transform(t => Timestamp.fromMillis(t.seconds * 1000))
```

This exists because the JSON export of a Firestore `Timestamp` serializes to `{seconds, nanoseconds}` (not a full ISO string). The schema accepts that shape and re-hydrates a `Timestamp` from it. **Do not "simplify" this transform** — it is the only thing keeping the restore flow working. If you change the export format, change this transform in lockstep.

### 9. Restore Creates NEW Documents

`restoreTransactionsAction` uses `doc(collection(db, 'transactions'))` (a fresh ref) — it does NOT restore the original IDs. After restore, the docs are duplicates with new IDs, not the same docs back. Document this in any user-facing copy: "Restaurar crea copias, no restaura los IDs originales."

### 10. Default `status` on Update

In `updateTransactionAction` ([actions.ts:351-357](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts)), if the user changes the `category` to `congregation` on an income, status flips to `'Completado'`. If they switch away from `congregation` and the current status is NOT `'Enviado'`, status flips to `'Pendiente de envío'`. The `updateData.status !== 'Enviado'` guard prevents demoting an already-sent transaction.

## Code Examples

### Adding a Single Income (Auto-Derived Status)

```typescript
const { amount, date, description, category } = validatedFields.data;

let status: TransactionStatus;
if (category === 'congregation') {
  status = 'Completado';
} else {
  status = 'Pendiente de envío';
}

await addDoc(collection(db, 'transactions'), {
  type: 'income',
  amount,
  date: Timestamp.fromDate(new Date(date)),
  description: description || '',
  category,
  status,
});
```

Reference: [actions.ts:184-200](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts).

### Branch Transfer (Batch Atomicity)

```typescript
const batch = writeBatch(db);

transactionIds.forEach(id => {
  const docRef = doc(db, 'transactions', id);
  batch.update(docRef, { status: 'Enviado' });
});

const newTransferRef = doc(collection(db, 'transactions'));
batch.set(newTransferRef, {
  amount,
  date: Timestamp.fromDate(new Date(date)),
  type: 'branch_transfer',
  description: description || 'Envío a la sucursal',
  status: 'Completado',
});

await batch.commit();   // ← both writes atomic
revalidatePath('/finance');
```

Reference: [actions.ts:301-322](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts).

### Restore from JSON (Transform-Aware)

```typescript
const RestoreTransactionSchema = z.object({
  type: z.enum(['income', 'expense', 'branch_transfer']),
  amount: z.number(),
  date: z.object({
    seconds: z.number(),
    nanoseconds: z.number(),
  }).transform(t => Timestamp.fromMillis(t.seconds * 1000)),
  description: z.string().optional(),
  category: z.enum(['congregation', 'worldwide_work', 'renovation']).optional(),
  status: z.enum(['Completado', 'Pendiente de envío', 'Enviado']).optional(),
});

const batch = writeBatch(db);
for (const transactionData of transactions) {
  const { id, ...dataToValidate } = transactionData as any;
  const validated = RestoreTransactionSchema.safeParse(dataToValidate);
  if (!validated.success) continue;
  const newDocRef = doc(collection(db, 'transactions'));   // ← new ID
  batch.set(newDocRef, validated.data);
}
await batch.commit();
```

Reference: [actions.ts:110-120](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts) and [actions.ts:395-426](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts).

### Adding a Resolution

```typescript
export async function addResolutionAction(data: z.infer<typeof ResolutionSchema>) {
  // ... validation + db check
  await addDoc(collection(db, 'resolutions'), {
    description,
    amount,
    startDate: Timestamp.fromDate(new Date(startDate)),
    isActive: true,
  });
  revalidatePath('/finance');
}
```

Reference: [actions.ts:640-665](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts).

## Commands

```bash
# Verify all finance schemas still typecheck
npm run typecheck

# Lint
npm run lint

# Manual smoke test
# 1. Add income with category=congregation → status should be "Completado"
# 2. Add income with category=worldwide_work → status should be "Pendiente de envío"
# 3. Select 2+ pending incomes, click "Enviar a sucursal" → both flip to "Enviado",
#    a new branch_transfer doc is created
# 4. Export to JSON, delete some transactions, restore from JSON → new docs appear
npm run dev
```

## Anti-Patterns (Read Before Modifying)

- ❌ **Do not** add a `category` to an `expense` or `branch_transfer`. Only `income` carries a category.
- ❌ **Do not** let the UI send a hardcoded `status` for income. Always derive it from `category`.
- ❌ **Do not** store `amount` as negative. Use `type` to express direction.
- ❌ **Do not** split the branch transfer into two non-atomic writes.
- ❌ **Do not** delete a resolution when it stops being used — set `isActive: false`.
- ❌ **Do not** change the `{seconds, nanoseconds}` restore schema without updating the export side in lockstep.
- ❌ **Do not** add new transaction types without updating both the Zod schema AND the `updateTransactionAction` status logic.
