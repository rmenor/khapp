/**
 * Normalización de importes. Los informes usan coma decimal y sin símbolo de
 * moneda (EUR): "220,00", "1.234,56", "220".
 *
 * Si el texto no es un importe, se devuelve null: nunca se inventa una cifra.
 */
export function parseAmount(raw: string): number | null {
  if (typeof raw !== 'string') return null;

  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  // Solo dígitos, espacios, separadores y un signo inicial.
  if (!/^[-+]?[\d.,\s]*$/.test(trimmed)) return null;
  if (!/\d/.test(trimmed)) return null;

  let cleaned = trimmed.replace(/\s/g, '');

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');

  if (lastComma === -1 && lastDot === -1) {
    return Number(cleaned);
  }

  if (lastComma > lastDot) {
    // Formato español: punto = millares, coma = decimal.
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // Formato anglosajón: coma = millares, punto = decimal.
    cleaned = cleaned.replace(/,/g, '');
  }

  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;

  // Redondeo a céntimos para evitar ruido de coma flotante.
  return Math.round(value * 100) / 100;
}

/** Formatea un importe al estilo de los informes: coma decimal, sin símbolo. */
export function formatAmount(value: number): string {
  return value.toFixed(2).replace('.', ',');
}
