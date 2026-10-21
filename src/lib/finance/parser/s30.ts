import type { Cell, Line } from '../pdf/layout';
import { parseAmount } from '../normalize/amount';
import type { ParsedSummary, ParsedSummaryLine, ParseWarning, SummarySection } from '../types';

const INCOME_HEADERS = ['INGRESOS'];
const EXPENSE_HEADERS = ['DESEMBOLSOS', 'GASTOS DE LA CONGREGACIÓN'];
const OPENING_LABEL = 'FONDOS AL COMIENZO DEL MES';
const CLOSING_LABEL = 'FONDOS AL FINAL DEL MES';

export interface S30ParseResult {
  summary: ParsedSummary;
  warnings: ParseWarning[];
}

/**
 * Parser del "Informe mensual de las cuentas de la congregación (S-30)".
 *
 * El resumen tiene tres partes: fondos al comienzo, ingresos por concepto,
 * desembolsos por concepto y fondos al final. El nivel de cada línea se
 * obtiene de su sangría horizontal, no del orden textual.
 */
export function parseS30(lines: Line[]): S30ParseResult {
  const warnings: ParseWarning[] = [];
  const parsedLines: ParsedSummaryLine[] = [];

  let currentSection: SummarySection = 'other';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.cells.length === 0) continue;

    const text = normalize(line.text);
    if (text.length === 0) continue;

    const labelCell = findLabelCell(line.cells);
    const amountCell = findAmountCell(line.cells);
    const label = labelCell ? normalize(labelCell.text) : '';
    // Se conserva el texto original de la etiqueta (con sus acentos y su
    // capitalización): lo que se muestra en la app es lo que dice el PDF.
    const originalLabel = labelCell ? labelCell.text.replace(/\s+/g, ' ').trim() : '';
    const amount = amountCell ? parseAmount(amountCell.text) : null;
    const indentX = labelCell?.x0 ?? 0;

    // Cabecera de sección.
    if (isSectionHeader(label)) {
      currentSection = INCOME_HEADERS.some((header) => label.startsWith(header))
        ? 'income'
        : 'expense';
      parsedLines.push({
        section: currentSection,
        label: originalLabel,
        amount,
        level: 0,
        indentX,
        isTotal: false,
        rawText: line.text,
      });
      continue;
    }

    if (label.startsWith(OPENING_LABEL)) {
      currentSection = 'opening';
      parsedLines.push({
        section: 'opening',
        label: originalLabel,
        amount,
        level: 0,
        indentX,
        isTotal: false,
        rawText: line.text,
      });
      continue;
    }

    if (label.startsWith(CLOSING_LABEL)) {
      currentSection = 'closing';
      parsedLines.push({
        section: 'closing',
        label: originalLabel,
        amount,
        level: 0,
        indentX,
        isTotal: false,
        rawText: line.text,
      });
      continue;
    }

    if (currentSection !== 'income' && currentSection !== 'expense') {
      // Línea fuera de las secciones de ingresos/desembolsos: se conserva
      // como "other" por si aporta información, pero no afecta a los totales.
      if (amount !== null && label.length > 0) {
        parsedLines.push({
          section: 'other',
          label: originalLabel,
          amount,
          level: 0,
          indentX,
          isTotal: false,
          rawText: line.text,
        });
      }
      continue;
    }

    if (label.length === 0) continue;

    parsedLines.push({
      section: currentSection,
      label: originalLabel,
      amount,
      level: 0,
      indentX,
      isTotal: isTotalLabel(label),
      rawText: line.text,
    });
  }

  applyIndentationLevels(parsedLines);

  const openingBalance = findAmount(parsedLines, 'opening', OPENING_LABEL);
  const closingBalance = findAmount(parsedLines, 'closing', CLOSING_LABEL);
  const incomeTotal = findTotal(parsedLines, 'income', /total de ingresos/i);
  const expenseTotal =
    findTotal(parsedLines, 'expense', /total de (desembolsos|gastos)/i) ??
    sumExpenseLines(parsedLines);

  if (openingBalance === null) {
    warnings.push({
      level: 'warning',
      message: 'No se ha encontrado "Fondos al comienzo del mes" en el S-30',
    });
  }
  if (closingBalance === null) {
    warnings.push({
      level: 'warning',
      message: 'No se ha encontrado "Fondos al final del mes" en el S-30',
    });
  }
  if (incomeTotal === null) {
    warnings.push({
      level: 'warning',
      message: 'No se ha encontrado "Total de ingresos" en el S-30',
    });
  }
  if (expenseTotal === null) {
    warnings.push({
      level: 'warning',
      message: 'No se ha encontrado el total de desembolsos en el S-30',
    });
  }

  return {
    summary: {
      openingBalance,
      closingBalance,
      incomeTotal,
      expenseTotal,
      lines: parsedLines,
    },
    warnings,
  };
}

/**
 * Calcula el nivel de sangría de cada línea a partir de la posición x de su
 * etiqueta. Dentro de cada sección, la x mínima es el nivel 0.
 */
function applyIndentationLevels(lines: ParsedSummaryLine[]): void {
  for (const section of ['income', 'expense'] as const) {
    const sectionLines = lines.filter((line) => line.section === section);
    if (sectionLines.length === 0) continue;

    const positions = sectionLines.map((line) => line.indentX ?? 0);
    const unique = [...new Set(positions)].sort((a, b) => a - b);

    sectionLines.forEach((line, index) => {
      line.level = unique.indexOf(positions[index]);
    });
  }
}

/**
 * Suma de las líneas de desembolso que no son totales. Se usa solo cuando el
 * S-30 no incluye una línea de total explícita.
 */
function sumExpenseLines(lines: ParsedSummaryLine[]): number | null {
  const items = lines.filter(
    (line) => line.section === 'expense' && !line.isTotal && line.amount !== null,
  );
  if (items.length === 0) return null;

  const sum = items.reduce((total, line) => total + (line.amount ?? 0), 0);
  return Math.round(sum * 100) / 100;
}

function findAmount(
  lines: ParsedSummaryLine[],
  section: SummarySection,
  labelPrefix: string,
): number | null {
  const line = lines.find(
    (item) => item.section === section && normalize(item.label).startsWith(labelPrefix),
  );
  return line?.amount ?? null;
}

function findTotal(
  lines: ParsedSummaryLine[],
  section: SummarySection,
  pattern: RegExp,
): number | null {
  const line = lines.find(
    (item) => item.section === section && pattern.test(normalize(item.label)),
  );
  return line?.amount ?? null;
}

function isSectionHeader(label: string): boolean {
  if (label.length === 0) return false;
  return EXPENSE_HEADERS.some((header) => label.startsWith(header)) ||
    INCOME_HEADERS.some((header) => label.startsWith(header));
}

function isTotalLabel(label: string): boolean {
  return /^total\b/i.test(label);
}

function findLabelCell(cells: Cell[]): Cell | undefined {
  // La etiqueta es la primera celda que no es un importe.
  return cells.find((cell) => parseAmount(cell.text) === null);
}

function findAmountCell(cells: Cell[]): Cell | undefined {
  // El importe es la última celda que se puede interpretar como número.
  for (let i = cells.length - 1; i >= 0; i--) {
    if (parseAmount(cells[i].text) !== null) return cells[i];
  }
  return undefined;
}

function normalize(text: string): string {
  return text
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
