import type { SQLInputValue } from 'node:sqlite';
import { getDb, plainRows } from '@/lib/db/client';
import { quarterOf } from '@/lib/finance/normalize/month';
import { listMonthTotals } from './months';

export interface MonthlyAggregate {
  key: string;
  year: number;
  month: number;
  income: number;
  expense: number;
  balance: number;
  closingBalance: number;
}

export interface PeriodAggregate {
  key: string;
  label: string;
  income: number;
  expense: number;
  balance: number;
  count: number;
}

export interface ConceptShare {
  conceptId: number | null;
  conceptName: string;
  kind: string;
  total: number;
  share: number;
}

/** Agregado por mes, ordenado cronológicamente. */
export function monthlyAggregates(): MonthlyAggregate[] {
  const months = listMonthTotals();

  return months.map((month) => ({
    key: `${month.year}-${month.month}`,
    year: month.year,
    month: month.month,
    income: month.income_total,
    expense: month.expense_total,
    balance: round(month.income_total - month.expense_total),
    closingBalance: month.closing_balance,
  }));
}

/** Agregado por trimestre. */
export function quarterlyAggregates(): PeriodAggregate[] {
  const months = listMonthTotals();
  const buckets = new Map<string, PeriodAggregate>();

  for (const month of months) {
    const quarter = quarterOf(month.month);
    const key = `${month.year}-Q${quarter}`;

    const bucket =
      buckets.get(key) ??
      {
        key,
        label: `${quarter}.er trimestre ${month.year}`,
        income: 0,
        expense: 0,
        balance: 0,
        count: 0,
      };

    bucket.income = round(bucket.income + month.income_total);
    bucket.expense = round(bucket.expense + month.expense_total);
    bucket.balance = round(bucket.income - bucket.expense);
    bucket.count += 1;

    buckets.set(key, bucket);
  }

  return [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key));
}

/** Agregado por año. */
export function yearlyAggregates(): PeriodAggregate[] {
  const months = listMonthTotals();
  const buckets = new Map<string, PeriodAggregate>();

  for (const month of months) {
    const key = String(month.year);
    const bucket =
      buckets.get(key) ??
      {
        key,
        label: String(month.year),
        income: 0,
        expense: 0,
        balance: 0,
        count: 0,
      };

    bucket.income = round(bucket.income + month.income_total);
    bucket.expense = round(bucket.expense + month.expense_total);
    bucket.balance = round(bucket.income - bucket.expense);
    bucket.count += 1;

    buckets.set(key, bucket);
  }

  return [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Comparación con el mismo mes del año anterior.
 */
export interface YearOverYearRow {
  key: string;
  year: number;
  month: number;
  income: number;
  expense: number;
  previousIncome: number;
  previousExpense: number;
  incomeDifference: number;
  expenseDifference: number;
}

export function yearOverYear(): YearOverYearRow[] {
  const months = listMonthTotals();
  const byKey = new Map(months.map((month) => [`${month.year}-${month.month}`, month]));

  return months
    .map((month) => {
      const previous = byKey.get(`${month.year - 1}-${month.month}`);
      const previousIncome = previous?.income_total ?? 0;
      const previousExpense = previous?.expense_total ?? 0;

      return {
        key: `${month.year}-${month.month}`,
        year: month.year,
        month: month.month,
        income: month.income_total,
        expense: month.expense_total,
        previousIncome,
        previousExpense,
        incomeDifference: round(month.income_total - previousIncome),
        expenseDifference: round(month.expense_total - previousExpense),
      };
    })
    .sort((a, b) => a.key.localeCompare(b.key));
}

/** Media y mediana de los ingresos y gastos mensuales. */
export function monthlyAverages(): {
  averageIncome: number;
  medianIncome: number;
  averageExpense: number;
  medianExpense: number;
  count: number;
} {
  const months = listMonthTotals();
  const incomes = months.map((month) => month.income_total).sort((a, b) => a - b);
  const expenses = months.map((month) => month.expense_total).sort((a, b) => a - b);

  return {
    averageIncome: round(average(incomes)),
    medianIncome: round(median(incomes)),
    averageExpense: round(average(expenses)),
    medianExpense: round(median(expenses)),
    count: months.length,
  };
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const middle = Math.floor(values.length / 2);
  return values.length % 2 === 0
    ? (values[middle - 1] + values[middle]) / 2
    : values[middle];
}

/**
 * Reparto por concepto. Los movimientos sin clasificar se agrupan aparte
 * ("Sin clasificar") para que la suma cuadre con el total.
 */
export function conceptShares(
  kind: 'income' | 'expense',
  year?: number,
): ConceptShare[] {
  const db = getDb();

  const params: SQLInputValue[] = [kind];
  let yearClause = '';
  if (year !== undefined) {
    yearClause = 'AND m.year = ?';
    params.push(year);
  }

  const rows = plainRows<{
    concept_id: number | null;
    concept_name: string;
    kind: string;
    total: number;
  }>(
    db
      .prepare(
        `SELECT
           c.id AS concept_id,
           COALESCE(c.name, 'Sin clasificar') AS concept_name,
           COALESCE(c.kind, 'income') AS kind,
           COALESCE(SUM(t.inflow), 0) AS total
         FROM transactions t
         JOIN months m ON m.id = t.month_id
         LEFT JOIN concepts c ON c.id = t.concept_id
         WHERE c.kind = ? ${yearClause}
         GROUP BY c.id, c.name, c.kind
         HAVING total > 0
         ORDER BY total DESC`,
      )
      .all(...params),
  );

  const total = rows.reduce((sum, row) => sum + row.total, 0);

  return rows.map((row) => ({
    conceptId: row.concept_id,
    conceptName: row.concept_name,
    kind: row.kind,
    total: round(row.total),
    share: total > 0 ? round((row.total / total) * 100) : 0,
  }));
}

/** Evolución del saldo de cierre mes a mes. */
export function balanceEvolution(): { key: string; label: string; balance: number }[] {
  const months = listMonthTotals();
  return months.map((month) => ({
    key: `${month.year}-${month.month}`,
    label: `${month.year}-${String(month.month).padStart(2, '0')}`,
    balance: month.closing_balance,
  }));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
