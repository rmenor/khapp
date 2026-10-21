# Diseño: Contabilidad local con SQLite e importación de informes PDF

## 1. Modelo de datos (SQLite)

Base local: `data/contabilidad.db`. Ruta configurable con
`CONTABILIDAD_DB_PATH`. El DDL vive en `src/lib/db/schema.ts` (en código, para
no depender del file tracing de Next.js).

```sql
CREATE TABLE months (
  id INTEGER PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  congregation TEXT,
  opening_balance REAL NOT NULL DEFAULT 0,   -- "Fondos al comienzo del mes" (S-30)
  closing_balance REAL NOT NULL DEFAULT 0,   -- "Fondos al final del mes" (S-30)
  income_total  REAL NOT NULL DEFAULT 0,     -- "Total de ingresos" (S-30)
  expense_total REAL NOT NULL DEFAULT 0,     -- total de desembolsos (S-30)
  source_hash TEXT,                          -- hash del S-26
  imported_at TEXT NOT NULL,
  notes TEXT,
  UNIQUE(year, month, congregation)
);

CREATE TABLE transactions (
  id INTEGER PRIMARY KEY,
  month_id INTEGER NOT NULL REFERENCES months(id) ON DELETE CASCADE,
  day INTEGER,
  description TEXT NOT NULL,
  ct_code TEXT,
  concept_id INTEGER REFERENCES concepts(id) ON DELETE SET NULL,
  account_from TEXT,                          -- caja | banco | NULL
  account_to TEXT,                            -- caja | banco | NULL
  inflow REAL NOT NULL DEFAULT 0,
  outflow REAL NOT NULL DEFAULT 0,
  raw_text TEXT,
  line_no INTEGER
);

-- Cada importe se guarda por separado: una fila puede tener entrada en una
-- cuenta y salida en otra (caja -> banco). Nunca se suman a ciegas.
CREATE TABLE transaction_entries (
  id INTEGER PRIMARY KEY,
  transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  account TEXT NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('entrada','salida')),
  amount REAL NOT NULL
);

CREATE TABLE summary_lines (
  id INTEGER PRIMARY KEY,
  month_id INTEGER NOT NULL REFERENCES months(id) ON DELETE CASCADE,
  section TEXT NOT NULL,                      -- opening | income | expense | closing | other
  label TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 0            -- nivel de sangría
);

CREATE TABLE concepts (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK(kind IN ('income','expense','transfer')),
  category TEXT,                              -- congregation | worldwide_work | renovation | branch | other
  ct_code TEXT                                -- C | G | D | OM | T
);

CREATE TABLE concept_rules (
  id INTEGER PRIMARY KEY,
  pattern TEXT NOT NULL,
  concept_id INTEGER NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE accounts (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, kind TEXT NOT NULL);

CREATE TABLE imports (
  id INTEGER PRIMARY KEY,
  source_hash TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  rows INTEGER NOT NULL DEFAULT 0,
  warnings TEXT,
  month_id INTEGER REFERENCES months(id) ON DELETE SET NULL,
  doc_type TEXT,
  status TEXT NOT NULL DEFAULT 'ok'           -- ok | error
);

CREATE TABLE resolutions (
  id INTEGER PRIMARY KEY,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  start_date TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);
```

Índices: `transactions(month_id)`, `transactions(concept_id)`,
`transactions(ct_code)`, `transaction_entries(transaction_id)`,
`summary_lines(month_id)`, `imports(source_hash)`, `concept_rules(concept_id)`,
`concepts(ct_code)`.

## 2. Tipos de datos TypeScript

En `src/lib/finance/types.ts`:

```typescript
export type ConceptKind = 'income' | 'expense' | 'transfer';

export interface Month {
  id: number; year: number; month: number;
  congregation: string | null;
  opening_balance: number; closing_balance: number;
  income_total: number; expense_total: number;
  source_hash: string | null; imported_at: string; notes: string | null;
}

export interface Concept {
  id: number; name: string; kind: ConceptKind;
  category: string | null; ct_code: string | null;
}

export interface Transaction {
  id: number; month_id: number; day: number | null;
  description: string; ct_code: string | null; concept_id: number | null;
  account_from: string | null; account_to: string | null;
  inflow: number; outflow: number;
  raw_text: string | null; line_no: number | null;
}

export interface TransactionEntry {
  id: number; transaction_id: number;
  account: string; direction: 'entrada' | 'salida'; amount: number;
}

export interface MovementRow extends Transaction {
  year: number; month: number; congregation: string | null;
  concept_name: string | null; concept_kind: ConceptKind | null;
  concept_category: string | null;
}
```

Los tipos de parsing (`ParsedTransaction`, `ParsedSummary`, `ParseWarning`) viven
en el mismo archivo.

## 3. Acciones de Servidor

En `src/lib/finance/actions.ts` (`'use server'`), todas con
`verifySessionOrThrow()` y `revalidatePath`:

| Acción | Zod | Efecto |
|--------|-----|--------|
| `saveConceptAction` | `{ name, kind, category?, ctCode?, id? }` | Alta o edición de un concepto |
| `deleteConceptAction` | `id: number` | Borra un concepto (sus movimientos quedan sin clasificar) |
| `saveRuleAction` | `{ pattern, conceptId, priority?, id? }` | Alta o edición de una regla |
| `deleteRuleAction` | `id: number` | Borra una regla |
| `reapplyConceptsAction` | — | Reclasifica todos los movimientos con los códigos CT y las reglas actuales |

En `src/lib/finance/resolutions-actions.ts`:

| Acción | Efecto |
|--------|--------|
| `listResolutionsAction` | Lista las resoluciones |
| `addResolutionAction` | Añade una resolución |
| `deleteResolutionAction` | **Desactiva** la resolución (no se borra: se conserva el histórico) |

En `src/lib/finance/backup-actions.ts`:

| Acción | Efecto |
|--------|--------|
| `exportFinanceAction` | Devuelve las tablas de contabilidad en JSON |
| `restoreFinanceAction` | Reemplaza el contenido de la contabilidad por el del archivo |

### Rutas (route handlers)

Están fuera del matcher del middleware, así que **verifican la sesión ellas
mismas** con `verifySession` y la cookie `__session`:

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/finance/import/preview` | POST | Multipart con los PDF → vista previa (sin escribir nada) |
| `/api/finance/import/confirm` | POST | Token + ajustes → escritura en SQLite |
| `/api/finance/import/folder` | POST | Ruta de una carpeta → vista previa (lectura) |
| `/api/finance/movimientos.csv` | GET | CSV de la vista filtrada |

## 4. Diseño de Interfaz de Usuario (UI)

### Navegación

`/finance` ya estaba en la barra lateral. Se añade un `layout.tsx` con la
sub-navegación: **Resumen · Importar · Movimientos · Estadísticas ·
Conceptos**.

### Resumen (`/finance`)

Server Component. Lee los meses de SQLite y la tabla de cuadre.

- Cabecera con el periodo activo.
- Ocho tarjetas: ingresos, gastos, balance y saldo final del mes; saldo
  inicial, variación y número de movimientos.
- Gráfico de barras (ingresos y gastos por mes) y gráfico de líneas (evolución
  del saldo).
- Tabla de cuadre S-30 / S-26 con las diferencias en rojo.

### Importar (`/finance/importar`)

- `ImportDropzone` (client): arrastrar y soltar, selector de ficheros e
  import en lote desde una carpeta local.
- `ImportPreviewView` (client): mes detectado, totales, avisos, tabla de
  movimientos con el concepto editable y botones de confirmar y cancelar.
- `ImportHistory` (server): histórico de importaciones y ficheros con error.

### Movimientos (`/finance/movimientos`)

- `FinanceFilters` (client): año, mes, trimestre, concepto, código CT, cuenta,
  texto libre y rango de importe. Todos los filtros se escriben en la URL.
- `MovementsTable` (server + client): tabla, totales con el filtro aplicado y
  botones de exportar a CSV y a PDF.

### Estadísticas (`/finance/estadisticas`)

- Media y mediana de ingresos y gastos mensuales.
- Agregados mensual, trimestral y anual.
- Comparación con el mismo mes del año anterior.
- Reparto por concepto: tarta para ingresos, barras para gastos.

### Conceptos (`/finance/conceptos`)

- `ConceptsManager` (client): alta, edición y borrado de conceptos y de reglas,
  y botón para reaplicar los conceptos a todos los movimientos.

### Impresión

Se reutiliza el patrón de `groups` y `privileges`: `window.print()` con
bloques `print:hidden` y `print:` para el contenido.
