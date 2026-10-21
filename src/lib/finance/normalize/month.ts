export const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

export interface YearMonth {
  year: number;
  month: number;
}

function stripAccents(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Detecta el mes y el año en una cabecera del tipo "septiembre de 2026".
 * La cabecera del PDF es la fuente de verdad; el nombre del fichero solo se
 * usa para avisar cuando no coinciden.
 */
export function parseYearMonth(text: string): YearMonth | null {
  if (!text) return null;

  const normalized = stripAccents(text);
  const monthNames = MONTH_NAMES.map(stripAccents);

  for (let index = 0; index < monthNames.length; index++) {
    const name = monthNames[index];
    if (!normalized.includes(name)) continue;

    // Se busca un año de 4 cifras en un rango razonable alrededor del nombre.
    const nameIndex = normalized.indexOf(name);
    const window = normalized.slice(Math.max(0, nameIndex - 40), nameIndex + name.length + 40);
    const yearMatch = window.match(/\b(19|20)\d{2}\b/);
    if (!yearMatch) continue;

    return { year: Number(yearMatch[0]), month: index + 1 };
  }

  return null;
}

/**
 * Extrae el mes y el año del nombre de un fichero, por ejemplo
 * "25-05-Mayo" o "S-26-septiembre2026.pdf". Solo se usa para contrastar con
 * la cabecera del PDF y avisar de discrepancias.
 */
export function parseYearMonthFromFilename(filename: string): YearMonth | null {
  if (!filename) return null;

  const withoutExtension = filename.replace(/\.[^.]+$/, '');
  const normalized = stripAccents(withoutExtension).replace(/[^a-z0-9]+/g, ' ');

  for (let index = 0; index < MONTH_NAMES.length; index++) {
    const name = MONTH_NAMES[index];
    if (!normalized.includes(name)) continue;

    const digits = normalized.match(/\d+/g);
    if (!digits) continue;

    // Un año de 4 cifras tiene prioridad; si no, se busca un número de 2 cifras.
    const fourDigit = digits.find((value) => value.length === 4 && Number(value) >= 1900);
    if (fourDigit) {
      return { year: Number(fourDigit), month: index + 1 };
    }

    const twoDigit = digits.find((value) => value.length === 2);
    if (twoDigit) {
      const value = Number(twoDigit);
      const year = value > 50 ? 1900 + value : 2000 + value;
      return { year, month: index + 1 };
    }
  }

  // Nombre del tipo "25-05-Mayo" o "08-2026" sin el nombre del mes.
  const pairs = withoutExtension.match(/(\d{1,4})[-_ ](\d{1,4})/);
  if (pairs) {
    const first = Number(pairs[1]);
    const second = Number(pairs[2]);

    // Orden "año-mes" (25-05).
    if (pairs[1].length <= 2 && pairs[2].length <= 2) {
      const year = first > 50 ? 1900 + first : 2000 + first;
      if (second >= 1 && second <= 12) return { year, month: second };
    }

    // Orden "mes-año" (08-2026).
    if (pairs[1].length <= 2 && pairs[2].length === 4) {
      if (first >= 1 && first <= 12) return { year: second, month: first };
    }
  }

  return null;
}

export function monthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? '';
}

export function quarterOf(month: number): number {
  return Math.floor((month - 1) / 3) + 1;
}

export function formatYearMonth({ year, month }: YearMonth): string {
  return `${monthName(month)} de ${year}`;
}
