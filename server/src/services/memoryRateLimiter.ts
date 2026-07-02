/**
 * Lightweight in-memory sliding-window rate limiter for the chat and translate
 * endpoints. Scans keep using the SQLite-backed limiter; these endpoints are
 * cheaper per call so they get a more generous, process-local budget.
 */
interface Window {
  count: number;
  windowStart: number;
}

export function createMemoryLimiter(maxPerWindow: number, windowMs: number) {
  const windows = new Map<string, Window>();

  return function check(key: string): { allowed: boolean; resetAt: Date } {
    const now = Date.now();
    const existing = windows.get(key);

    if (!existing || now - existing.windowStart >= windowMs) {
      windows.set(key, { count: 1, windowStart: now });
      return { allowed: true, resetAt: new Date(now + windowMs) };
    }

    existing.count += 1;
    const resetAt = new Date(existing.windowStart + windowMs);

    // Opportunistic cleanup so the map doesn't grow unbounded
    if (windows.size > 10_000) {
      for (const [k, w] of windows) {
        if (now - w.windowStart >= windowMs) windows.delete(k);
      }
    }

    return { allowed: existing.count <= maxPerWindow, resetAt };
  };
}
