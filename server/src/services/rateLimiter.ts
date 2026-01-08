import { getDatabase } from './database.js';

const MAX_SCANS_PER_HOUR = parseInt(process.env.RATE_LIMIT_MAX || '10', 10);
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '3600000', 10); // 1 hour

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Check if an IP address is rate limited.
 * Returns whether the request is allowed and remaining quota.
 */
export function checkRateLimit(ipAddress: string): RateLimitResult {
  const db = getDatabase();
  const now = Date.now();
  const windowStart = new Date(now - WINDOW_MS).toISOString();

  // Get current rate limit record
  const row = db.prepare(
    'SELECT scan_count, window_start FROM rate_limits WHERE ip_address = ?'
  ).get(ipAddress) as { scan_count: number; window_start: string } | undefined;

  if (!row) {
    // First request from this IP
    db.prepare(
      "INSERT INTO rate_limits (ip_address, scan_count, window_start) VALUES (?, 1, datetime('now'))"
    ).run(ipAddress);

    return {
      allowed: true,
      remaining: MAX_SCANS_PER_HOUR - 1,
      resetAt: new Date(now + WINDOW_MS)
    };
  }

  // Check if window has expired
  const recordWindowStart = new Date(row.window_start).getTime();
  if (recordWindowStart < new Date(windowStart).getTime()) {
    // Reset the window
    db.prepare(
      "UPDATE rate_limits SET scan_count = 1, window_start = datetime('now') WHERE ip_address = ?"
    ).run(ipAddress);

    return {
      allowed: true,
      remaining: MAX_SCANS_PER_HOUR - 1,
      resetAt: new Date(now + WINDOW_MS)
    };
  }

  // Check if under limit
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
}

/**
 * Get rate limit status without incrementing counter.
 */
export function getRateLimitStatus(ipAddress: string): RateLimitResult {
  const db = getDatabase();
  const now = Date.now();
  const windowStart = new Date(now - WINDOW_MS).toISOString();

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
  if (recordWindowStart < new Date(windowStart).getTime()) {
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
