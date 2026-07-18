import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractDocumentText, getOcrProvider } from './ocr.js';

describe('Google Vision OCR', () => {
  afterEach(() => delete process.env.GOOGLE_VISION_API_KEY);

  it('reports whether dedicated OCR is configured', () => {
    expect(getOcrProvider()).toBe('claude-vision');
    process.env.GOOGLE_VISION_API_KEY = 'configured';
    expect(getOcrProvider()).toBe('google-vision');
  });

  it('sends document text detection requests without the data URL prefix', async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.requests[0]).toMatchObject({
        image: { content: 'abc123' },
        features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
      });
      return new Response(JSON.stringify({ responses: [{ fullTextAnnotation: { text: 'Menu text' } }] }));
    }) as typeof fetch;

    await expect(extractDocumentText(['data:image/jpeg;base64,abc123'], {
      apiKey: 'test-key', fetchImpl,
    })).resolves.toBe('Menu text');
  });
});
