import { getDatabase } from './database.js';

const MAX_SCANS_PER_HOUR = parseInt(process.env.RATE_LIMIT_MAX || '10', 10) || 10;
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '3600000', 10) || 3600000; // 1 hour

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Check if an IP address is rate limited.
 * Uses SQLite transaction for atomic check+update to prevent race conditions.
 */
export function checkRateLimit(ipAddress: string): RateLimitResult {
  const db = getDatabase();
  const now = Date.now();
  const windowStartThreshold = now - WINDOW_MS;

  // Use transaction for atomic check+update (prevents race condition)
  const atomicCheckAndIncrement = db.transaction(() => {
    // Get current rate limit record
    const row = db.prepare(
      'SELECT scan_count, window_start FROM rate_limits WHERE ip_address = ?'
    ).get(ipAddress) as { scan_count: number; window_start: string } | undefined;

    if (!row) {
      // First request from this IP - insert new record
      const windowStart = new Date(now).toISOString();
      db.prepare(
        'INSERT INTO rate_limits (ip_address, scan_count, window_start) VALUES (?, 1, ?)'
      ).run(ipAddress, windowStart);

      return {
        allowed: true,
        remaining: MAX_SCANS_PER_HOUR - 1,
        resetAt: new Date(now + WINDOW_MS)
      };
    }

    const recordWindowStart = new Date(row.window_start).getTime();

    // Check if window has expired
    if (recordWindowStart < windowStartThreshold) {
      // Reset the window with new timestamp
      const newWindowStart = new Date(now).toISOString();
      db.prepare(
        'UPDATE rate_limits SET scan_count = 1, window_start = ? WHERE ip_address = ?'
      ).run(newWindowStart, ipAddress);

      return {
        allowed: true,
        remaining: MAX_SCANS_PER_HOUR - 1,
        resetAt: new Date(now + WINDOW_MS)
      };
    }

    // Window is still active - check if under limit
    if (row.scan_count < MAX_SCANS_PER_HOUR) {
      db.prepare(
        'UPDATE rate_limits SET scan_count = scan_count + 1 WHERE ip_address = ?'
      ).run(ipAddress);

      return {
        allowed: true,
        remaining: MAX_SCANS_PER_HOUR - row.scan_count - 1,
        resetAt: new Date(recordWindowStart + WINDOW_MS)
      };
    }

    // Rate limited
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(recordWindowStart + WINDOW_MS)
    };
  });

  return atomicCheckAndIncrement();
}

/**
 * Get rate limit status without incrementing counter.
 */
export function getRateLimitStatus(ipAddress: string): RateLimitResult {
  const db = getDatabase();
  const now = Date.now();
  const windowStartThreshold = now - WINDOW_MS;

  const row = db.prepare(
    'SELECT scan_count, window_start FROM rate_limits WHERE ip_address = ?'
  ).get(ipAddress) as { scan_count: number; window_start: string } | undefined;

  if (!row) {
    return {
      allowed: true,
      remaining: MAX_SCANS_PER_HOUR,
      resetAt: new Date(now + WINDOW_MS)
    };
  }

  const recordWindowStart = new Date(row.window_start).getTime();

  if (recordWindowStart < windowStartThreshold) {
    // Window expired, user has full quota
    return {
      allowed: true,
      remaining: MAX_SCANS_PER_HOUR,
      resetAt: new Date(now + WINDOW_MS)
    };
  }

  return {
    allowed: row.scan_count < MAX_SCANS_PER_HOUR,
    remaining: Math.max(0, MAX_SCANS_PER_HOUR - row.scan_count),
    resetAt: new Date(recordWindowStart + WINDOW_MS)
  };
}
