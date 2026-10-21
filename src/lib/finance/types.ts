/**
 * Tipos del dominio de contabilidad (SQLite local).
 *
 * Sustituyen a los tipos de transacciones/resoluciones que vivían en
 * Firestore. Aquí todo el dinero es un número con signo implícito por la
 * dirección (inflow / outflow) y nunca se almacena negativo.
 */

import type { Account, Direction } from './pdf/columns';

/** Un importe de un movimiento, con su cuenta y su sentido. */
export interface ParsedEntry {
  account: Account;
  direction: Direction;
  amount: number;
}

export interface ParsedTransaction {
  day: number | null;
  description: string;
  ctCode: string | null;
  entries: ParsedEntry[];
  /** Suma de las entradas. */
  inflow: number;
  /** Suma de las salidas. */
  outflow: number;
  /** Cuenta de origen (cuando hay salida) y de destino (cuando hay entrada). */
  accountFrom: Account | null;
  accountTo: Account | null;
  /** Movimiento interno entre cuentas: no computa como ingreso ni como gasto. */
  isTransfer: boolean;
  rawText: string;
  lineNo: number;
}

export type ParsedSummarySection = 'opening' | 'income' | 'expense' | 'closing' | 'other';

export interface ParsedSummaryLine {
  section: ParsedSummarySection;
  label: string;
  amount: number | null;
  /** Nivel de sangría (0 = primer nivel). */
  level: number;
  /** Posición horizontal de la etiqueta, para calcular el nivel. */
  indentX?: number;
  isTotal: boolean;
  rawText: string;
}

export interface ParsedSummary {
  openingBalance: number | null;
  closingBalance: number | null;
  incomeTotal: number | null;
  expenseTotal: number | null;
  lines: ParsedSummaryLine[];
}

export interface ParseWarning {
  level: 'info' | 'warning' | 'error';
  message: string;
  lineNo?: number;
}

export type ConceptKind = 'income' | 'expense' | 'transfer';

export type ConceptCategory =
  | 'congregation'
  | 'worldwide_work'
  | 'renovation'
  | 'branch'
  | 'other';

export type AccountKind = 'caja' | 'banco';

export type SummarySection = 'opening' | 'income' | 'expense' | 'closing' | 'other';

export interface Month {
  id: number;
  year: number;
  month: number;
  congregation: string | null;
  opening_balance: number;
  closing_balance: number;
  income_total: number;
  expense_total: number;
  source_hash: string | null;
  imported_at: string;
  notes: string | null;
}

export interface Concept {
  id: number;
  name: string;
  kind: ConceptKind;
  category: string | null;
  /** Código CT del S-26 que asigna este concepto (C, G, D, OM, T). */
  ct_code: string | null;
}

export interface ConceptRule {
  id: number;
  pattern: string;
  concept_id: number;
  priority: number;
}

export interface Transaction {
  id: number;
  month_id: number;
  day: number | null;
  description: string;
  ct_code: string | null;
  concept_id: number | null;
  account_from: string | null;
  account_to: string | null;
  inflow: number;
  outflow: number;
  raw_text: string | null;
  line_no: number | null;
}

/** Un importe con su cuenta y su sentido: nunca se suman a ciegas. */
export interface TransactionEntry {
  id: number;
  transaction_id: number;
  account: string;
  direction: 'entrada' | 'salida';
  amount: number;
}

export interface SummaryLine {
  id: number;
  month_id: number;
  section: SummarySection;
  label: string;
  amount: number;
  level: number;
}

export interface ImportRecord {
  id: number;
  source_hash: string;
  filename: string;
  imported_at: string;
  rows: number;
  warnings: string | null;
  month_id: number | null;
  doc_type: string | null;
  status: 'ok' | 'error';
}

export interface Resolution {
  id: number;
  description: string;
  amount: number;
  start_date: string;
  is_active: boolean;
}

/** Movimiento con los datos de su mes y de su concepto, listo para la tabla. */
export interface MovementRow extends Transaction {
  year: number;
  month: number;
  congregation: string | null;
  concept_name: string | null;
  concept_kind: ConceptKind | null;
  concept_category: string | null;
}
