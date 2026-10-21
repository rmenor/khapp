import { createHash } from 'node:crypto';
import { getDb, nowIso } from '@/lib/db/client';
import { resolveConcept } from '@/lib/db/queries/concepts';
import { getMonth, insertMonth } from '@/lib/db/queries/months';
import { extractWords } from './pdf/extract';
import { buildLines } from './pdf/layout';
import { detectDocType, parseCongregation } from './parser/detect';
import { parseS26 } from './parser/s26';
import { parseS30 } from './parser/s30';
import { parseYearMonth, parseYearMonthFromFilename } from './normalize/month';
import { normalizeSearch } from './normalize/search';
import type { ParsedSummary, ParsedTransaction, ParseWarning } from './types';

export interface InputFile {
  name: string;
  bytes: Uint8Array;
}

export interface PreviewTransaction {
  day: number | null;
  description: string;
  ctCode: string | null;
  entries: { account: string; direction: 'entrada' | 'salida'; amount: number }[];
  inflow: number;
  outflow: number;
  isTransfer: boolean;
  accountFrom: string | null;
  accountTo: string | null;
  rawText: string;
  lineNo: number;
  /** Concepto asignado por código CT o por las reglas de texto. */
  conceptId: number | null;
  conceptName: string | null;
}

export interface PreviewMonth {
  year: number;
  month: number;
  congregation: string | null;
  openingBalance: number;
  closingBalance: number;
  incomeTotal: number;
  expenseTotal: number;
  transactions: PreviewTransaction[];
  summaryLines: { section: string; label: string; amount: number; level: number }[];
  /** Hash del documento S-26 (el libro de movimientos). */
  sourceHash: string | null;
  warnings: ParseWarning[];
}

export interface PreviewFile {
  name: string;
  hash: string;
  docType: 'S-26' | 'S-30' | 'unknown';
  reason: string;
  year: number | null;
  month: number | null;
  /** El mes deducido del nombre del fichero, para contrastar con la cabecera. */
  filenameYear: number | null;
  filenameMonth: number | null;
  status: 'ok' | 'ignored' | 'error';
  message?: string;
}

export interface ImportPreview {
  token: string;
  files: PreviewFile[];
  months: PreviewMonth[];
  warnings: ParseWarning[];
  /** El mes ya existe en la base de datos y se puede reemplazar. */
  existingMonths: { year: number; month: number; id: number }[];
  /** El hash ya está en el registro de importaciones. */
  duplicateHashes: string[];
  /** Catálogo de conceptos disponibles, para los selectores de la vista previa. */
  conceptsById: Record<number, string>;
  totalFiles: number;
  ignoredFiles: number;
  failedFiles: number;
}

function hashBytes(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * Analiza los ficheros subidos y devuelve una vista previa.
 *
 * No escribe nada: ni en disco (los bytes solo viven en memoria mientras dura
 * la petición) ni en la base de datos.
 */
export async function buildPreview(files: InputFile[]): Promise<ImportPreview> {
  const previewFiles: PreviewFile[] = [];
  const parsedS26: { file: PreviewFile; transactions: ParsedTransaction[]; congregation: string | null }[] = [];
  const parsedS30: { file: PreviewFile; summary: ParsedSummary }[] = [];
  const warnings: ParseWarning[] = [];

  for (const file of files) {
    const hash = hashBytes(file.bytes);
    const filenamePeriod = parseYearMonthFromFilename(file.name);

    const base: PreviewFile = {
      name: file.name,
      hash,
      docType: 'unknown',
      reason: '',
      year: null,
      month: null,
      filenameYear: filenamePeriod?.year ?? null,
      filenameMonth: filenamePeriod?.month ?? null,
      status: 'ok',
    };

    let extracted;
    try {
      extracted = await extractWords(file.bytes);
    } catch (error) {
      previewFiles.push({
        ...base,
        status: 'error',
        reason: 'No se ha podido leer el PDF',
        message: error instanceof Error ? error.message : 'Error desconocido',
      });
      continue;
    }

    if (extracted.looksLikeScan) {
      previewFiles.push({
        ...base,
        status: 'error',
        reason: 'Parece un escaneo, no puedo leerlo',
        message:
          'Parece un escaneo, no puedo leerlo: el PDF no tiene capa de texto (es una imagen). No se han extraído cifras.',
      });
      continue;
    }

    const lines = buildLines(extracted.pages);
    const fullText = lines.map((line) => line.text).join('\n');
    const detected = detectDocType(fullText);

    if (detected.type === 'unknown') {
      previewFiles.push({
        ...base,
        reason: detected.reason,
        status: 'ignored',
      });
      continue;
    }

    const period = parseYearMonth(fullText);
    const congregation = parseCongregation(fullText);

    const previewFile: PreviewFile = {
      ...base,
      docType: detected.type,
      reason: detected.reason,
      year: period?.year ?? null,
      month: period?.month ?? null,
    };

    // Aviso si el mes de la cabecera no coincide con el del nombre del fichero.
    if (period && filenamePeriod) {
      if (period.year !== filenamePeriod.year || period.month !== filenamePeriod.month) {
        warnings.push({
          level: 'warning',
          message: `En "${file.name}" el PDF dice ${period.month}/${period.year} pero el nombre del fichero indica ${filenamePeriod.month}/${filenamePeriod.year}. Manda el PDF.`,
        });
      }
    }

    if (detected.type === 'S-26') {
      const result = parseS26(lines);
      warnings.push(...result.warnings);
      parsedS26.push({
        file: previewFile,
        transactions: result.transactions,
        congregation: congregation ?? null,
      });
      previewFiles.push(previewFile);
    } else {
      const result = parseS30(lines);
      warnings.push(...result.warnings);
      parsedS30.push({ file: previewFile, summary: result.summary });
      previewFiles.push(previewFile);
    }
  }

  // Se agrupa por mes detectado en la cabecera (fuente de verdad).
  const months = new Map<string, PreviewMonth>();

  for (const { file, transactions, congregation } of parsedS26) {
    if (file.year === null || file.month === null) {
      warnings.push({
        level: 'error',
        message: `En "${file.name}" no se ha podido detectar el mes en la cabecera: no se importa.`,
      });
      continue;
    }

    const key = `${file.year}-${file.month}`;
    const month = ensureMonth(months, key, file.year, file.month, congregation);

    if (month.sourceHash) {
      warnings.push({
        level: 'warning',
        message: `Se han subido dos S-26 para ${file.month}/${file.year}: solo se conserva el último.`,
      });
    }
    month.sourceHash = file.hash;

    for (const transaction of transactions) {
      const conceptId = resolveConcept(transaction.ctCode, transaction.description);
      month.transactions.push(toPreviewTransaction(transaction, conceptId));
    }
  }

  for (const { file, summary } of parsedS30) {
    if (file.year === null || file.month === null) {
      warnings.push({
        level: 'error',
        message: `En "${file.name}" no se ha podido detectar el mes en la cabecera: no se importa.`,
      });
      continue;
    }

    const key = `${file.year}-${file.month}`;
    const month = ensureMonth(months, key, file.year, file.month, null);

    month.openingBalance = summary.openingBalance ?? month.openingBalance;
    month.closingBalance = summary.closingBalance ?? month.closingBalance;
    month.incomeTotal = summary.incomeTotal ?? month.incomeTotal;
    month.expenseTotal = summary.expenseTotal ?? month.expenseTotal;

    month.summaryLines = summary.lines.map((line) => ({
      section: line.section,
      label: line.label,
      amount: line.amount ?? 0,
      level: line.level,
    }));
  }

  // Avisos de coherencia entre el S-26 y el S-30.
  for (const month of months.values()) {
    if (month.transactions.length === 0) continue;

    const hasSummary = month.summaryLines.length > 0;
    if (!hasSummary) {
      warnings.push({
        level: 'warning',
        message: `Falta el S-30 de ${month.month}/${month.year}: los totales del resumen no se podrán contrastar.`,
      });
    }
  }

  const db = getDb();
  const existingMonths: { year: number; month: number; id: number }[] = [];
  for (const month of months.values()) {
    const existing = getMonth(month.year, month.month);
    if (existing) {
      existingMonths.push({ year: month.year, month: month.month, id: existing.id });
    }
  }

  const hashes = previewFiles.map((file) => file.hash);
  const placeholders = hashes.map(() => '?').join(', ');
  const knownHashes = hashes.length
    ? (db
        .prepare(`SELECT source_hash FROM imports WHERE source_hash IN (${placeholders})`)
        .all(...hashes) as { source_hash: string }[]).map((row) => row.source_hash)
    : [];

  const concepts = db.prepare('SELECT id, name FROM concepts').all() as {
    id: number;
    name: string;
  }[];
  const conceptsById: Record<number, string> = {};
  for (const concept of concepts) conceptsById[concept.id] = concept.name;

  return {
    token: hashBytes(new TextEncoder().encode(JSON.stringify({ hashes, at: Date.now() }))),
    files: previewFiles,
    months: [...months.values()],
    warnings,
    existingMonths,
    duplicateHashes: knownHashes,
    conceptsById,
    totalFiles: files.length,
    ignoredFiles: previewFiles.filter((file) => file.status === 'ignored').length,
    failedFiles: previewFiles.filter((file) => file.status === 'error').length,
  };
}

function ensureMonth(
  months: Map<string, PreviewMonth>,
  key: string,
  year: number,
  month: number,
  congregation: string | null,
): PreviewMonth {
  const existing = months.get(key);
  if (existing) {
    if (congregation && !existing.congregation) existing.congregation = congregation;
    return existing;
  }

  const created: PreviewMonth = {
    year,
    month,
    congregation,
    openingBalance: 0,
    closingBalance: 0,
    incomeTotal: 0,
    expenseTotal: 0,
    transactions: [],
    summaryLines: [],
    sourceHash: null,
    warnings: [],
  };

  months.set(key, created);
  return created;
}

function toPreviewTransaction(
  transaction: ParsedTransaction,
  conceptId: number | null,
): PreviewTransaction {
  const db = getDb();
  const concept = conceptId
    ? (db.prepare('SELECT name FROM concepts WHERE id = ?').get(conceptId) as
        | { name: string }
        | undefined)
    : undefined;

  return {
    day: transaction.day,
    description: transaction.description,
    ctCode: transaction.ctCode,
    entries: transaction.entries,
    inflow: transaction.inflow,
    outflow: transaction.outflow,
    isTransfer: transaction.isTransfer,
    accountFrom: transaction.accountFrom,
    accountTo: transaction.accountTo,
    rawText: transaction.rawText,
    lineNo: transaction.lineNo,
    conceptId,
    conceptName: concept?.name ?? null,
  };
}

export interface ApplyResult {
  success: boolean;
  message: string;
  importedMonths: { year: number; month: number; id: number }[];
  importedRows: number;
}

/**
 * Escribe en la base de datos los meses de la vista previa.
 *
 * Todo ocurre dentro de una transacción de SQLite: si algo falla, no queda
 * nada a medias.
 */
export function applyPreview(
  preview: ImportPreview,
  options?: { replace?: boolean },
): ApplyResult {
  const db = getDb();
  const replace = options?.replace ?? false;

  const importedMonths: { year: number; month: number; id: number }[] = [];
  let importedRows = 0;

  db.exec('BEGIN');
  try {
    for (const month of preview.months) {
      const existing = getMonth(month.year, month.month);

      if (existing && !replace) {
        throw new Error(
          `El mes ${month.month}/${month.year} ya está importado. Elige "reemplazar" para sobrescribirlo.`,
        );
      }

      if (existing) {
        db.prepare('DELETE FROM months WHERE id = ?').run(existing.id);
      }

      const monthId = insertMonth({
        year: month.year,
        month: month.month,
        congregation: month.congregation,
        opening_balance: month.openingBalance,
        closing_balance: month.closingBalance,
        income_total: month.incomeTotal,
        expense_total: month.expenseTotal,
        source_hash: month.sourceHash,
      });

      const insertTransaction = db.prepare(
        `INSERT INTO transactions
           (month_id, day, description, ct_code, concept_id, account_from, account_to,
            inflow, outflow, raw_text, line_no, search_text)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );

      const insertEntry = db.prepare(
        `INSERT INTO transaction_entries (transaction_id, account, direction, amount)
         VALUES (?, ?, ?, ?)`,
      );

      for (const transaction of month.transactions) {
        const result = insertTransaction.run(
          monthId,
          transaction.day,
          transaction.description,
          transaction.ctCode,
          transaction.conceptId,
          transaction.accountFrom,
          transaction.accountTo,
          transaction.inflow,
          transaction.outflow,
          transaction.rawText,
          transaction.lineNo,
          normalizeSearch(transaction.description),
        );

        const transactionId = Number(result.lastInsertRowid);
        for (const entry of transaction.entries) {
          insertEntry.run(transactionId, entry.account, entry.direction, entry.amount);
        }
        importedRows += 1;
      }

      const insertSummary = db.prepare(
        'INSERT INTO summary_lines (month_id, section, label, amount, level) VALUES (?, ?, ?, ?, ?)',
      );
      for (const line of month.summaryLines) {
        insertSummary.run(monthId, line.section, line.label, line.amount, line.level);
      }

      importedMonths.push({ year: month.year, month: month.month, id: monthId });
    }

    // Registro de importaciones: solo hash, nombre, fecha, filas y avisos.
    // Nunca el PDF.
    const insertImport = db.prepare(
      `INSERT INTO imports (source_hash, filename, imported_at, rows, warnings, month_id, doc_type, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(source_hash) DO UPDATE SET
         filename = excluded.filename,
         imported_at = excluded.imported_at,
         rows = excluded.rows,
         warnings = excluded.warnings,
         month_id = excluded.month_id,
         doc_type = excluded.doc_type,
         status = excluded.status`,
    );

    const warningText = preview.warnings.map((warning) => warning.message).join(' | ');

    for (const file of preview.files) {
      if (file.status === 'ignored') continue;

      const monthId =
        file.year !== null && file.month !== null
          ? (importedMonths.find(
              (item) => item.year === file.year && item.month === file.month,
            )?.id ?? null)
          : null;

      const month = preview.months.find(
        (item) => item.year === file.year && item.month === file.month,
      );

      // Nº de filas extraídas del fichero: movimientos del S-26 o líneas de
      // resumen del S-30.
      const rows =
        file.docType === 'S-26'
          ? (month?.transactions.length ?? 0)
          : file.docType === 'S-30'
            ? (month?.summaryLines.length ?? 0)
            : 0;

      insertImport.run(
        file.hash,
        file.name,
        nowIso(),
        rows,
        file.status === 'error' ? (file.message ?? file.reason) : warningText,
        monthId,
        file.docType,
        file.status === 'error' ? 'error' : 'ok',
      );
    }

    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al guardar la importación',
      importedMonths: [],
      importedRows: 0,
    };
  }

  return {
    success: true,
    message: `Se han importado ${importedMonths.length} mes(es) y ${importedRows} movimientos.`,
    importedMonths,
    importedRows,
  };
}
