import { assignToColumn, findHeader, type Account, type Band, type HeaderMap } from '../pdf/columns';
import type { Line } from '../pdf/layout';
import { parseAmount } from '../normalize/amount';
import type { ParsedEntry, ParsedTransaction, ParseWarning } from '../types';

const CT_CODES = new Set(['C', 'G', 'D', 'OM', 'T']);

export interface S26ParseResult {
  transactions: ParsedTransaction[];
  warnings: ParseWarning[];
  header: HeaderMap | null;
}

/**
 * Parser de la "Hoja de cuentas (S-26)".
 *
 * Cada línea es un movimiento: fecha, descripción, código CT e importes.
 * Los importes se asignan a su columna por posición horizontal, de modo que una
 * fila con dos importes (entrada en una cuenta y salida en otra) conserva
 * ambos separados.
 */
export function parseS26(lines: Line[]): S26ParseResult {
  const warnings: ParseWarning[] = [];
  const header = findHeader(lines);

  if (!header) {
    warnings.push({
      level: 'error',
      message:
        'No se ha encontrado la cabecera de la tabla (FECHA / DESCRIPCIÓN / CT / ENTRADA / SALIDA) en el S-26',
    });
    return { transactions: [], warnings, header: null };
  }

  const transactions: ParsedTransaction[] = [];

  for (let i = header.headerLineIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.words.length === 0) continue;

    const row = parseRow(line, header, i);
    if (!row) continue;

    if (row.entries.length === 0) {
      warnings.push({
        level: 'warning',
        message: `Línea ${i + 1} sin importes: "${line.text}"`,
        lineNo: i + 1,
      });
      continue;
    }

    transactions.push(row);
  }

  return { transactions, warnings, header };
}

function parseRow(
  line: Line,
  header: HeaderMap,
  lineIndex: number,
): ParsedTransaction | null {
  const descriptionWords: string[] = [];
  let day: number | null = null;
  let ctCode: string | null = null;
  const entries: ParsedEntry[] = [];

  for (const cell of line.cells) {
    const center = (cell.x0 + cell.x1) / 2;

    // La fecha: número suelto en la banda de la columna FECHA.
    if (day === null && inBand(center, header.dateColumn) && header.dateColumn) {
      const parsed = parseDay(cell.text);
      if (parsed !== null) {
        day = parsed;
        continue;
      }
    }

    // El código CT: en su banda, o en cualquier punto si la cabecera no la define.
    if (ctCode === null) {
      const inCtBand = !header.ctColumn || inBand(center, header.ctColumn);
      if (inCtBand) {
        const parsed = parseCtCode(cell.text);
        if (parsed) {
          ctCode = parsed;
          continue;
        }
      }
    }

    // Los importes: se asignan por posición a su columna de la cabecera.
    const amount = parseAmount(cell.text);
    if (amount !== null) {
      const assignment = assignToColumn(cell, header.columns);
      if (assignment) {
        entries.push({
          account: assignment.column.account,
          direction: assignment.column.direction,
          amount,
        });
        continue;
      }
      // Importe que no encaja en ninguna columna: se descarta (no se inventa).
      continue;
    }

    // El resto de texto es la descripción.
    if (inDescription(center, header)) {
      descriptionWords.push(cell.text);
    }
  }

  if (day === null) return null;

  const description = descriptionWords.join(' ').replace(/\s+/g, ' ').trim();
  if (description.length === 0 && entries.length === 0) return null;

  const inflow = round(
    entries.filter((e) => e.direction === 'entrada').reduce((s, e) => s + e.amount, 0),
  );
  const outflow = round(
    entries.filter((e) => e.direction === 'salida').reduce((s, e) => s + e.amount, 0),
  );

  const entradaAccounts = new Set(
    entries.filter((e) => e.direction === 'entrada').map((e) => e.account),
  );
  const salidaAccounts = new Set(
    entries.filter((e) => e.direction === 'salida').map((e) => e.account),
  );

  const hasBothDirections = entradaAccounts.size > 0 && salidaAccounts.size > 0;
  const distinctAccounts = new Set([...entradaAccounts, ...salidaAccounts]).size > 1;

  // Un movimiento con entrada y salida en cuentas distintas es un traspaso
  // interno (caja -> banco): mueve fondos pero no es ingreso ni gasto.
  const isTransfer = hasBothDirections && distinctAccounts;

  return {
    day,
    description,
    ctCode,
    entries,
    inflow,
    outflow,
    accountFrom: firstOf(salidaAccounts),
    accountTo: firstOf(entradaAccounts),
    isTransfer,
    rawText: line.text,
    lineNo: lineIndex + 1,
  };
}

function firstOf(set: Set<Account>): Account | null {
  const first = set.values().next();
  return first.done ? null : first.value;
}

function inBand(center: number, band?: Band): boolean {
  if (!band) return false;
  const margin = Math.max(10, (band.x1 - band.x0) * 0.6);
  return center >= band.x0 - margin && center <= band.x1 + margin;
}

/**
 * La descripción es el texto que queda a la izquierda de la columna CT (o a la
 * derecha de la fecha si no hay columna CT definida).
 */
function inDescription(center: number, header: HeaderMap): boolean {
  if (header.ctColumn) {
    const margin = Math.max(10, (header.ctColumn.x1 - header.ctColumn.x0) * 0.6);
    return center < header.ctColumn.x0 - margin;
  }
  return true;
}

function parseDay(text?: string): number | null {
  if (!text) return null;
  const match = text.trim().match(/^(\d{1,2})/);
  if (!match) return null;
  const day = Number(match[1]);
  return day >= 1 && day <= 31 ? day : null;
}

function parseCtCode(text?: string): string | null {
  if (!text) return null;
  const match = text.trim().toUpperCase().match(/^([A-Z]{1,2})$/);
  if (!match) return null;
  return CT_CODES.has(match[1]) ? match[1] : null;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
