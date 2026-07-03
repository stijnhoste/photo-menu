import { Router, Request, Response } from 'express';
import { translateDishes, TranslatableDish } from '../services/claude.js';
import { createMemoryLimiter } from '../services/memoryRateLimiter.js';

const router = Router();

// 20 translations per hour per IP
const checkTranslateLimit = createMemoryLimiter(
  parseInt(process.env.TRANSLATE_RATE_LIMIT_MAX || '20', 10) || 20,
  3600000
);

/**
 * Translate the extracted menu into any language.
 * POST /api/translate
 *
 * Request body: { dishes: {name, category}[], targetLanguage: string }
 * Response: { dishes: {name, category}[] } — same order/length as input
 */
router.post('/', async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  const limit = checkTranslateLimit(ip);
  if (!limit.allowed) {
    res.status(429).json({ error: 'Rate limit exceeded', resetAt: limit.resetAt.toISOString() });
    return;
  }

  const { dishes, targetLanguage } = req.body as {
    dishes?: TranslatableDish[];
    targetLanguage?: string;
  };

  if (!Array.isArray(dishes) || dishes.length === 0 || dishes.length > 300) {
    res.status(400).json({ error: 'dishes must be a non-empty array (max 300)' });
    return;
  }
  if (typeof targetLanguage !== 'string' || !targetLanguage.trim() || targetLanguage.length > 40) {
    res.status(400).json({ error: 'targetLanguage is required (max 40 chars)' });
    return;
  }

  const cleanDishes = dishes.map((d) => ({
    name: String(d?.name || '').slice(0, 200),
    category: String(d?.category || 'Other').slice(0, 60),
  }));

  try {
    const translated = await translateDishes(cleanDishes, targetLanguage.trim());
    res.json({ dishes: translated });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(502).json({ error: 'Translation failed. Please try again.' });
  }
});

export default router;
