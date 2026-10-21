/**
 * Lista los meses importados y los que han fallado, con su motivo.
 *
 *   npm run finance:report
 */
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA } from '../src/lib/db/schema.ts';

const dbPath = process.env.CONTABILIDAD_DB_PATH
  ? resolve(process.cwd(), process.env.CONTABILIDAD_DB_PATH)
  : resolve(process.cwd(), 'data/contabilidad.db');

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON');
db.exec(SCHEMA);

const months = db
  .prepare(
    `SELECT m.year, m.month, m.opening_balance, m.closing_balance,
            m.income_total, m.expense_total,
            (SELECT COUNT(*) FROM transactions t WHERE t.month_id = m.id) AS rows
       FROM months m
      ORDER BY m.year, m.month`,
  )
  .all();

const imports = db
  .prepare(
    `SELECT filename, doc_type, status, rows, warnings, imported_at
       FROM imports
      ORDER BY imported_at DESC`,
  )
  .all();

const failed = imports.filter((row) => row.status === 'error');
const ignored = imports.filter((row) => row.status !== 'error' && !row.doc_type);

console.log(`\nBase de datos: ${dbPath}\n`);

console.log(`MESES IMPORTADOS (${months.length})`);
console.log('-'.repeat(96));
console.log(
  'Mes'.padEnd(20) + 'Ingresos'.padStart(12) + 'Gastos'.padStart(12) + 'Saldo final'.padStart(14) + 'Movs'.padStart(7),
);
for (const month of months) {
  const name = `${month.month}/${month.year}`;
  console.log(
    name.padEnd(20) +
      Number(month.income_total).toFixed(2).padStart(12) +
      Number(month.expense_total).toFixed(2).padStart(12) +
      Number(month.closing_balance).toFixed(2).padStart(14) +
      String(month.rows).padStart(7),
  );
}

console.log(`\nFICHEROS IMPORTADOS (${imports.length - failed.length})`);
console.log('-'.repeat(96));
for (const row of imports.filter((item) => item.status !== 'error')) {
  console.log(
    `${String(row.doc_type ?? '--').padEnd(6)} ${String(row.rows).padStart(5)} movs | ${row.filename}`,
  );
}

if (failed.length > 0) {
  console.log(`\nFICHEROS CON ERROR (${failed.length})`);
  console.log('-'.repeat(96));
  for (const row of failed) {
    console.log(`${row.filename}\n    Motivo: ${row.warnings ?? 'sin detalle'}`);
  }
}

if (ignored.length > 0) {
  console.log(`\nFICHEROS IGNORADOS (${ignored.length})`);
  console.log('-'.repeat(96));
  for (const row of ignored) {
    console.log(`${row.filename}\n    Motivo: ${row.warnings ?? 'no es un S-26 ni un S-30'}`);
  }
}

db.close();
