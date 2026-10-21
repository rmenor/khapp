import { existsSync, mkdirSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA } from './schema';

const DEFAULT_DB_PATH = 'data/contabilidad.db';

function resolveDbPath(): string {
  const configured = process.env.CONTABILIDAD_DB_PATH?.trim();
  if (!configured) return resolve(process.cwd(), DEFAULT_DB_PATH);
  return isAbsolute(configured) ? configured : resolve(process.cwd(), configured);
}

function openDatabase(): DatabaseSync {
  const path = resolveDbPath();
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(SCHEMA);
  migrate(db);
  return db;
}

/**
 * Aplica las migraciones pendientes sobre bases de datos ya existentes.
 *
 * `CREATE TABLE IF NOT EXISTS` no añade columnas nuevas a una tabla que ya
 * existe, así que las columnas nuevas se añaden aquí.
 */
function migrate(db: DatabaseSync): void {
  const columns = db.prepare('PRAGMA table_info(transactions)').all() as {
    name: string;
  }[];

  if (!columns.some((column) => column.name === 'search_text')) {
    db.exec('ALTER TABLE transactions ADD COLUMN search_text TEXT');
    db.exec(
      `UPDATE transactions
          SET search_text = lower(
            replace(replace(replace(replace(replace(replace(replace(
              description, 'á','a'), 'é','e'), 'í','i'), 'ó','o'), 'ú','u'), 'ñ','n'), 'ü','u')
          )`,
    );
  }
}

// Next.js reloads modules in dev; keep a single connection on globalThis to avoid
// opening the database file once per hot reload.
const globalForDb = globalThis as unknown as { __contabilidadDb?: DatabaseSync };

export function getDb(): DatabaseSync {
  if (!globalForDb.__contabilidadDb) {
    globalForDb.__contabilidadDb = openDatabase();
  }
  return globalForDb.__contabilidadDb;
}

export function dbPath(): string {
  return resolveDbPath();
}

export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Convierte las filas de `node:sqlite` en objetos simples.
 *
 * SQLite devuelve objetos sin prototipo (`Object.create(null)`), y React no
 * puede serializarlos para pasarlos a un Client Component. Al copiarlos se
 * recupera el prototipo normal de `Object`.
 */
export function plainRows<T>(rows: unknown[]): T[] {
  return rows.map((row) => ({ ...(row as object) }) as T);
}

export function plainRow<T>(row: unknown): T | undefined {
  if (row === undefined || row === null) return undefined;
  return { ...(row as object) } as T;
}
