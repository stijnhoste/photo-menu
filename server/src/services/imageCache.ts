import { getDatabase } from './database.js';

/**
 * Normalize dish name for cache lookup.
 * - Lowercase (preserves accented characters like é, ü, ñ)
 * - Trim whitespace
 * - Collapse multiple spaces
 *
 * Note: We keep accented characters to avoid collisions
 * (e.g., "Crème Brûlée" vs "Creme Brulee" are different dishes)
 */
function normalizeDishName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Get cached image URL for a dish name.
 */
export function getCachedImage(dishName: string): string | null {
  const normalized = normalizeDishName(dishName);
  const db = getDatabase();

  const row = db.prepare(
    'SELECT image_url FROM image_cache WHERE dish_name = ?'
  ).get(normalized) as { image_url: string } | undefined;

  return row?.image_url ?? null;
}

/**
 * Cache an image URL for a dish name.
 */
export function cacheImage(dishName: string, imageUrl: string): void {
  const normalized = normalizeDishName(dishName);
  const db = getDatabase();

  db.prepare(
    "INSERT OR REPLACE INTO image_cache (dish_name, image_url, cached_at) VALUES (?, ?, datetime('now'))"
  ).run(normalized, imageUrl);
}

/**
 * Get cache stats for monitoring.
 */
export function getCacheStats(): { totalEntries: number } {
  const db = getDatabase();
  const row = db.prepare('SELECT COUNT(*) as count FROM image_cache').get() as { count: number };

  return {
    totalEntries: row.count,
  };
}
