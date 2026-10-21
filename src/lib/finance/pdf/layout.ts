import type { PageText, Word } from './extract';

/** Una celda: fragmento de texto con su extensión horizontal. */
export interface Cell {
  x0: number;
  x1: number;
  text: string;
}

export interface Line {
  y: number;
  /** Palabras individuales, en orden de lectura. */
  words: Word[];
  /** Celdas: palabras agrupadas por proximidad horizontal. */
  cells: Cell[];
  /** Texto de la línea, celdas unidas por espacios. */
  text: string;
  pageNumber: number;
}

/**
 * Tolerancia vertical (en puntos) para considerar que dos palabras están en la
 * misma línea. Las fuentes de estos informes tienen un cuerpo de ~9-10 pt.
 */
const LINE_TOLERANCE = 3;

/**
 * Hueco horizontal mínimo (en puntos) para considerar que dos palabras
 * pertenecen a celdas distintas. Por debajo de este valor se pegan.
 */
const CELL_GAP = 4;

function groupIntoLines(words: Word[], pageNumber: number): Line[] {
  if (words.length === 0) return [];

  const sorted = [...words].sort((a, b) => b.y - a.y || a.x - b.x);

  const buckets: Word[][] = [];
  let current: Word[] = [];

  for (const word of sorted) {
    const reference = current[0];
    if (reference && Math.abs(reference.y - word.y) > LINE_TOLERANCE) {
      buckets.push(current);
      current = [word];
    } else {
      current.push(word);
    }
  }
  if (current.length > 0) buckets.push(current);

  return buckets.map((bucket) => {
    const cells = groupIntoCells(bucket);
    return {
      y: bucket[0].y,
      words: bucket,
      cells,
      text: cells.map((cell) => cell.text).join(' ').trim(),
      pageNumber,
    };
  });
}

function groupIntoCells(words: Word[]): Cell[] {
  const sorted = [...words].sort((a, b) => a.x - b.x);
  const cells: Cell[] = [];

  for (const word of sorted) {
    const last = cells[cells.length - 1];
    const gap = last ? word.x - last.x1 : 0;

    if (last && gap <= CELL_GAP) {
      last.x1 = Math.max(last.x1, word.x + word.width);
      last.text = `${last.text} ${word.str}`.trim();
    } else {
      cells.push({ x0: word.x, x1: word.x + word.width, text: word.str });
    }
  }

  return cells;
}

/** Reconstruye las líneas de todas las páginas en orden de lectura. */
export function buildLines(pages: PageText[]): Line[] {
  return pages.flatMap((page) => groupIntoLines(page.words, page.pageNumber));
}
