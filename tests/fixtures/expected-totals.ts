/**
 * Totales esperados de los informes reales.
 *
 * Cuando se disponga de los PDF del vault, se copian en
 * `tests/fixtures/real/<año>-<mes>/` y se rellenan aquí los totales que
 * deben coincidir con lo que dice el S-30.
 *
 * Formato de cada entrada:
 *   "2025-05": { "opening": 0, "closing": 0, "income": 0, "expense": 0, "rows": 0 }
 */
export interface ExpectedMonth {
  /** "Fondos al comienzo del mes" (S-30). */
  opening: number;
  /** "Fondos al final del mes" (S-30). */
  closing: number;
  /** "Total de ingresos" (S-30). */
  income: number;
  /** Total de desembolsos (S-30). */
  expense: number;
  /** Número de movimientos del S-26. */
  rows: number;
}

export const EXPECTED_TOTALS: Record<string, ExpectedMonth> = {
  // '2025-05': { opening: 0, closing: 0, income: 0, expense: 0, rows: 0 },
  // '2026-01': { opening: 0, closing: 0, income: 0, expense: 0, rows: 0 },
  // '2026-09': { opening: 3376.55, closing: 0, income: 787, expense: 0, rows: 0 },
};
