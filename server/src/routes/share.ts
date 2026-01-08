import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getDatabase } from '../services/database.js';
import { checkRateLimit } from '../services/rateLimiter.js';

const router = Router();

// Share link expiry in days
const SHARE_EXPIRY_DAYS = 30;

// Rate limit for share creation (uses same pool as scan)
const MAX_SHARES_PER_REQUEST = 5; // Allow more shares than scans

interface Dish {
  name: string;
  price: string | null;
  imageUrl: string | null;
}

/**
 * Create a shareable link for a menu.
 * POST /api/share
 *
 * Request body: { dishes: Dish[] }
 * Response: { shareId: string, expiresAt: string }
 */
router.post('/', (req: Request, res: Response) => {
  // Rate limit share creation to prevent abuse
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    res.status(429).json({
      error: 'Rate limit exceeded',
      resetAt: rateLimit.resetAt.toISOString(),
    });
    return;
  }

  const { dishes } = req.body as { dishes?: Dish[] };

  if (!dishes || !Array.isArray(dishes) || dishes.length === 0) {
    res.status(400).json({ error: 'No dishes provided' });
    return;
  }

  if (dishes.length > 100) {
    res.status(400).json({ error: 'Maximum 100 dishes per share' });
    return;
  }

  try {
    const db = getDatabase();
    const shareId = randomUUID();
    const expiresAt = new Date(Date.now() + SHARE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    db.prepare(
      'INSERT INTO shared_menus (id, dishes, expires_at) VALUES (?, ?, ?)'
    ).run(shareId, JSON.stringify(dishes), expiresAt.toISOString());

    res.json({
      shareId,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Failed to create share:', error);
    res.status(500).json({ error: 'Failed to create share link' });
  }
});

/**
 * Get a shared menu by ID.
 * GET /api/share/:id
 *
 * Response: { dishes: Dish[], createdAt: string, expiresAt: string }
 */
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || id.length !== 36) {
    res.status(400).json({ error: 'Invalid share ID' });
    return;
  }

  try {
    const db = getDatabase();

    const row = db.prepare(
      "SELECT dishes, created_at, expires_at FROM shared_menus WHERE id = ? AND expires_at > datetime('now')"
    ).get(id) as { dishes: string; created_at: string; expires_at: string } | undefined;

    if (!row) {
      res.status(404).json({ error: 'Menu not found or expired' });
      return;
    }

    res.json({
      dishes: JSON.parse(row.dishes),
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    });
  } catch (error) {
    console.error('Failed to get share:', error);
    res.status(500).json({ error: 'Failed to retrieve shared menu' });
  }
});

export default router;
