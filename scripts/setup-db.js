const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.NODE_ENV === 'production'
  ? '/app/data/database.sqlite'
  : path.join(__dirname, '../database.sqlite');

// Ensure the directory for the SQLite file exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}


// Delete existing DB if you want a fresh start (optional, commented out)
// if (fs.existsSync(dbPath)) {
//   fs.unlinkSync(dbPath);
// }

const db = new Database(dbPath);

console.log('Initializing database...');

// Create Users table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Add schema for auditoriums and reservations tables
db.exec(`
    CREATE TABLE IF NOT EXISTS auditoriums (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#3b82f6'
    );

    CREATE TABLE IF NOT EXISTS reservations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        auditorium_id INTEGER,
        reservation_date TEXT NOT NULL,
        time_slot INTEGER NOT NULL,
        title TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(auditorium_id) REFERENCES auditoriums(id)
    );

    CREATE TABLE IF NOT EXISTS congregations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        address TEXT,
        contact_person TEXT,
        contact_phone TEXT,
        auditorium_id INTEGER,
        day_of_week INTEGER, -- 0=Sunday, 1=Monday, etc.
        time_slot_1 INTEGER, -- e.g. 19
        time_slot_2 INTEGER, -- e.g. 20
        day_of_week_2 INTEGER, -- Second meeting day
        time_slot_3 INTEGER, -- Second meeting slot 1
        time_slot_4 INTEGER, -- Second meeting slot 2
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(auditorium_id) REFERENCES auditoriums(id)
    );

    CREATE TABLE IF NOT EXISTS jornadas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

`);

// Seed Auditoriums if empty
const auditoriumCount = db.prepare('SELECT count(*) as count FROM auditoriums').get().count;
if (auditoriumCount === 0) {
  console.log('Seeding auditoriums...');
  const auditStmt = db.prepare('INSERT INTO auditoriums (name, color) VALUES (?, ?)');
  auditStmt.run('Auditorio 1', '#7c3aed'); // Purple
  auditStmt.run('Auditorio Auxiliar 1', '#9333ea'); // Purple-ish
  auditStmt.run('Auditorio 2', '#0284c7'); // Blue
  auditStmt.run('Auditorio Auxiliar 2', '#0ea5e9'); // Light Blue
  auditStmt.run('Auditorio 3', '#0f172a'); // Dark
  auditStmt.run('Zoom', '#2563eb'); // Blue Zoom
}

console.log('Database initialized successfully at', dbPath);
db.close();

