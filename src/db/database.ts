import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('maintbot.db');
  await runMigrations(db);
  return db;
}

// Idempotent: only ALTER if the column doesn't already exist.
async function ensureColumn(
  database: SQLite.SQLiteDatabase,
  table: string,
  column: string,
  ddl: string
): Promise<void> {
  const cols = await database.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (!cols.some((c) => c.name === column)) {
    await database.runAsync(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

async function runMigrations(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      year INTEGER,
      make TEXT NOT NULL DEFAULT '',
      model TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT 'dirtbike',
      vin TEXT NOT NULL DEFAULT '',
      photo_uri TEXT NOT NULL DEFAULT '',
      current_hours REAL NOT NULL DEFAULT 0,
      reg_expiry TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS maintenance_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      interval_hours REAL NOT NULL,
      last_done_hours REAL NOT NULL DEFAULT 0,
      is_custom INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS maintenance_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      maintenance_item_id INTEGER,
      item_name TEXT NOT NULL,
      hours_at_service REAL NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      performed_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
      FOREIGN KEY (maintenance_item_id) REFERENCES maintenance_items(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS ride_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      hours_before REAL NOT NULL,
      hours_after REAL NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      logged_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS vehicle_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      pinned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_vehicle_notes_vehicle
      ON vehicle_notes(vehicle_id);

    CREATE TABLE IF NOT EXISTS vehicle_default_dismissals (
      vehicle_id INTEGER NOT NULL,
      default_name TEXT NOT NULL,
      dismissed_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (vehicle_id, default_name),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    );
  `);

  // Miles tracking: optional second odometer per vehicle, optional second
  // interval per maintenance item, optional miles reading per service log
  // entry. All hours behavior is unchanged; miles is purely additive.
  await ensureColumn(database, 'vehicles', 'current_miles', 'current_miles REAL NOT NULL DEFAULT 0');
  await ensureColumn(database, 'maintenance_items', 'interval_miles', 'interval_miles REAL NOT NULL DEFAULT 0');
  await ensureColumn(database, 'maintenance_items', 'last_done_miles', 'last_done_miles REAL NOT NULL DEFAULT 0');
  await ensureColumn(database, 'maintenance_log', 'miles_at_service', 'miles_at_service REAL');
}
