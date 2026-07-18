import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getDatabase } from '../services/database.js';
import { checkRateLimit } from '../services/rateLimiter.js';
import { menuDocumentSchema } from '../domain/menu.js';

const router = Router();

const PERMANENT_EXPIRY = '9999-12-31T23:59:59.999Z';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  const parsed = menuDocumentSchema.safeParse(req.body?.menu);
  if (!parsed.success) {
    res.status(400).json({
      error: 'A valid reviewed menu is required',
      details: parsed.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message }))
    });
    return;
  }

  try {
    const db = getDatabase();
    const shareId = randomUUID();

    db.prepare(
      'INSERT INTO shared_menus (id, dishes, expires_at) VALUES (?, ?, ?)'
    ).run(shareId, JSON.stringify(parsed.data), PERMANENT_EXPIRY);

    res.json({
      shareId,
      expiresAt: null,
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

  if (!id || !UUID_REGEX.test(id)) {
    res.status(400).json({ error: 'Invalid share ID' });
    return;
  }

  try {
    const db = getDatabase();

    const row = db.prepare(
      'SELECT dishes, created_at, expires_at FROM shared_menus WHERE id = ? AND expires_at > ?'
    ).get(id, new Date().toISOString()) as { dishes: string; created_at: string; expires_at: string } | undefined;

    if (!row) {
      res.status(404).json({ error: 'Menu not found or expired' });
      return;
    }

    const stored = JSON.parse(row.dishes) as unknown;
    if (Array.isArray(stored)) {
      res.json({ dishes: stored, createdAt: row.created_at, expiresAt: row.expires_at });
      return;
    }

    const menu = menuDocumentSchema.parse(stored);
    res.json({ menu, createdAt: row.created_at, expiresAt: null });
  } catch (error) {
    console.error('Failed to get share:', error);
    res.status(500).json({ error: 'Failed to retrieve shared menu' });
  }
});

export default router;
