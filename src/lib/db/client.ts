import { existsSync, mkdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA } from './schema';

const DEFAULT_DB_PATH = 'data/contabilidad.db';

/**
 * Error de almacenamiento de la contabilidad.
 *
 * Se lanza cuando la base de datos local no puede usarse, por ejemplo porque
 * el sistema de ficheros es de solo lectura (Firebase App Hosting / Cloud Run).
 * La app debe seguir funcionando: solo el módulo de contabilidad se ve
 * afectado.
 */
export class AccountingStorageError extends Error {
  readonly path: string;
  readonly reason: string;

  constructor(path: string, reason: string) {
    super(reason);
    this.name = 'AccountingStorageError';
    this.path = path;
    this.reason = reason;
  }
}

function resolveDbPath(): string {
  const configured = process.env.CONTABILIDAD_DB_PATH?.trim();
  if (!configured) return resolve(process.cwd(), DEFAULT_DB_PATH);
  return isAbsolute(configured) ? configured : resolve(process.cwd(), configured);
}

/**
 * Comprueba si se puede crear el fichero de base de datos antes de intentarlo,
 * para poder dar un mensaje claro en lugar de un error genérico.
 */
function assertWritable(path: string): void {
  const dir = dirname(path);

  try {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    } else if (!statSync(dir).isDirectory()) {
      throw new Error('la ruta no es un directorio');
    }

    // Se prueba a crear un fichero temporal: en un sistema de solo lectura
    // falla aquí con EROFS o EACCES.
    const probe = resolve(dir, `.contabilidad-probe-${process.pid}`);
    writeFileSync(probe, '');
    unlinkSync(probe);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'EROFS' || code === 'EACCES' || code === 'EPERM') {
      throw new AccountingStorageError(
        path,
        `El sistema de ficheros no permite escribir en "${dir}" (${code}). ` +
          'La contabilidad necesita un disco donde se pueda guardar la base de datos.',
      );
    }
    throw new AccountingStorageError(
      path,
      `No se ha podido preparar la carpeta "${dir}": ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function openDatabase(): DatabaseSync {
  const path = resolveDbPath();
  assertWritable(path);

  try {
    const db = new DatabaseSync(path);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
    db.exec(SCHEMA);
    migrate(db);
    return db;
  } catch (error) {
    if (error instanceof AccountingStorageError) throw error;
    throw new AccountingStorageError(
      path,
      `No se ha podido abrir la base de datos de contabilidad: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
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

/** Estado del almacenamiento de la contabilidad. */
export interface StorageStatus {
  available: boolean;
  path: string;
  reason?: string;
}

// El resultado se cachea: comprobarlo en cada petición sería un desperdicio.
const globalForStatus = globalThis as unknown as { __contabilidadStatus?: StorageStatus };

/**
 * Comprueba si la base de datos local puede usarse, sin lanzar.
 *
 * En un entorno con el disco de solo lectura (Firebase App Hosting / Cloud Run)
 * devuelve `available: false` con el motivo, para que la interfaz pueda
 * explicarlo en lugar de mostrar un error genérico.
 */
export function getStorageStatus(): StorageStatus {
  if (globalForStatus.__contabilidadStatus) {
    return globalForStatus.__contabilidadStatus;
  }

  const path = resolveDbPath();
  let status: StorageStatus;

  try {
    getDb();
    status = { available: true, path };
  } catch (error) {
    status = {
      available: false,
      path,
      reason:
        error instanceof AccountingStorageError
          ? error.reason
          : error instanceof Error
            ? error.message
            : String(error),
    };
  }

  globalForStatus.__contabilidadStatus = status;
  return status;
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
