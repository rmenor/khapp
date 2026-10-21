export type DocType = 'S-26' | 'S-30' | 'unknown';

export interface DetectedDoc {
  type: DocType;
  /** Motivo por el que se ha clasificado (o por el que se ignora). */
  reason: string;
  /** Nombre de la congregación tal y como aparece en la cabecera. */
  congregation?: string;
}

const S26_MARKERS = ['HOJA DE CUENTAS', 'S-26'];
const S30_MARKERS = ['INFORME MENSUAL DE LAS CUENTAS', 'S-30'];

/**
 * Clasifica el documento por su contenido, nunca por el nombre del fichero.
 * Los ficheros que no son S-26 ni S-30 (Estado de cuentas, Acuse de recibo,
 * TO-62…) se ignoran sin romper la importación.
 */
export function detectDocType(text: string): DetectedDoc {
  const normalized = text
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ');

  const isS26 = S26_MARKERS.some((marker) => normalized.includes(marker));
  const isS30 = S30_MARKERS.some((marker) => normalized.includes(marker));

  if (isS26 && !isS30) {
    return { type: 'S-26', reason: 'Cabecera "HOJA DE CUENTAS (S-26)" detectada' };
  }
  if (isS30 && !isS26) {
    return { type: 'S-30', reason: 'Cabecera "INFORME MENSUAL DE LAS CUENTAS (S-30)" detectada' };
  }
  if (isS26 && isS30) {
    return {
      type: 'unknown',
      reason: 'El documento contiene cabeceras de S-26 y S-30: no se puede clasificar',
    };
  }

  return {
    type: 'unknown',
    reason: 'El documento no es un S-26 ni un S-30: se ignora',
  };
}

/**
 * Extrae la congregación de la cabecera, con el formato "Gandía - Prado (23051)".
 */
export function parseCongregation(text: string): string | undefined {
  const match = text.match(/([A-ZÁÉÍÓÚÑ][^\n]*?)\s*\(\s*(\d{4,6})\s*\)/);
  if (!match) return undefined;

  const name = match[1]
    .split('\n')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .pop();

  if (!name) return undefined;

  return `${name} (${match[2]})`;
}
