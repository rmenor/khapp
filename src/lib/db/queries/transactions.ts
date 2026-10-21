import type { SQLInputValue } from 'node:sqlite';
import { getDb, plainRows } from '@/lib/db/client';
import { quarterOf } from '@/lib/finance/normalize/month';
import { normalizeSearch } from '@/lib/finance/normalize/search';
import type { MovementRow } from '@/lib/finance/types';

/**
 * Filtros de la vista de movimientos. Todos son opcionales y combinables, y
 * se serializan en la URL para poder compartir la vista.
 */
export interface MovementFilters {
  year?: number;
  /** Meses concretos (1-12). */
  months?: number[];
  /** Trimestre (1-4). */
  quarter?: number;
  conceptId?: number;
  ctCode?: string;
  account?: string;
  /** Texto libre sobre la descripción. */
  search?: string;
  /** Rango de importe (en valor absoluto). */
  minAmount?: number;
  maxAmount?: number;
}

/**
 * Traduce los searchParams de la URL a filtros.
 */
export function parseFilters(
  params: Record<string, string | string[] | undefined>,
): MovementFilters {
  const get = (key: string): string | undefined => {
    const value = params[key];
    if (Array.isArray(value)) return value[0];
    return value ?? undefined;
  };

  const filters: MovementFilters = {};

  const year = get('year');
  if (year && !Number.isNaN(Number(year))) filters.year = Number(year);

  const months = get('mes');
  if (months) {
    const parsed = months
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => value >= 1 && value <= 12);
    if (parsed.length > 0) filters.months = parsed;
  }

  const quarter = get('trimestre');
  if (quarter && !Number.isNaN(Number(quarter))) filters.quarter = Number(quarter);

  const concept = get('concepto');
  if (concept && !Number.isNaN(Number(concept))) filters.conceptId = Number(concept);

  const ctCode = get('ct');
  if (ctCode) filters.ctCode = ctCode;

  const account = get('cuenta');
  if (account) filters.account = account;

  const search = get('q');
  if (search) filters.search = search;

  const min = get('min');
  if (min && !Number.isNaN(Number(min))) filters.minAmount = Number(min);

  const max = get('max');
  if (max && !Number.isNaN(Number(max))) filters.maxAmount = Number(max);

  return filters;
}

/**
 * Construye la cláusula WHERE y sus parámetros a partir de los filtros.
 */
function buildWhere(filters: MovementFilters): { sql: string; params: SQLInputValue[] } {
  const clauses: string[] = [];
  const params: SQLInputValue[] = [];

  if (filters.year !== undefined) {
    clauses.push('m.year = ?');
    params.push(filters.year);
  }

  if (filters.months && filters.months.length > 0) {
    const placeholders = filters.months.map(() => '?').join(', ');
    clauses.push(`m.month IN (${placeholders})`);
    params.push(...filters.months);
  }

  if (filters.quarter !== undefined) {
    // El trimestre se traduce a su rango de meses.
    const first = (filters.quarter - 1) * 3 + 1;
    const months = [first, first + 1, first + 2];
    clauses.push(`m.month IN (${months.map(() => '?').join(', ')})`);
    params.push(...months);
  }

  if (filters.conceptId !== undefined) {
    clauses.push('t.concept_id = ?');
    params.push(filters.conceptId);
  }

  if (filters.ctCode) {
    clauses.push('t.ct_code = ?');
    params.push(filters.ctCode);
  }

  if (filters.account) {
    // La cuenta aparece como origen o como destino del movimiento.
    clauses.push('(t.account_from = ? OR t.account_to = ?)');
    params.push(filters.account, filters.account);
  }

  if (filters.search) {
    // Se busca en la copia normalizada de la descripción para que el filtro
    // funcione tanto con tildes como sin ellas.
    clauses.push('t.search_text LIKE ?');
    params.push(`%${normalizeSearch(filters.search)}%`);
  }

  // El importe del movimiento es el de la parte con valor: una fila con
  // entrada 267 y salida 0 tiene un importe de 267, no de 0.
  const movementAmount = 'CASE WHEN t.inflow > 0 THEN t.inflow ELSE t.outflow END';

  if (filters.minAmount !== undefined) {
    clauses.push(`${movementAmount} >= ?`);
    params.push(filters.minAmount);
  }

  if (filters.maxAmount !== undefined) {
    clauses.push(`${movementAmount} <= ?`);
    params.push(filters.maxAmount);
  }

  return {
    sql: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

const MOVEMENT_SELECT = `
  SELECT
    t.id, t.month_id, t.day, t.description, t.ct_code, t.concept_id,
    t.account_from, t.account_to, t.inflow, t.outflow, t.raw_text, t.line_no,
    m.year, m.month, m.congregation,
    c.name AS concept_name, c.kind AS concept_kind, c.category AS concept_category
  FROM transactions t
  JOIN months m ON m.id = t.month_id
  LEFT JOIN concepts c ON c.id = t.concept_id
`;

/** Movimientos filtrados, ordenados por fecha. */
export function listMovements(filters: MovementFilters): MovementRow[] {
  const db = getDb();
  const { sql, params } = buildWhere(filters);

  return plainRows<MovementRow>(
    db
      .prepare(`${MOVEMENT_SELECT} ${sql} ORDER BY m.year, m.month, t.day, t.line_no, t.id`)
      .all(...params),
  );
}

/** Totales recalculados con el filtro aplicado. */
export function movementTotals(filters: MovementFilters): {
  income: number;
  expense: number;
  balance: number;
  count: number;
} {
  const movements = listMovements(filters);

  let income = 0;
  let expense = 0;

  for (const movement of movements) {
    income += movement.inflow;
    expense += movement.outflow;
  }

  return {
    income: round(income),
    expense: round(expense),
    balance: round(income - expense),
    count: movements.length,
  };
}

/** Años disponibles en la base de datos. */
export function listYears(): number[] {
  const db = getDb();
  const rows = plainRows<{ year: number }>(
    db.prepare('SELECT DISTINCT year FROM months ORDER BY year DESC').all(),
  );
  return rows.map((row) => row.year);
}

/** Meses disponibles, para poblar los selectores. */
export function listAvailableMonths(): { year: number; month: number }[] {
  const db = getDb();
  return plainRows<{ year: number; month: number }>(
    db.prepare('SELECT year, month FROM months ORDER BY year DESC, month DESC').all(),
  );
}

/** Códigos CT presentes en los movimientos. */
export function listCtCodes(): string[] {
  const db = getDb();
  const rows = plainRows<{ ct_code: string }>(
    db
      .prepare(
        "SELECT DISTINCT ct_code FROM transactions WHERE ct_code IS NOT NULL AND ct_code <> '' ORDER BY ct_code",
      )
      .all(),
  );
  return rows.map((row) => row.ct_code);
}

export function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export { quarterOf };
