import { getDb, plainRows } from '@/lib/db/client';
import { listMonthTotals, type MonthTotals } from '@/lib/db/queries/months';

/** Tolerancia de cuadre en euros. */
export const TOLERANCE = 0.01;

export interface ReconciliationRow {
  monthId: number;
  year: number;
  month: number;
  openingBalance: number;
  closingBalance: number;

  /** Total de ingresos según el S-30. */
  summaryIncome: number;
  /** Total de ingresos según la suma de los movimientos del S-26. */
  movementIncome: number;
  incomeDifference: number;

  /** Total de desembolsos según el S-30. */
  summaryExpense: number;
  /** Total de desembolsos según la suma de los movimientos del S-26. */
  movementExpense: number;
  expenseDifference: number;

  /** Saldo calculado: inicial + entradas - salidas de todos los movimientos. */
  calculatedBalance: number;
  balanceDifference: number;

  /** El mes cuadra dentro de la tolerancia. */
  balanced: boolean;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calcula el cuadre entre el S-30 (resumen) y el S-26 (movimientos) de cada
 * mes importado.
 *
 * - Ingresos y gastos se comparan por concepto: solo cuentan los movimientos
 *   cuyo concepto es de tipo "income" o "expense". Los traspasos entre
 *   cuentas (caja -> banco) mueven fondos pero no son ni ingreso ni gasto.
 * - El saldo se calcula con el saldo inicial del S-30 y el total de
 *   movimientos, y se compara con el saldo final del S-30.
 */
export function buildReconciliation(): ReconciliationRow[] {
  const db = getDb();
  const months = listMonthTotals();

  const incomeByMonth = plainRows<{ month_id: number; total: number }>(
    db
      .prepare(
        `SELECT t.month_id AS month_id,
                COALESCE(SUM(t.inflow), 0) AS total
           FROM transactions t
           JOIN concepts c ON c.id = t.concept_id
          WHERE c.kind = 'income'
          GROUP BY t.month_id`,
      )
      .all(),
  );

  const expenseByMonth = plainRows<{ month_id: number; total: number }>(
    db
      .prepare(
        `SELECT t.month_id AS month_id,
                COALESCE(SUM(t.outflow), 0) AS total
           FROM transactions t
           JOIN concepts c ON c.id = t.concept_id
          WHERE c.kind = 'expense'
          GROUP BY t.month_id`,
      )
      .all(),
  );

  const incomeMap = new Map(incomeByMonth.map((row) => [row.month_id, row.total]));
  const expenseMap = new Map(expenseByMonth.map((row) => [row.month_id, row.total]));

  return months.map((month) => buildRow(month, incomeMap, expenseMap));
}

function buildRow(
  month: MonthTotals,
  incomeMap: Map<number, number>,
  expenseMap: Map<number, number>,
): ReconciliationRow {
  const movementIncome = round(incomeMap.get(month.id) ?? 0);
  const movementExpense = round(expenseMap.get(month.id) ?? 0);

  // El saldo se calcula con TODOS los movimientos (incluidos los traspasos
  // entre cuentas), porque estos sí mueven los fondos de la congregación.
  const calculatedBalance = round(
    month.opening_balance + month.movement_income - month.movement_expense,
  );

  const incomeDifference = round(month.income_total - movementIncome);
  const expenseDifference = round(month.expense_total - movementExpense);
  const balanceDifference = round(month.closing_balance - calculatedBalance);

  const balanced =
    Math.abs(incomeDifference) <= TOLERANCE &&
    Math.abs(expenseDifference) <= TOLERANCE &&
    Math.abs(balanceDifference) <= TOLERANCE;

  return {
    monthId: month.id,
    year: month.year,
    month: month.month,
    openingBalance: month.opening_balance,
    closingBalance: month.closing_balance,
    summaryIncome: month.income_total,
    movementIncome,
    incomeDifference,
    summaryExpense: month.expense_total,
    movementExpense,
    expenseDifference,
    calculatedBalance,
    balanceDifference,
    balanced,
  };
}

/**
 * Comprueba que el saldo final de cada mes encadena con el saldo inicial del
 * mes siguiente.
 */
export interface ChainCheck {
  year: number;
  month: number;
  closingBalance: number;
  nextOpeningBalance: number;
  difference: number;
  ok: boolean;
}

export function buildChainCheck(): ChainCheck[] {
  const months = listMonthTotals();
  const checks: ChainCheck[] = [];

  for (let i = 0; i < months.length - 1; i++) {
    const current = months[i];
    const next = months[i + 1];

    // Solo se comparan meses consecutivos.
    const consecutive =
      next.year === current.year && next.month === current.month + 1;
    if (!consecutive) continue;

    const difference = round(next.opening_balance - current.closing_balance);
    checks.push({
      year: current.year,
      month: current.month,
      closingBalance: current.closing_balance,
      nextOpeningBalance: next.opening_balance,
      difference,
      ok: Math.abs(difference) <= TOLERANCE,
    });
  }

  return checks;
}
