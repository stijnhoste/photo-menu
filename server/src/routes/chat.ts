import { Router, Request, Response } from 'express';
import { getClient, CLAUDE_MODEL } from '../services/claude.js';
import { createMemoryLimiter } from '../services/memoryRateLimiter.js';

const router = Router();

// 60 chat messages per hour per IP
const checkChatLimit = createMemoryLimiter(
  parseInt(process.env.CHAT_RATE_LIMIT_MAX || '60', 10) || 60,
  3600000
);

interface ChatDish {
  name: string;
  price: string | null;
  category: string;
}

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Menu assistant chat with SSE streaming.
 * POST /api/chat
 *
 * Request body: { messages: ChatTurn[], dishes: ChatDish[], language?: string }
 * Response: SSE stream — `delta` events with { text }, then `done`.
 */
router.post('/', async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  const limit = checkChatLimit(ip);
  if (!limit.allowed) {
    res.status(429).json({ error: 'Rate limit exceeded', resetAt: limit.resetAt.toISOString() });
    return;
  }

  const { messages, dishes, language } = req.body as {
    messages?: ChatTurn[];
    dishes?: ChatDish[];
    language?: string;
  };

  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 40) {
    res.status(400).json({ error: 'messages must be a non-empty array (max 40)' });
    return;
  }
  if (!Array.isArray(dishes) || dishes.length === 0 || dishes.length > 300) {
    res.status(400).json({ error: 'dishes must be a non-empty array (max 300)' });
    return;
  }

  const cleanMessages = messages
    .filter(
      (m): m is ChatTurn =>
        !!m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim().length > 0
    )
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

  if (cleanMessages.length === 0 || cleanMessages[cleanMessages.length - 1].role !== 'user') {
    res.status(400).json({ error: 'Last message must be from the user' });
    return;
  }

  const menuJson = JSON.stringify(
    dishes.map((d) => ({
      name: String(d.name).slice(0, 200),
      price: d.price ? String(d.price).slice(0, 30) : null,
      category: String(d.category || 'Other').slice(0, 60),
    }))
  );

  const system = `You are the friendly menu assistant for menu.pictures. The user has just scanned a restaurant menu; the extracted items are below as JSON.

<menu>
${menuJson}
</menu>

Guidelines:
- Answer questions about this menu: prices, comparisons ("most expensive wine"), pairings ("which wine goes with steak"), dietary questions, recommendations, and explanations of dishes.
- Your answers may be read aloud by text-to-speech, so keep them short and conversational — usually 1-3 sentences. No markdown, no bullet lists, no emoji.
- When comparing prices, parse the price strings numerically and be accurate.
- If asked about something not on the menu, say so briefly and suggest the closest alternative from the menu.
- For pairing or dietary questions, use general culinary knowledge but only recommend items that are actually on this menu.${
    language ? `\n- Reply in ${String(language).slice(0, 40)}.` : '\n- Reply in the language the user writes in.'
  }`;

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  let closed = false;
  res.on('close', () => {
    closed = true;
  });

  const sendEvent = (event: string, data: unknown) => {
    if (!closed) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }
  };

  try {
    const stream = getClient().messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system,
      messages: cleanMessages,
    });

    stream.on('text', (text) => {
      sendEvent('delta', { text });
    });

    await stream.finalMessage();
    sendEvent('done', {});
  } catch (error) {
    console.error('Chat error:', error);
    sendEvent('error', { message: 'The assistant is unavailable right now. Please try again.' });
  }

  res.end();
});

export default router;
