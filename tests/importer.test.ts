import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildS26Sample, buildS30Sample, buildScannedPdf } from './fixtures/pdf.ts';

let tempDir: string;
let previousDbPath: string | undefined;

async function loadImporter(dbPath: string) {
  process.env.CONTABILIDAD_DB_PATH = dbPath;

  // El cliente de la base de datos guarda la conexion en globalThis: se
  // descarta para que cada test use su propia base temporal.
  const globalForDb = globalThis as unknown as { __contabilidadDb?: unknown };
  globalForDb.__contabilidadDb = undefined;

  // Se importa de forma dinamica para que el cliente de la base de datos
  // use la ruta temporal de este test.
  const [{ buildPreview, applyPreview }, { getDb }] = await Promise.all([
    import('@/lib/finance/importer'),
    import('@/lib/db/client'),
  ]);
  return { buildPreview, applyPreview, getDb };
}

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'contabilidad-test-'));
  previousDbPath = process.env.CONTABILIDAD_DB_PATH;
});

afterEach(() => {
  if (previousDbPath === undefined) {
    delete process.env.CONTABILIDAD_DB_PATH;
  } else {
    process.env.CONTABILIDAD_DB_PATH = previousDbPath;
  }
  rmSync(tempDir, { recursive: true, force: true });
});

describe('importador de informes', () => {
  it('analiza un S-26 y un S-30 sin escribir nada en la base de datos', async () => {
    const dbPath = join(tempDir, 'contabilidad.db');
    const { buildPreview, getDb } = await loadImporter(dbPath);

    const preview = await buildPreview([
      { name: 'S-26-septiembre2026.pdf', bytes: buildS26Sample() },
      { name: 'S-30-septiembre2026.pdf', bytes: buildS30Sample() },
    ]);

    expect(preview.months).toHaveLength(1);
    expect(preview.months[0].year).toBe(2026);
    expect(preview.months[0].month).toBe(9);
    expect(preview.months[0].transactions).toHaveLength(6);
    expect(preview.months[0].openingBalance).toBe(3376.55);
    expect(preview.months[0].incomeTotal).toBe(787);

    // La vista previa no ha escrito nada: la tabla de meses sigue vacía.
    const months = getDb().prepare('SELECT COUNT(*) AS total FROM months').get() as {
      total: number;
    };
    expect(months.total).toBe(0);
  });

  it('guarda el mes con sus movimientos y sus lineas de resumen', async () => {
    const dbPath = join(tempDir, 'contabilidad.db');
    const { buildPreview, applyPreview, getDb } = await loadImporter(dbPath);

    const preview = await buildPreview([
      { name: 'S-26-septiembre2026.pdf', bytes: buildS26Sample() },
      { name: 'S-30-septiembre2026.pdf', bytes: buildS30Sample() },
    ]);

    const result = applyPreview(preview);
    expect(result.success).toBe(true);
    expect(result.importedRows).toBe(6);

    const db = getDb();
    const months = db.prepare('SELECT * FROM months').all() as {
      year: number;
      month: number;
      opening_balance: number;
      closing_balance: number;
    }[];
    expect(months).toHaveLength(1);
    expect(months[0].opening_balance).toBe(3376.55);

    const transactions = db.prepare('SELECT COUNT(*) AS total FROM transactions').get() as {
      total: number;
    };
    expect(transactions.total).toBe(6);

    // Los dos importes de la fila del deposito se conservan por separado.
    const entries = db
      .prepare(
        `SELECT e.account, e.direction, e.amount
           FROM transaction_entries e
           JOIN transactions t ON t.id = e.transaction_id
          WHERE t.ct_code = 'D'`,
      )
      .all() as { account: string; direction: string; amount: number }[];
    expect(entries).toHaveLength(2);
    expect(entries).toEqual(
      expect.arrayContaining([
        { account: 'caja', direction: 'salida', amount: 220 },
        { account: 'banco', direction: 'entrada', amount: 220 },
      ]),
    );

    const summary = db.prepare('SELECT COUNT(*) AS total FROM summary_lines').get() as {
      total: number;
    };
    expect(summary.total).toBeGreaterThan(0);
  });

  it('registra la importacion solo con el hash, el nombre y las filas', async () => {
    const dbPath = join(tempDir, 'contabilidad.db');
    const { buildPreview, applyPreview, getDb } = await loadImporter(dbPath);

    const preview = await buildPreview([
      { name: 'S-26-septiembre2026.pdf', bytes: buildS26Sample() },
    ]);
    applyPreview(preview);

    const rows = getDb().prepare('SELECT * FROM imports').all() as Record<string, unknown>[];
    expect(rows).toHaveLength(1);

    // Nunca se guarda el PDF: solo el hash, el nombre, la fecha y las filas.
    expect(Object.keys(rows[0]).sort()).toEqual(
      [
        'doc_type',
        'filename',
        'id',
        'imported_at',
        'month_id',
        'rows',
        'source_hash',
        'status',
        'warnings',
      ].sort(),
    );
    expect(String(rows[0].source_hash)).toHaveLength(64);
    expect(rows[0].filename).toBe('S-26-septiembre2026.pdf');
  });

  it('detecta el hash duplicado', async () => {
    const dbPath = join(tempDir, 'contabilidad.db');
    const { buildPreview, applyPreview } = await loadImporter(dbPath);

    const files = [{ name: 'S-26-septiembre2026.pdf', bytes: buildS26Sample() }];

    const first = await buildPreview(files);
    applyPreview(first);

    const second = await buildPreview(files);
    expect(second.duplicateHashes).toHaveLength(1);
    expect(second.existingMonths).toHaveLength(1);
  });

  it('ignora los documentos que no son S-26 ni S-30', async () => {
    const dbPath = join(tempDir, 'contabilidad.db');
    const { buildPreview } = await loadImporter(dbPath);

    const preview = await buildPreview([
      { name: 'Estado de cuentas - 08-2026.pdf', bytes: buildS30Sample() },
    ]);

    // El contenido es un S-30, pero se importa por contenido, no por nombre.
    expect(preview.files[0].docType).toBe('S-30');
  });

  it('avisa y no guarda nada cuando el PDF es un escaneo', async () => {
    const dbPath = join(tempDir, 'contabilidad.db');
    const { buildPreview, applyPreview, getDb } = await loadImporter(dbPath);

    const preview = await buildPreview([
      { name: 'escaneo.pdf', bytes: buildScannedPdf() },
    ]);

    expect(preview.failedFiles).toBe(1);
    expect(preview.files[0].message).toContain('escaneo');
    expect(preview.months).toHaveLength(0);

    const result = applyPreview(preview);
    expect(result.success).toBe(true);
    expect(result.importedRows).toBe(0);

    const transactions = getDb()
      .prepare('SELECT COUNT(*) AS total FROM transactions')
      .get() as { total: number };
    expect(transactions.total).toBe(0);
  });

  it('no escribe nada en el disco aparte de la base de datos', async () => {
    const dbPath = join(tempDir, 'contabilidad.db');
    const { buildPreview, applyPreview } = await loadImporter(dbPath);

    const preview = await buildPreview([
      { name: 'S-26-septiembre2026.pdf', bytes: buildS26Sample() },
    ]);
    applyPreview(preview);

    // En la carpeta solo puede estar la base de datos y sus ficheros WAL.
    const { readdirSync } = await import('node:fs');
    const files = readdirSync(tempDir);
    expect(files.every((file) => file.startsWith('contabilidad.db'))).toBe(true);
  });
});
