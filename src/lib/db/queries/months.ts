import { getDb, nowIso, plainRow, plainRows } from '@/lib/db/client';
import type { Month } from '@/lib/finance/types';

export function listMonths(): Month[] {
  const db = getDb();
  return plainRows<Month>(
    db.prepare('SELECT * FROM months ORDER BY year DESC, month DESC').all(),
  );
}

export function getMonth(year: number, month: number): Month | undefined {
  const db = getDb();
  return plainRow<Month>(
    db.prepare('SELECT * FROM months WHERE year = ? AND month = ?').get(year, month),
  );
}

export function getMonthById(id: number): Month | undefined {
  const db = getDb();
  return plainRow<Month>(db.prepare('SELECT * FROM months WHERE id = ?').get(id));
}

/**
 * Elimina un mes y todo lo que cuelga de él (movimientos, líneas de resumen e
 * importes asociados). Las claves foráneas hacen el cascado.
 */
export function deleteMonth(id: number): void {
  const db = getDb();
  db.prepare('DELETE FROM months WHERE id = ?').run(id);
}

export function insertMonth(input: {
  year: number;
  month: number;
  congregation: string | null;
  opening_balance: number;
  closing_balance: number;
  income_total: number;
  expense_total: number;
  source_hash: string | null;
  notes?: string | null;
}): number {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO months
         (year, month, congregation, opening_balance, closing_balance,
          income_total, expense_total, source_hash, imported_at, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.year,
      input.month,
      input.congregation,
      input.opening_balance,
      input.closing_balance,
      input.income_total,
      input.expense_total,
      input.source_hash,
      nowIso(),
      input.notes ?? null,
    );

  return Number(result.lastInsertRowid);
}

/** Número de movimientos de un mes. */
export function countMonthMovements(monthId: number): number {
  const db = getDb();
  const row = db
    .prepare('SELECT COUNT(*) AS total FROM transactions WHERE month_id = ?')
    .get(monthId) as unknown as { total: number };
  return row.total;
}

/** Cifras de los meses, para el gráfico de evolución. */
export interface MonthTotals {
  id: number;
  year: number;
  month: number;
  opening_balance: number;
  closing_balance: number;
  income_total: number;
  expense_total: number;
  /** Suma real de los movimientos del mes (por si el S-30 no estaba). */
  movement_income: number;
  movement_expense: number;
}

export function listMonthTotals(): MonthTotals[] {
  const db = getDb();
  return plainRows<MonthTotals>(
    db.prepare(
      `SELECT
         m.id, m.year, m.month, m.opening_balance, m.closing_balance,
         m.income_total, m.expense_total,
         COALESCE((SELECT SUM(t.inflow) FROM transactions t WHERE t.month_id = m.id), 0) AS movement_income,
         COALESCE((SELECT SUM(t.outflow) FROM transactions t WHERE t.month_id = m.id), 0) AS movement_expense
       FROM months m
       ORDER BY m.year, m.month`,
    ).all(),
  );
}
