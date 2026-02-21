import { open, type NitroSQLiteConnection } from "react-native-nitro-sqlite"

let db: NitroSQLiteConnection | null = null

export function getDB(): NitroSQLiteConnection {
  if (!db) {
    db = open({ name: "sovereign_ledger.db" })
    createTables(db)
  }
  return db
}

function createTables(database: NitroSQLiteConnection) {
  database.execute(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      vendor TEXT NOT NULL,
      amount REAL NOT NULL,
      notes TEXT
    )
  `)

  database.execute(`
    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL UNIQUE,
      monthly_limit REAL NOT NULL
    )
  `)
}

export function closeDB() {
  if (db) {
    db.close()
    db = null
  }
}
