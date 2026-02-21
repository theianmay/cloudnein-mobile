import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite"

let db: SQLiteDatabase | null = null

export function getDB(): SQLiteDatabase {
  if (!db) {
    db = openDatabaseSync("sovereign_ledger.db")
    createTables(db)
  }
  return db
}

function createTables(database: SQLiteDatabase) {
  database.execSync(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      vendor TEXT NOT NULL,
      amount REAL NOT NULL,
      notes TEXT
    );
    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL UNIQUE,
      monthly_limit REAL NOT NULL
    );
  `)
}

export function closeDB() {
  if (db) {
    db.closeSync()
    db = null
  }
}
