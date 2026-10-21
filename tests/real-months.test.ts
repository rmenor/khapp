import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EXPECTED_TOTALS } from './fixtures/expected-totals.ts';

const REAL_FIXTURES = join(process.cwd(), 'tests', 'fixtures', 'real');

let tempDir: string;
let previousDbPath: string | undefined;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'meses-reales-'));
  previousDbPath = process.env.CONTABILIDAD_DB_PATH;
  process.env.CONTABILIDAD_DB_PATH = join(tempDir, 'contabilidad.db');

  const globalForDb = globalThis as unknown as { __contabilidadDb?: unknown };
  globalForDb.__contabilidadDb = undefined;
});

afterEach(() => {
  if (previousDbPath === undefined) {
    delete process.env.CONTABILIDAD_DB_PATH;
  } else {
    process.env.CONTABILIDAD_DB_PATH = previousDbPath;
  }
  rmSync(tempDir, { recursive: true, force: true });
});

/** Busca los PDF de un mes real en `tests/fixtures/real/<año>-<mes>/`. */
function realFilesFor(monthKey: string): string[] {
  const directory = join(REAL_FIXTURES, monthKey);
  if (!existsSync(directory)) return [];

  return readdirSync(directory)
    .filter((name) => name.toLowerCase().endsWith('.pdf'))
    .map((name) => join(directory, name));
}

const availableMonths = Object.keys(EXPECTED_TOTALS).filter(
  (monthKey) => realFilesFor(monthKey).length > 0,
);

describe('informes reales del vault', () => {
  if (availableMonths.length === 0) {
    it.skip(
      'queda pendiente copiar los PDF reales en tests/fixtures/real/<año>-<mes>/ ' +
        'y rellenar sus totales en tests/fixtures/expected-totals.ts',
      () => {
        // Sin los ficheros reales no hay nada que comprobar.
      },
    );
    return;
  }

  for (const monthKey of availableMonths) {
    it(`importa ${monthKey} sin errores y con los totales esperados`, async () => {
      const { readFile } = await import('node:fs/promises');
      const { buildPreview, applyPreview } = await import('@/lib/finance/importer');
      const { getDb } = await import('@/lib/db/client');
      const { buildReconciliation } = await import('@/lib/db/reconciliation');

      const files = await Promise.all(
        realFilesFor(monthKey).map(async (path) => ({
          name: path.split('/').pop() ?? path,
          bytes: new Uint8Array(await readFile(path)),
        })),
      );

      const preview = await buildPreview(files);

      // Ningún fichero debe fallar y no debe haber avisos de error.
      expect(preview.failedFiles).toBe(0);
      expect(preview.warnings.filter((w) => w.level === 'error')).toHaveLength(0);

      const result = applyPreview(preview);
      expect(result.success).toBe(true);

      const expected = EXPECTED_TOTALS[monthKey];
      const db = getDb();
      const month = db
        .prepare('SELECT * FROM months WHERE year = ? AND month = ?')
        .get(Number(monthKey.slice(0, 4)), Number(monthKey.slice(5, 7))) as
        | {
            opening_balance: number;
            closing_balance: number;
            income_total: number;
            expense_total: number;
          }
        | undefined;

      expect(month).toBeDefined();
      expect(month!.opening_balance).toBeCloseTo(expected.opening, 2);
      expect(month!.closing_balance).toBeCloseTo(expected.closing, 2);
      expect(month!.income_total).toBeCloseTo(expected.income, 2);
      expect(month!.expense_total).toBeCloseTo(expected.expense, 2);

      const rows = db
        .prepare('SELECT COUNT(*) AS total FROM transactions')
        .get() as { total: number };
      expect(rows.total).toBe(expected.rows);

      // El saldo final del S-30 debe coincidir con el calculado a partir del
      // S-26 y del saldo inicial, con tolerancia de 0,01 €.
      const reconciliation = buildReconciliation();
      expect(reconciliation).toHaveLength(1);
      expect(reconciliation[0].balanceDifference).toBeCloseTo(0, 2);
      expect(reconciliation[0].balanced).toBe(true);
    });
  }
});
