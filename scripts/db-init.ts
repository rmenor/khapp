/**
 * Crea la base de datos de contabilidad (SQLite) con el esquema vacío.
 *
 *   npm run db:init
 */
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA } from '../src/lib/db/schema.ts';

const dbPath = process.env.CONTABILIDAD_DB_PATH
  ? resolve(process.cwd(), process.env.CONTABILIDAD_DB_PATH)
  : resolve(process.cwd(), 'data/contabilidad.db');

mkdirSync(dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');
db.exec(SCHEMA);
db.close();

console.log(`Base de datos creada en ${dbPath}`);
