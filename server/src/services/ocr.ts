const GOOGLE_VISION_ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate';

interface VisionAnnotation {
  fullTextAnnotation?: { text?: string };
  textAnnotations?: Array<{ description?: string }>;
  error?: { message?: string };
}

interface VisionResponse {
  responses?: VisionAnnotation[];
}

export function getOcrProvider(): 'google-vision' | 'claude-vision' {
  return process.env.GOOGLE_VISION_API_KEY?.trim() ? 'google-vision' : 'claude-vision';
}

export async function extractDocumentText(
  images: string[],
  options: { apiKey?: string; fetchImpl?: typeof fetch } = {}
): Promise<string> {
  const apiKey = options.apiKey || process.env.GOOGLE_VISION_API_KEY?.trim();
  if (!apiKey) throw new Error('Google Vision API key is not configured');
  const fetchImpl = options.fetchImpl || fetch;
  const requests = images.map(image => ({
    image: { content: image.includes('base64,') ? image.split('base64,')[1] : image },
    features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
    imageContext: { languageHints: ['en', 'ru'] },
  }));

  const response = await fetchImpl(`${GOOGLE_VISION_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ requests }),
  });
  if (!response.ok) throw new Error(`Google Vision OCR failed with status ${response.status}`);

  const payload = await response.json() as VisionResponse;
  const annotations = payload.responses || [];
  const providerError = annotations.find(annotation => annotation.error)?.error?.message;
  if (providerError) throw new Error(`Google Vision OCR failed: ${providerError}`);
  const pages = annotations.map(annotation =>
    annotation.fullTextAnnotation?.text || annotation.textAnnotations?.[0]?.description || ''
  ).filter(Boolean);
  if (pages.length === 0) throw new Error('Google Vision OCR returned no text');
  return pages.join('\n\n--- PAGE ---\n\n');
}
