import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { extractMenuDishes } from '../services/claude.js';
import { searchDishImage } from '../services/pexels.js';
import { checkRateLimit, getRateLimitStatus } from '../services/rateLimiter.js';
import { mapWithConcurrency } from '../utils/concurrency.js';
import { createMemoryLimiter } from '../services/memoryRateLimiter.js';
import { z } from 'zod';

const IMAGE_CONCURRENCY = Math.max(
  1,
  Math.min(8, Number(process.env.IMAGE_FETCH_CONCURRENCY) || 4)
);
const checkImageRetryLimit = createMemoryLimiter(40, 3600000);
const imageRetrySchema = z.object({
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().max(60).default('Food'),
  attempt: z.number().int().min(1).max(8).default(1)
});

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

router.post('/image', async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkImageRetryLimit(ip).allowed) {
    res.status(429).json({ error: 'Image retry limit exceeded' });
    return;
  }
  const parsed = imageRetrySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid image request' });
    return;
  }
  const { name, category, attempt } = parsed.data;
  const imageUrl = await searchDishImage(
    name,
    `${name} ${category} plated dish`,
    undefined,
    { skipCache: true, page: attempt + 1 }
  );
  res.json({ imageUrl });
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
  // Generate request ID for tracing/debugging
  const requestId = randomUUID().slice(0, 8);
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  console.log(`[${requestId}] Scan request from ${ip}`);

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

  // Track connection state to stop processing if client disconnects
  let isConnectionClosed = false;
  const requestController = new AbortController();
  res.on('close', () => {
    isConnectionClosed = true;
    requestController.abort();
  });

  // Helper to send SSE events (checks connection state)
  const sendEvent = (event: string, data: unknown) => {
    if (!isConnectionClosed) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }
  };

  try {
    // Send rate limit info
    sendEvent('rateLimit', {
      remaining: rateLimit.remaining,
      resetAt: rateLimit.resetAt.toISOString(),
    });

    // Extract dishes from menu images using Claude
    sendEvent('status', { message: 'Analyzing menu...', phase: 'extraction' });

    let extractedMenu;
    try {
      extractedMenu = await extractMenuDishes(images);
      const { dishes } = extractedMenu;
      console.log(`[${requestId}] Extracted ${dishes.length} dishes`);
    } catch (error) {
      console.error(`[${requestId}] Menu extraction error:`, error);
      sendEvent('error', { message: 'Failed to analyze menu. Please try with a clearer image.' });
      res.end();
      return;
    }

    const { dishes, ...metadata } = extractedMenu;
    sendEvent('metadata', metadata);

    sendEvent('status', {
      message: `Found ${dishes.length} dishes. Fetching images...`,
      phase: 'images',
      totalDishes: dishes.length,
    });

    let completed = 0;
    await mapWithConcurrency(dishes, IMAGE_CONCURRENCY, async (dish, i) => {
      if (isConnectionClosed) return;
      try {
        const imageUrl = await searchDishImage(
          dish.name,
          dish.imageSearch,
          requestController.signal
        );

        sendEvent('dish', {
          id: randomUUID(),
          index: i,
          ...dish,
          imageUrl: imageUrl || null,
          imageIsRepresentative: true
        });
      } catch (error) {
        console.error(`Failed to fetch image for ${dish.name}:`, error);
        sendEvent('dish', {
          id: randomUUID(),
          index: i,
          ...dish,
          imageUrl: null,
          imageIsRepresentative: true
        });
      } finally {
        completed += 1;
        sendEvent('progress', {
          phase: 'images',
          completed,
          total: dishes.length
        });
      }
    });

    sendEvent('done', { totalDishes: dishes.length });
  } catch (error) {
    console.error(`[${requestId}] Scan error:`, error);
    sendEvent('error', {
      message: 'An unexpected error occurred',
    });
  }

  console.log(`[${requestId}] Scan complete`);
  res.end();
});

export default router;
