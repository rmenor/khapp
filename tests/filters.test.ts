import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let tempDir: string;
let previousDbPath: string | undefined;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'filtros-test-'));
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

async function seed() {
  const { getDb } = await import('@/lib/db/client');
  const { normalizeSearch } = await import('@/lib/finance/normalize/search');
  const db = getDb();

  db.prepare(
    `INSERT INTO months (year, month, congregation, opening_balance, closing_balance,
                         income_total, expense_total, imported_at)
     VALUES (2026, 9, 'Prado', 1000, 1600, 700, 100, '2026-09-30T00:00:00.000Z')`,
  ).run();

  const insert = db.prepare(
    `INSERT INTO transactions (month_id, day, description, ct_code, inflow, outflow, line_no, search_text)
     VALUES (1, ?, ?, ?, ?, 0, ?, ?)`,
  );

  const rows: [number, string, string | null, number][] = [
    [28, 'Donación electrónica', 'T', 267],
    [30, 'Para la sucursal', null, 295],
    [3, 'Congregación', 'C', 150],
  ];

  for (const [day, description, ctCode, amount] of rows) {
    insert.run(day, description, ctCode, amount, day, normalizeSearch(description));
  }
}

describe('filtros de movimientos', () => {
  it('filtra por texto libre con o sin tildes', async () => {
    await seed();
    const { listMovements, parseFilters } = await import('@/lib/db/queries/transactions');

    const conTilde = listMovements(parseFilters({ q: 'electrónica' }));
    const sinTilde = listMovements(parseFilters({ q: 'electronica' }));
    const enMayusculas = listMovements(parseFilters({ q: 'ELECTRONICA' }));

    expect(conTilde).toHaveLength(1);
    expect(sinTilde).toHaveLength(1);
    expect(enMayusculas).toHaveLength(1);
    expect(conTilde[0].description).toBe('Donación electrónica');
  });

  it('filtra por año y mes', async () => {
    await seed();
    const { listMovements, parseFilters } = await import('@/lib/db/queries/transactions');

    expect(listMovements(parseFilters({ year: '2026', mes: '9' }))).toHaveLength(3);
    expect(listMovements(parseFilters({ year: '2025' }))).toHaveLength(0);
  });

  it('filtra por trimestre', async () => {
    await seed();
    const { listMovements, parseFilters } = await import('@/lib/db/queries/transactions');

    // Septiembre está en el tercer trimestre.
    expect(listMovements(parseFilters({ trimestre: '3' }))).toHaveLength(3);
    expect(listMovements(parseFilters({ trimestre: '1' }))).toHaveLength(0);
  });

  it('filtra por rango de importe', async () => {
    await seed();
    const { listMovements, parseFilters } = await import('@/lib/db/queries/transactions');

    expect(listMovements(parseFilters({ min: '200' }))).toHaveLength(2);
    expect(listMovements(parseFilters({ max: '200' }))).toHaveLength(1);
    expect(listMovements(parseFilters({ min: '100', max: '200' }))).toHaveLength(1);
  });

  it('combina varios filtros a la vez', async () => {
    await seed();
    const { listMovements, parseFilters } = await import('@/lib/db/queries/transactions');

    const filters = parseFilters({ year: '2026', mes: '9', q: 'sucursal', min: '100' });
    expect(listMovements(filters)).toHaveLength(1);
  });

  it('recalcula los totales con el filtro aplicado', async () => {
    await seed();
    const { movementTotals, parseFilters } = await import('@/lib/db/queries/transactions');

    const todos = movementTotals(parseFilters({}));
    expect(todos.count).toBe(3);
    expect(todos.income).toBe(712);
    expect(todos.expense).toBe(0);

    const filtrados = movementTotals(parseFilters({ q: 'electrónica' }));
    expect(filtrados.count).toBe(1);
    expect(filtrados.income).toBe(267);
  });
});
