import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { chmodSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let tempDir: string;
let previousDbPath: string | undefined;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'almacenamiento-'));
  previousDbPath = process.env.CONTABILIDAD_DB_PATH;
  process.env.CONTABILIDAD_DB_PATH = join(tempDir, 'data', 'contabilidad.db');

  const globalForDb = globalThis as unknown as {
    __contabilidadDb?: unknown;
    __contabilidadStatus?: unknown;
  };
  globalForDb.__contabilidadDb = undefined;
  globalForDb.__contabilidadStatus = undefined;
});

afterEach(() => {
  if (previousDbPath === undefined) {
    delete process.env.CONTABILIDAD_DB_PATH;
  } else {
    process.env.CONTABILIDAD_DB_PATH = previousDbPath;
  }
  chmodSync(join(tempDir, 'data'), 0o755);
  rmSync(tempDir, { recursive: true, force: true });
});

describe('almacenamiento de la contabilidad', () => {
  it('detecta que no se puede escribir y lo explica', async () => {
    const { getStorageStatus } = await import('@/lib/db/client');

    // Se prepara una carpeta de solo lectura, como en un contenedor sin disco
    // persistente.
    const dataDir = join(tempDir, 'data');
    mkdirSync(dataDir, { recursive: true });
    chmodSync(dataDir, 0o555);

    const status = getStorageStatus();

    expect(status.available).toBe(false);
    expect(status.reason).toBeTruthy();
    expect(status.reason).toMatch(/no permite escribir|no se ha podido preparar/i);
  });

  it('indica que está disponible cuando el disco permite escribir', async () => {
    const { getStorageStatus } = await import('@/lib/db/client');

    const status = getStorageStatus();

    expect(status.available).toBe(true);
    expect(status.path).toContain('contabilidad.db');
  });

  it('lanza un error tipado al intentar abrir la base de datos', async () => {
    const { getDb, AccountingStorageError } = await import('@/lib/db/client');

    const dataDir = join(tempDir, 'data');
    mkdirSync(dataDir, { recursive: true });
    chmodSync(dataDir, 0o555);

    expect(() => getDb()).toThrow(AccountingStorageError);
  });
});
