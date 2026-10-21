'use server';

import { z } from 'zod';
import { verifySessionOrThrow } from '@/lib/actions';
import { getDb } from '@/lib/db/client';
import { listConcepts } from '@/lib/db/queries/concepts';

/**
 * Copia de seguridad de la contabilidad (SQLite local).
 *
 * Se exportan las tablas de contabilidad en JSON. No hay datos personales de
 * donantes: solo descripciones e importes de los informes.
 */
export interface FinanceBackup {
  version: 1;
  exportedAt: string;
  months: unknown[];
  transactions: unknown[];
  transactionEntries: unknown[];
  summaryLines: unknown[];
  concepts: unknown[];
  conceptRules: unknown[];
  resolutions: unknown[];
}

export async function exportFinanceAction(): Promise<FinanceBackup> {
  await verifySessionOrThrow();

  const db = getDb();

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    months: db.prepare('SELECT * FROM months ORDER BY year, month').all(),
    transactions: db
      .prepare('SELECT * FROM transactions ORDER BY month_id, line_no, id')
      .all(),
    transactionEntries: db.prepare('SELECT * FROM transaction_entries').all(),
    summaryLines: db.prepare('SELECT * FROM summary_lines').all(),
    concepts: listConcepts(),
    conceptRules: db.prepare('SELECT * FROM concept_rules').all(),
    resolutions: db.prepare('SELECT * FROM resolutions').all(),
  };
}

const RestoreFinanceSchema = z.object({
  months: z.array(z.unknown()),
  transactions: z.array(z.unknown()),
  transactionEntries: z.array(z.unknown()),
  summaryLines: z.array(z.unknown()),
  concepts: z.array(z.unknown()),
  conceptRules: z.array(z.unknown()),
  resolutions: z.array(z.unknown()),
});

/**
 * Restaura una copia de seguridad de la contabilidad.
 *
 * La restauración **reemplaza** el contenido actual de las tablas de
 * contabilidad: es una restauración completa, no una fusión.
 */
export async function restoreFinanceAction(data: unknown): Promise<{
  success: boolean;
  message: string;
}> {
  await verifySessionOrThrow();

  const parsed = RestoreFinanceSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, message: 'El archivo de copia no tiene un formato válido.' };
  }

  try {
    const db = getDb();

    db.exec('BEGIN');
    try {
      db.exec('DELETE FROM transaction_entries');
      db.exec('DELETE FROM transactions');
      db.exec('DELETE FROM summary_lines');
      db.exec('DELETE FROM months');
      db.exec('DELETE FROM concept_rules');
      db.exec('DELETE FROM concepts');
      db.exec('DELETE FROM resolutions');

      for (const month of parsed.data.months) {
        db.prepare(
          `INSERT INTO months
             (id, year, month, congregation, opening_balance, closing_balance,
              income_total, expense_total, source_hash, imported_at, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          (month as { id: number }).id,
          (month as { year: number }).year,
          (month as { month: number }).month,
          (month as { congregation: string | null }).congregation,
          (month as { opening_balance: number }).opening_balance,
          (month as { closing_balance: number }).closing_balance,
          (month as { income_total: number }).income_total,
          (month as { expense_total: number }).expense_total,
          (month as { source_hash: string | null }).source_hash,
          (month as { imported_at: string }).imported_at,
          (month as { notes: string | null }).notes,
        );
      }

      for (const concept of parsed.data.concepts) {
        db.prepare('INSERT INTO concepts (id, name, kind, category, ct_code) VALUES (?, ?, ?, ?, ?)').run(
          (concept as { id: number }).id,
          (concept as { name: string }).name,
          (concept as { kind: string }).kind,
          (concept as { category: string | null }).category,
          (concept as { ct_code: string | null }).ct_code ?? null,
        );
      }

      for (const rule of parsed.data.conceptRules) {
        db.prepare(
          'INSERT INTO concept_rules (id, pattern, concept_id, priority) VALUES (?, ?, ?, ?)',
        ).run(
          (rule as { id: number }).id,
          (rule as { pattern: string }).pattern,
          (rule as { concept_id: number }).concept_id,
          (rule as { priority: number }).priority,
        );
      }

      for (const transaction of parsed.data.transactions) {
        db.prepare(
          `INSERT INTO transactions
             (id, month_id, day, description, ct_code, concept_id, account_from,
              account_to, inflow, outflow, raw_text, line_no)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          (transaction as { id: number }).id,
          (transaction as { month_id: number }).month_id,
          (transaction as { day: number | null }).day,
          (transaction as { description: string }).description,
          (transaction as { ct_code: string | null }).ct_code,
          (transaction as { concept_id: number | null }).concept_id,
          (transaction as { account_from: string | null }).account_from,
          (transaction as { account_to: string | null }).account_to,
          (transaction as { inflow: number }).inflow,
          (transaction as { outflow: number }).outflow,
          (transaction as { raw_text: string | null }).raw_text,
          (transaction as { line_no: number | null }).line_no,
          (transaction as { search_text: string | null }).search_text ?? null,
        );
      }

      for (const entry of parsed.data.transactionEntries) {
        db.prepare(
          'INSERT INTO transaction_entries (id, transaction_id, account, direction, amount) VALUES (?, ?, ?, ?, ?)',
        ).run(
          (entry as { id: number }).id,
          (entry as { transaction_id: number }).transaction_id,
          (entry as { account: string }).account,
          (entry as { direction: string }).direction,
          (entry as { amount: number }).amount,
        );
      }

      for (const line of parsed.data.summaryLines) {
        db.prepare(
          'INSERT INTO summary_lines (id, month_id, section, label, amount, level) VALUES (?, ?, ?, ?, ?, ?)',
        ).run(
          (line as { id: number }).id,
          (line as { month_id: number }).month_id,
          (line as { section: string }).section,
          (line as { label: string }).label,
          (line as { amount: number }).amount,
          (line as { level: number }).level,
        );
      }

      for (const resolution of parsed.data.resolutions) {
        db.prepare(
          'INSERT INTO resolutions (id, description, amount, start_date, is_active) VALUES (?, ?, ?, ?, ?)',
        ).run(
          (resolution as { id: number }).id,
          (resolution as { description: string }).description,
          (resolution as { amount: number }).amount,
          (resolution as { start_date: string }).start_date,
          (resolution as { is_active: number }).is_active,
        );
      }

      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }

    return {
      success: true,
      message: `Se han restaurado ${parsed.data.months.length} mes(es) y ${parsed.data.transactions.length} movimiento(s).`,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'No se ha podido restaurar la copia de seguridad.',
    };
  }
}
