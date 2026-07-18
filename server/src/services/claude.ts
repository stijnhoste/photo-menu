import Anthropic from '@anthropic-ai/sdk';
import { compactMenuSchema, expandCompactMenu, mergeExtractedMenus } from '../domain/compactMenu.js';
import type { ExtractedMenu } from '../domain/menu.js';
import { extractDocumentText, getOcrProvider } from './ocr.js';

// Keep interactive language features on the richer model, but use Anthropic's
// fastest vision model for the latency-sensitive menu scan path.
export const CLAUDE_MODEL = 'claude-opus-4-8';
export const CLAUDE_EXTRACTION_MODEL = 'claude-haiku-4-5-20251001';

// Lazy initialization to ensure dotenv has loaded
let anthropic: Anthropic | null = null;

export function getClient(): Anthropic {
  if (!anthropic) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropic;
}

/**
 * Extract dish names and prices from menu image(s) using Claude Haiku 4.5.
 *
 * @param images - Array of base64-encoded images (with or without data URL prefix)
 * @returns Array of extracted dishes with names and prices
 */
export async function extractMenuDishes(images: string[]): Promise<ExtractedMenu> {
  // Prepare image content blocks
  const imageBlocks: Anthropic.ImageBlockParam[] = images.map((image) => {
    // Extract base64 data if it has a data URL prefix
    const base64Data = image.includes('base64,')
      ? image.split('base64,')[1]
      : image;

    // Determine media type (default to jpeg if not specified)
    let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';
    if (image.includes('data:image/png')) {
      mediaType = 'image/png';
    } else if (image.includes('data:image/gif')) {
      mediaType = 'image/gif';
    } else if (image.includes('data:image/webp')) {
      mediaType = 'image/webp';
    }

    return {
      type: 'image',
      source: {
        type: 'base64',
        media_type: mediaType,
        data: base64Data,
      },
    };
  });

  const requestRegion = async (scope: string, ocrText?: string) => {
    const response = await getClient().messages.create({
    model: CLAUDE_EXTRACTION_MODEL,
    max_tokens: 8_192,
    messages: [
      {
        role: 'user',
        content: [
          ...(ocrText ? [{
            type: 'text' as const,
            text: `Dedicated document OCR output follows. Correct obvious OCR errors using menu context, but do not invent missing items:\n\n${ocrText}`,
          }] : imageBlocks),
          {
            type: 'text',
            text: `Extract every printed menu item ${scope} accurately and concisely. Return only valid JSON, without markdown, in this exact compact shape:
{"restaurantName":string|null,"menuName":string|null,"currency":string|null,"sourceLanguage":string|null,"categories":[string],"items":[[exactItemName,printedPriceOrNull,zeroBasedCategoryIndex]]}

Put section names in categories in visual source order. Preserve top-to-bottom visual reading order. Do not invent prices or missing text. For multiple sizes, keep the base item with its first/lowest price. Return an empty items array when the specified region contains no items.`,
          },
        ],
      },
    ],
  });

    console.log(JSON.stringify({
      type: 'claude_extraction',
      model: response.model,
      scope,
      source: ocrText ? 'google-vision-ocr' : 'claude-vision',
      stopReason: response.stop_reason,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    }));

    if (response.stop_reason === 'max_tokens') {
      throw new Error('Menu extraction exceeded the model output limit');
    }
    const textContent = response.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('Claude returned no menu text');
    }

    let jsonText = textContent.text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
    }
    return expandCompactMenu(compactMenuSchema.parse(JSON.parse(jsonText) as unknown));
  };

  if (getOcrProvider() === 'google-vision') {
    const ocrText = await extractDocumentText(images);
    return requestRegion('from the supplied OCR text', ocrText);
  }
  if (images.length === 1) {
    const [left, right] = await Promise.all([
      requestRegion('whose item name begins in the left half of the image'),
      requestRegion('whose item name begins in the right half of the image'),
    ]);
    return mergeExtractedMenus([left, right]);
  }
  return requestRegion('from all supplied images');
}

export interface TranslatableDish {
  name: string;
  category: string;
}

/**
 * Translate dish names and categories into any target language using Claude Opus 4.8.
 * Returns an array in the same order and of the same length as the input.
 */
export async function translateDishes(
  dishes: TranslatableDish[],
  targetLanguage: string
): Promise<TranslatableDish[]> {
  const response = await getClient().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: `Translate this restaurant menu into ${targetLanguage}.

Input (JSON array of menu items):
${JSON.stringify(dishes)}

Rules:
- Return ONLY a JSON array with the SAME length and order as the input
- Each object must have "name" and "category" translated into ${targetLanguage}
- Keep proper nouns and brand names (e.g. "Coca-Cola", "Mojito") recognizable — translate descriptive parts only
- Use the natural culinary vocabulary of ${targetLanguage}, not literal word-for-word translation
- Translate identical categories consistently
- Return valid JSON only, no explanation or markdown`,
      },
    ],
  });

  const textContent = response.content.find((block) => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  let jsonText = textContent.text.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
  }

  const translated = JSON.parse(jsonText) as TranslatableDish[];
  if (!Array.isArray(translated) || translated.length !== dishes.length) {
    throw new Error('Translation returned an unexpected number of items');
  }

  return translated.map((item, i) => ({
    name: typeof item?.name === 'string' && item.name.trim() ? item.name.trim() : dishes[i].name,
    category:
      typeof item?.category === 'string' && item.category.trim()
        ? item.category.trim()
        : dishes[i].category,
  }));
}
