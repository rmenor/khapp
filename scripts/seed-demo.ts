/**
 * Volcado de ejemplo de la base de datos de contabilidad.
 *
 * Genera una base con tres meses sintéticos para poder probar la interfaz
 * sin datos reales. Las descripciones no contienen nombres de donantes.
 *
 *   npm run db:demo
 */
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA } from '../src/lib/db/schema.ts';
import { normalizeSearch } from '../src/lib/finance/normalize/search.ts';

const target = process.env.CONTABILIDAD_DEMO_PATH
  ? resolve(process.cwd(), process.env.CONTABILIDAD_DEMO_PATH)
  : resolve(process.cwd(), 'data/contabilidad.demo.db');

// Se regenera desde cero para que el volcado sea siempre reproducible.
for (const suffix of ['', '-wal', '-shm']) {
  rmSync(`${target}${suffix}`, { force: true });
}

mkdirSync(dirname(target), { recursive: true });

const db = new DatabaseSync(target);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');
db.exec(SCHEMA);

const insertConcept = db.prepare(
  'INSERT INTO concepts (name, kind, category, ct_code) VALUES (?, ?, ?, ?)',
);
const insertRule = db.prepare(
  'INSERT INTO concept_rules (pattern, concept_id, priority) VALUES (?, ?, ?)',
);
const insertMonth = db.prepare(
  `INSERT INTO months
     (year, month, congregation, opening_balance, closing_balance,
      income_total, expense_total, source_hash, imported_at, notes)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
);
const insertTransaction = db.prepare(
  `INSERT INTO transactions
     (month_id, day, description, ct_code, concept_id, account_from, account_to,
      inflow, outflow, raw_text, line_no, search_text)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
);
const insertEntry = db.prepare(
  'INSERT INTO transaction_entries (transaction_id, account, direction, amount) VALUES (?, ?, ?, ?)',
);
const insertSummary = db.prepare(
  'INSERT INTO summary_lines (month_id, section, label, amount, level) VALUES (?, ?, ?, ?, ?)',
);

const CONCEPTS = [
  ['Donaciones para la congregación (cajas)', 'income', 'congregation', 'C'],
  ['Donaciones electrónicas', 'income', 'congregation', 'T'],
  ['Obra mundial', 'income', 'worldwide_work', 'OM'],
  ['Gastos de la congregación', 'expense', 'other', 'G'],
  ['Depósito de las donaciones', 'transfer', 'other', 'D'],
  ['Envío a la sucursal', 'expense', 'branch', null],
] as const;

const conceptIds = new Map<string, number>();
for (const [name, kind, category, ctCode] of CONCEPTS) {
  const result = insertConcept.run(name, kind, category, ctCode);
  conceptIds.set(name, Number(result.lastInsertRowid));
}

insertRule.run('Para la sucursal', conceptIds.get('Envío a la sucursal')!, 0);
insertRule.run('Obra mundial', conceptIds.get('Obra mundial')!, 0);

interface DemoMovement {
  day: number;
  description: string;
  ct: string | null;
  concept: string;
  inflow: number;
  outflow: number;
  from?: string;
  to?: string;
}

interface DemoMonth {
  year: number;
  month: number;
  opening: number;
  closing: number;
  income: number;
  expense: number;
  movements: DemoMovement[];
}

/**
 * Los totales de cada mes cuadran con sus movimientos:
 *   closing = opening + ingresos - gastos
 * Los traspasos (depósitos) mueven fondos pero no son ingreso ni gasto.
 */
const DEMO_MONTHS: DemoMonth[] = [
  {
    year: 2026,
    month: 7,
    opening: 3120.4,
    closing: 3340.4,
    income: 460,
    expense: 240,
    movements: [
      { day: 5, description: 'Donaciones para la congregación (cajas)', ct: 'C', concept: 'Donaciones para la congregación (cajas)', inflow: 310, outflow: 0, to: 'caja' },
      { day: 8, description: 'Depósito de las donaciones (cajas)', ct: 'D', concept: 'Depósito de las donaciones', inflow: 180, outflow: 180, from: 'caja', to: 'banco' },
      { day: 19, description: 'Obra mundial', ct: 'OM', concept: 'Obra mundial', inflow: 150, outflow: 0, to: 'banco' },
      { day: 26, description: 'Alquiler del local', ct: 'G', concept: 'Gastos de la congregación', inflow: 0, outflow: 240, from: 'caja' },
    ],
  },
  {
    year: 2026,
    month: 8,
    opening: 3340.4,
    closing: 3349.85,
    income: 385,
    expense: 375.55,
    movements: [
      { day: 4, description: 'Donaciones para la congregación (cajas)', ct: 'C', concept: 'Donaciones para la congregación (cajas)', inflow: 275, outflow: 0, to: 'caja' },
      { day: 12, description: 'Depósito de las donaciones (cajas)', ct: 'D', concept: 'Depósito de las donaciones', inflow: 200, outflow: 200, from: 'caja', to: 'banco' },
      { day: 21, description: 'Donación electrónica', ct: 'T', concept: 'Donaciones electrónicas', inflow: 110, outflow: 0, to: 'banco' },
      { day: 27, description: 'Material de limpieza', ct: 'G', concept: 'Gastos de la congregación', inflow: 0, outflow: 45.55, from: 'caja' },
      { day: 30, description: 'Para la sucursal', ct: null, concept: 'Envío a la sucursal', inflow: 0, outflow: 330, from: 'banco' },
    ],
  },
  {
    year: 2026,
    month: 9,
    opening: 3349.85,
    closing: 3841.85,
    income: 787,
    expense: 295,
    movements: [
      { day: 3, description: 'Donaciones para la congregación (cajas)', ct: 'C', concept: 'Donaciones para la congregación (cajas)', inflow: 425, outflow: 0, to: 'caja' },
      { day: 8, description: 'Depósito de las donaciones (cajas)', ct: 'D', concept: 'Depósito de las donaciones', inflow: 220, outflow: 220, from: 'caja', to: 'banco' },
      { day: 10, description: 'Obra mundial', ct: 'OM', concept: 'Obra mundial', inflow: 95, outflow: 0, to: 'banco' },
      { day: 28, description: 'Donación electrónica', ct: 'T', concept: 'Donaciones electrónicas', inflow: 267, outflow: 0, to: 'banco' },
      { day: 30, description: 'Para la sucursal', ct: null, concept: 'Envío a la sucursal', inflow: 0, outflow: 295, from: 'banco' },
    ],
  },
];

for (const month of DEMO_MONTHS) {
  const monthResult = insertMonth.run(
    month.year,
    month.month,
    'Congregación de ejemplo',
    month.opening,
    month.closing,
    month.income,
    month.expense,
    null,
    new Date().toISOString(),
    'Volcado de ejemplo',
  );
  const monthId = Number(monthResult.lastInsertRowid);

  month.movements.forEach((movement, index) => {
    const result = insertTransaction.run(
      monthId,
      movement.day,
      movement.description,
      movement.ct,
      conceptIds.get(movement.concept) ?? null,
      movement.from ?? null,
      movement.to ?? null,
      movement.inflow,
      movement.outflow,
      `${movement.day} ${movement.description}`,
      index + 1,
      normalizeSearch(movement.description),
    );
    const transactionId = Number(result.lastInsertRowid);

    if (movement.inflow > 0) {
      insertEntry.run(transactionId, movement.to ?? 'caja', 'entrada', movement.inflow);
    }
    if (movement.outflow > 0) {
      insertEntry.run(transactionId, movement.from ?? 'caja', 'salida', movement.outflow);
    }
  });

  // El total de "recibido para la congregación" es el ingreso del mes menos
  // el de otros ingresos (obra mundial), para que el resumen cuadre.
  const otrosIngresos = month.movements
    .filter((movement) => movement.concept === 'Obra mundial')
    .reduce((total, movement) => total + movement.inflow, 0);

  const summaryLines: [string, string, number, number][] = [
    ['opening', 'Fondos al comienzo del mes', month.opening, 0],
    ['income', 'Ingresos', 0, 0],
    ['income', 'Recibido para la congregación', 0, 1],
    ['income', 'Total recibido para la congregación', month.income - otrosIngresos, 2],
    ['income', 'Otros ingresos', otrosIngresos, 1],
    ['income', 'Total de ingresos', month.income, 1],
    ['expense', 'Desembolsos', 0, 0],
    ['expense', 'Total de desembolsos', month.expense, 2],
    ['closing', 'Fondos al final del mes', month.closing, 0],
  ];

  for (const [section, label, amount, level] of summaryLines) {
    insertSummary.run(monthId, section, label, amount, level);
  }
}

db.close();

console.log(`Volcado de ejemplo creado en ${target}`);
console.log('Contiene 3 meses y 14 movimientos sintéticos, sin datos personales.');
console.log('Para usarlo: CONTABILIDAD_DB_PATH=data/contabilidad.demo.db npm run dev');
