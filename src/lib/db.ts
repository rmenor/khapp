import Database from 'better-sqlite3';
import path from 'path';

// Use /app/data for database in production (writable), otherwise use project root
const dbPath = process.env.NODE_ENV === 'production'
    ? '/app/data/database.sqlite'
    : path.join(process.cwd(), 'database.sqlite');

// Singleton pattern for database connection
// In development, Next.js hot reloading can create multiple connections, 
// so we attach it to the global object.
const globalForDb = global as unknown as { db: Database.Database };

export const db = globalForDb.db || new Database(dbPath);

if (process.env.NODE_ENV !== 'production') globalForDb.db = db;

export default db;
