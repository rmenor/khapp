/**
 * DDL de la base de datos de contabilidad (SQLite local).
 *
 * Se define en código (y no en un .sql) para que no dependa del file tracing
 * de Next.js en el build de producción.
 */
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS months (
  id INTEGER PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  congregation TEXT,
  opening_balance REAL NOT NULL DEFAULT 0,
  closing_balance REAL NOT NULL DEFAULT 0,
  income_total REAL NOT NULL DEFAULT 0,
  expense_total REAL NOT NULL DEFAULT 0,
  source_hash TEXT,
  imported_at TEXT NOT NULL,
  notes TEXT,
  UNIQUE(year, month, congregation)
);

CREATE TABLE IF NOT EXISTS concepts (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK(kind IN ('income', 'expense', 'transfer')),
  category TEXT,
  -- Código CT del S-26 que asigna este concepto (C, G, D, OM, T).
  ct_code TEXT
);

CREATE INDEX IF NOT EXISTS idx_concepts_ct ON concepts(ct_code);

CREATE TABLE IF NOT EXISTS concept_rules (
  id INTEGER PRIMARY KEY,
  pattern TEXT NOT NULL,
  concept_id INTEGER NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY,
  month_id INTEGER NOT NULL REFERENCES months(id) ON DELETE CASCADE,
  day INTEGER,
  description TEXT NOT NULL,
  ct_code TEXT,
  concept_id INTEGER REFERENCES concepts(id) ON DELETE SET NULL,
  account_from TEXT,
  account_to TEXT,
  inflow REAL NOT NULL DEFAULT 0,
  outflow REAL NOT NULL DEFAULT 0,
  raw_text TEXT,
  line_no INTEGER,
  -- Descripción normalizada (sin acentos y en minúsculas) para que el filtro
  -- de texto libre encuentre "electronica" al escribirlo sin tilde.
  search_text TEXT
);

-- Cada importe se guarda por separado: una fila puede tener entrada en una
-- cuenta y salida en otra (caja -> banco). Nunca se suman a ciegas.
CREATE TABLE IF NOT EXISTS transaction_entries (
  id INTEGER PRIMARY KEY,
  transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  account TEXT NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('entrada', 'salida')),
  amount REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS summary_lines (
  id INTEGER PRIMARY KEY,
  month_id INTEGER NOT NULL REFERENCES months(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  label TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS imports (
  id INTEGER PRIMARY KEY,
  source_hash TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  rows INTEGER NOT NULL DEFAULT 0,
  warnings TEXT,
  month_id INTEGER REFERENCES months(id) ON DELETE SET NULL,
  doc_type TEXT,
  status TEXT NOT NULL DEFAULT 'ok'
);

CREATE TABLE IF NOT EXISTS resolutions (
  id INTEGER PRIMARY KEY,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  start_date TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_transactions_month ON transactions(month_id);
CREATE INDEX IF NOT EXISTS idx_transactions_concept ON transactions(concept_id);
CREATE INDEX IF NOT EXISTS idx_transactions_ct ON transactions(ct_code);
CREATE INDEX IF NOT EXISTS idx_entries_transaction ON transaction_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_summary_month ON summary_lines(month_id);
CREATE INDEX IF NOT EXISTS idx_imports_hash ON imports(source_hash);
CREATE INDEX IF NOT EXISTS idx_rules_concept ON concept_rules(concept_id);
`;
