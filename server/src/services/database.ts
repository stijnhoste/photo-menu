import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db: Database.Database | null = null;

/**
 * Initialize the SQLite database with required tables.
 */
export function initDatabase(): void {
  const dbDir = path.join(__dirname, '../../data');

  // Ensure data directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = process.env.DATABASE_PATH || path.join(dbDir, 'menus.sqlite');
  db = new Database(dbPath);

  // Enable WAL mode for better concurrent access
  db.pragma('journal_mode = WAL');

  // Create tables
  db.exec(`
    -- Shared menus (for share links)
    CREATE TABLE IF NOT EXISTS shared_menus (
      id TEXT PRIMARY KEY,
      dishes TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_expires ON shared_menus(expires_at);

    -- Image cache (reduces Pexels API calls)
    CREATE TABLE IF NOT EXISTS image_cache (
      dish_name TEXT PRIMARY KEY,
      image_url TEXT NOT NULL,
      cached_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_cached_at ON image_cache(cached_at);

    -- Rate limiting (IP-based)
    CREATE TABLE IF NOT EXISTS rate_limits (
      ip_address TEXT PRIMARY KEY,
      scan_count INTEGER DEFAULT 0,
      window_start DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Cleanup expired entries on startup
  cleanupExpired();

  console.log('Database initialized at:', dbPath);
}

/**
 * Get the database instance.
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Clean up expired shared menus and old cache entries.
 */
export function cleanupExpired(): void {
  if (!db) return;

  // Remove expired shared menus
  const expiredMenus = db.prepare(
    "DELETE FROM shared_menus WHERE expires_at < datetime('now')"
  ).run();

  // Remove image cache entries older than 7 days
  const expiredCache = db.prepare(
    "DELETE FROM image_cache WHERE cached_at < datetime('now', '-7 days')"
  ).run();

  if (expiredMenus.changes > 0 || expiredCache.changes > 0) {
    console.log(`Cleanup: removed ${expiredMenus.changes} expired menus, ${expiredCache.changes} old cache entries`);
  }
}
