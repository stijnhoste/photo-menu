import { Router, Request, Response } from 'express';
import { extractMenuDishes } from '../services/claude.js';
import { searchDishImage } from '../services/pexels.js';
import { checkRateLimit, getRateLimitStatus } from '../services/rateLimiter.js';

const router = Router();

/**
 * Get rate limit status for the current IP.
 * GET /api/scan/status
 */
router.get('/status', (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const status = getRateLimitStatus(ip);

  res.json({
    remaining: status.remaining,
    resetAt: status.resetAt.toISOString(),
    allowed: status.allowed,
  });
});

/**
 * Scan menu images and extract dishes with images.
 * POST /api/scan
 *
 * Request body: { images: string[] } - Array of base64-encoded images
 *
 * Response: Server-Sent Events stream
 * - event: dish - Individual dish with image found
 * - event: error - Error occurred
 * - event: done - Processing complete
 */
router.post('/', async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  // Check rate limit
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    res.status(429).json({
      error: 'Rate limit exceeded',
      resetAt: rateLimit.resetAt.toISOString(),
      remaining: 0,
    });
    return;
  }

  const { images } = req.body as { images?: string[] };

  if (!images || !Array.isArray(images) || images.length === 0) {
    res.status(400).json({ error: 'No images provided' });
    return;
  }

  if (images.length > 10) {
    res.status(400).json({ error: 'Maximum 10 images per request' });
    return;
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Helper to send SSE events
  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // Send rate limit info
    sendEvent('rateLimit', {
      remaining: rateLimit.remaining,
      resetAt: rateLimit.resetAt.toISOString(),
    });

    // Extract dishes from menu images using Claude
    sendEvent('status', { message: 'Analyzing menu...', phase: 'extraction' });

    let dishes;
    try {
      dishes = await extractMenuDishes(images);
    } catch (error) {
      console.error('Menu extraction error:', error);
      sendEvent('error', { message: 'Failed to analyze menu. Please try with a clearer image.' });
      res.end();
      return;
    }

    if (dishes.length === 0) {
      sendEvent('status', { message: 'No dishes found in the menu', phase: 'complete' });
      sendEvent('done', { totalDishes: 0 });
      res.end();
      return;
    }

    sendEvent('status', {
      message: `Found ${dishes.length} dishes. Fetching images...`,
      phase: 'images',
      totalDishes: dishes.length,
    });

    // Fetch images for each dish and stream results
    for (let i = 0; i < dishes.length; i++) {
      const dish = dishes[i];

      try {
        // Pass category to improve image search accuracy
        const imageUrl = await searchDishImage(dish.name, dish.category);

        sendEvent('dish', {
          index: i,
          name: dish.name,
          price: dish.price,
          category: dish.category,
          imageUrl: imageUrl || null,
        });
      } catch (error) {
        console.error(`Failed to fetch image for ${dish.name}:`, error);
        // Still send the dish, just without an image
        sendEvent('dish', {
          index: i,
          name: dish.name,
          price: dish.price,
          category: dish.category,
          imageUrl: null,
        });
      }
    }

    sendEvent('done', { totalDishes: dishes.length });
  } catch (error) {
    console.error('Scan error:', error);
    sendEvent('error', {
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }

  res.end();
});

export default router;
