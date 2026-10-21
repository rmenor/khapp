import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let tempDir: string;
let previousDbPath: string | undefined;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'cuadre-test-'));
  previousDbPath = process.env.CONTABILIDAD_DB_PATH;
  process.env.CONTABILIDAD_DB_PATH = join(tempDir, 'contabilidad.db');

  const globalForDb = globalThis as unknown as { __contabilidadDb?: unknown };
  globalForDb.__contabilidadDb = undefined;
});

afterEach(() => {
  if (previousDbPath === undefined) {
    delete process.env.CONTABILIDAD_DB_PATH;
  } else {
    process.env.CONTABILIDAD_DB_PATH = previousDbPath;
  }
  rmSync(tempDir, { recursive: true, force: true });
});

async function seed(options: {
  incomeTotal: number;
  movementIncome: number;
  opening: number;
  closing: number;
  movementOutflow: number;
  expenseTotal: number;
}) {
  const { getDb } = await import('@/lib/db/client');
  const db = getDb();

  db.prepare(
    `INSERT INTO concepts (name, kind, category, ct_code) VALUES ('Ingresos', 'income', 'congregation', 'C')`,
  ).run();
  db.prepare(
    `INSERT INTO concepts (name, kind, category, ct_code) VALUES ('Gastos', 'expense', 'other', 'G')`,
  ).run();
  db.prepare(
    `INSERT INTO concepts (name, kind, category) VALUES ('Traspaso', 'transfer', 'other')`,
  ).run();

  db.prepare(
    `INSERT INTO months (year, month, congregation, opening_balance, closing_balance,
                         income_total, expense_total, imported_at)
     VALUES (2026, 9, 'Prado', ?, ?, ?, ?, '2026-09-30T00:00:00.000Z')`,
  ).run(options.opening, options.closing, options.incomeTotal, options.expenseTotal);

  const conceptId = db.prepare(`SELECT id FROM concepts WHERE name = 'Ingresos'`).get() as {
    id: number;
  };
  const transferId = db.prepare(`SELECT id FROM concepts WHERE name = 'Traspaso'`).get() as {
    id: number;
  };

  const insert = db.prepare(
    `INSERT INTO transactions (month_id, day, description, concept_id, inflow, outflow, line_no)
     VALUES (1, 1, 'Ingreso', ?, ?, 0, 1)`,
  );
  insert.run(conceptId.id, options.movementIncome);

  const insertExpense = db.prepare(
    `INSERT INTO transactions (month_id, day, description, concept_id, inflow, outflow, line_no)
     VALUES (1, 2, 'Gasto', (SELECT id FROM concepts WHERE name = 'Gastos'), 0, ?, 2)`,
  );
  insertExpense.run(options.expenseTotal);

  if (options.movementOutflow > 0) {
    // Un traspaso entre cuentas tiene entrada y salida por el mismo importe:
    // mueve los fondos de una cuenta a otra sin ser ingreso ni gasto.
    db.prepare(
      `INSERT INTO transactions (month_id, day, description, concept_id, inflow, outflow, line_no)
       VALUES (1, 3, 'Traspaso interno', ?, ?, ?, 3)`,
    ).run(transferId.id, options.movementOutflow, options.movementOutflow);
  }
}

describe('cuadre S-30 / S-26', () => {
  it('marca el mes como cuadrado cuando todo coincide', async () => {
    await seed({
      incomeTotal: 700,
      movementIncome: 700,
      opening: 1000,
      closing: 1600,
      movementOutflow: 100,
      expenseTotal: 100,
    });

    const { buildReconciliation } = await import('@/lib/db/reconciliation');
    const rows = buildReconciliation();

    expect(rows).toHaveLength(1);
    expect(rows[0].balanced).toBe(true);
    expect(rows[0].incomeDifference).toBe(0);
    expect(rows[0].expenseDifference).toBe(0);
    expect(rows[0].balanceDifference).toBe(0);
  });

  it('detecta la diferencia cuando los ingresos no cuadran', async () => {
    await seed({
      incomeTotal: 700,
      movementIncome: 650,
      opening: 1000,
      closing: 1600,
      movementOutflow: 100,
      expenseTotal: 100,
    });

    const { buildReconciliation } = await import('@/lib/db/reconciliation');
    const rows = buildReconciliation();

    expect(rows[0].balanced).toBe(false);
    expect(rows[0].incomeDifference).toBe(50);
  });

  it('tolera una diferencia de un centimo', async () => {
    await seed({
      incomeTotal: 700,
      movementIncome: 700.01,
      opening: 1000,
      closing: 1600,
      movementOutflow: 100,
      expenseTotal: 100,
    });

    const { buildReconciliation } = await import('@/lib/db/reconciliation');
    const rows = buildReconciliation();

    // La diferencia de 0,01 € esta dentro de la tolerancia.
    expect(rows[0].balanced).toBe(true);
  });

  it('detecta la diferencia cuando el saldo final no cuadra', async () => {
    await seed({
      incomeTotal: 700,
      movementIncome: 700,
      opening: 1000,
      closing: 1700,
      movementOutflow: 100,
      expenseTotal: 100,
    });

    const { buildReconciliation } = await import('@/lib/db/reconciliation');
    const rows = buildReconciliation();

    expect(rows[0].balanced).toBe(false);
    expect(rows[0].balanceDifference).toBe(100);
    expect(rows[0].calculatedBalance).toBe(1600);
  });

  it('no cuenta los traspasos entre cuentas como ingreso ni como gasto', async () => {
    await seed({
      incomeTotal: 700,
      movementIncome: 700,
      opening: 1000,
      closing: 1600,
      movementOutflow: 200,
      expenseTotal: 100,
    });

    const { buildReconciliation } = await import('@/lib/db/reconciliation');
    const rows = buildReconciliation();

    // El traspaso de 200 € mueve los fondos pero no es un gasto: el saldo
    // se calcula con todos los movimientos, los ingresos y gastos no.
    expect(rows[0].movementExpense).toBe(100);
    expect(rows[0].expenseDifference).toBe(0);
    expect(rows[0].calculatedBalance).toBe(1600);
    expect(rows[0].balanced).toBe(true);
  });
});
