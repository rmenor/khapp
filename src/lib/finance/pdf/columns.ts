import type { Cell, Line } from './layout';

export type Direction = 'entrada' | 'salida';
export type Account = 'caja' | 'banco';

export interface ColumnDef {
  /** Índice de la columna de importes (0..n) dentro de la fila. */
  index: number;
  label: string;
  direction: Direction;
  account: Account;
  x0: number;
  x1: number;
  xCenter: number;
}

export interface Band {
  x0: number;
  x1: number;
  xCenter: number;
}

export interface HeaderMap {
  /** Índice de la línea donde está la cabecera de la tabla. */
  headerLineIndex: number;
  columns: ColumnDef[];
  dateColumn?: Band;
  descriptionColumn?: Band;
  ctColumn?: Band;
  /** Verdadero si el origen asignó la cuenta por pares y no por cabecera de grupo. */
  accountFromPairConvention: boolean;
}

const ENTRADA_LABELS = ['ENTRADA', 'ENTRADAS'];
const SALIDA_LABELS = ['SALIDA', 'SALIDAS'];
const CAJA_LABELS = ['CAJA', 'EFECTIVO'];
const BANCO_LABELS = ['BANCO', 'CUENTA BANCARIA', 'BANCOS'];

function normalize(text: string): string {
  return text
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isDirectionLabel(text: string): Direction | null {
  const normalized = normalize(text);
  if (ENTRADA_LABELS.some((label) => normalized === label)) return 'entrada';
  if (SALIDA_LABELS.some((label) => normalized === label)) return 'salida';
  return null;
}

/**
 * Localiza la cabecera de la tabla de movimientos: la línea que contiene las
 * etiquetas ENTRADA/SALIDA. Se detectan a nivel de palabra (y no de celda)
 * porque en la cabecera real "ENTRADA" y "SALIDA" van muy juntos y una celda
 * podría fundir ambos rótulos.
 */
export function findHeader(lines: Line[]): HeaderMap | null {
  let headerLineIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const hasAmountLabels = lines[i].words.some((word) => isDirectionLabel(word.str) !== null);
    if (!hasAmountLabels) continue;
    headerLineIndex = i;
    break;
  }

  if (headerLineIndex === -1) return null;

  const headerLine = lines[headerLineIndex];

  const amountWords = headerLine.words
    .filter((word) => isDirectionLabel(word.str) !== null)
    .sort((a, b) => a.x - b.x);

  if (amountWords.length === 0) return null;

  // Cabecera de grupo (CAJA / BANCO): puede estar en la línea anterior.
  const groupLine = findGroupLine(lines, headerLineIndex);
  const accountByPosition = groupLine ? buildAccountMap(groupLine, amountWords) : null;

  const columns: ColumnDef[] = amountWords.map((word, index) => {
    const direction = isDirectionLabel(word.str) as Direction;
    const grouped = accountByPosition?.get(index);

    let account: Account;
    if (grouped) {
      account = grouped;
    } else {
      // Convención por defecto: el primer par entrada/salida es caja y el
      // segundo banco. La vista previa deja constancia de que se aplicó.
      account = index < 2 ? 'caja' : 'banco';
    }

    return {
      index,
      label: normalize(word.str),
      direction,
      account,
      x0: word.x,
      x1: word.x + word.width,
      xCenter: word.x + word.width / 2,
    };
  });

  const findWord = (predicate: (text: string) => boolean) =>
    headerLine.words.find((word) => predicate(normalize(word.str)));

  const dateWord = findWord((text) => text.startsWith('FECHA'));
  const descriptionWord = findWord((text) => text.startsWith('DESCRIPCI'));
  const ctWord = findWord((text) => text === 'CT' || text.startsWith('CT '));

  return {
    headerLineIndex,
    columns,
    dateColumn: dateWord ? bandOf(dateWord.x, dateWord.width) : undefined,
    descriptionColumn: descriptionWord ? bandOf(descriptionWord.x, descriptionWord.width) : undefined,
    ctColumn: ctWord ? bandOf(ctWord.x, ctWord.width) : undefined,
    accountFromPairConvention: columns.some((column, index) => {
      const expected: Account = index < 2 ? 'caja' : 'banco';
      return column.account === expected && !accountByPosition?.get(index);
    }),
  };
}

function bandOf(x: number, width: number): Band {
  return { x0: x, x1: x + width, xCenter: x + width / 2 };
}

/**
 * Busca una línea de cabecera de grupo (CAJA / BANCO) por encima de la línea
 * de la tabla, dentro de una ventana razonable.
 */
function findGroupLine(lines: Line[], headerLineIndex: number): Line | null {
  const start = Math.max(0, headerLineIndex - 3);

  for (let i = headerLineIndex - 1; i >= start; i--) {
    const line = lines[i];
    const hasGroup = line.words.some(
      (word) =>
        CAJA_LABELS.includes(normalize(word.str)) || BANCO_LABELS.includes(normalize(word.str)),
    );
    if (hasGroup) return line;
  }

  return null;
}

/**
 * Asigna cada columna de importes a la cuenta (caja/banco) según la posición
 * horizontal de la cabecera de grupo.
 */
function buildAccountMap(
  groupLine: Line,
  amountWords: { x: number; width: number }[],
): Map<number, Account> | null {
  const map = new Map<number, Account>();
  const groupWords = groupLine.words.filter(
    (word) =>
      CAJA_LABELS.includes(normalize(word.str)) || BANCO_LABELS.includes(normalize(word.str)),
  );

  if (groupWords.length === 0) return null;

  for (const groupWord of groupWords) {
    const account: Account = CAJA_LABELS.includes(normalize(groupWord.str)) ? 'caja' : 'banco';
    const groupCenter = groupWord.x + groupWord.width / 2;

    amountWords.forEach((amountWord, index) => {
      const center = amountWord.x + amountWord.width / 2;
      const current = map.get(index);
      if (current === undefined) {
        map.set(index, account);
        return;
      }

      // Ya tenía cuenta: gana el grupo cuyo centro está más cerca.
      const currentWord = groupWords.find((word) =>
        (CAJA_LABELS.includes(normalize(word.str)) ? 'caja' : 'banco') === current,
      );
      if (!currentWord) return;
      const currentCenter = currentWord.x + currentWord.width / 2;
      if (Math.abs(center - groupCenter) < Math.abs(center - currentCenter)) {
        map.set(index, account);
      }
    });
  }

  return map;
}

/**
 * Asigna una celda con importe a la columna de la cabecera que mejor encaja
 * por posición horizontal. Un importe se asigna a la columna cuyo centro está
 * más cerca, siempre que no caiga claramente fuera del rango de la tabla.
 */
export function assignToColumn(
  cell: Cell,
  columns: ColumnDef[],
): { column: ColumnDef; distance: number } | null {
  const center = (cell.x0 + cell.x1) / 2;
  let best: { column: ColumnDef; distance: number } | null = null;

  for (const column of columns) {
    const distance = Math.abs(center - column.xCenter);
    if (!best || distance < best.distance) {
      best = { column, distance };
    }
  }

  if (!best) return null;

  // Si el importe cae fuera del rango de la tabla, no se inventa la cuenta.
  const tableLeft = Math.min(...columns.map((column) => column.x0));
  const tableRight = Math.max(...columns.map((column) => column.x1));
  const margin = Math.max(30, (tableRight - tableLeft) * 0.15);
  if (center < tableLeft - margin || center > tableRight + margin) return null;

  return best;
}
