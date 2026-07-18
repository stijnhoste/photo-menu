import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { extractedMenuSchema, parseExtractedMenu, type ExtractedMenu } from '../domain/menu.js';

// Latest Claude model — used for menu extraction, translation, and the menu chat
export const CLAUDE_MODEL = 'claude-opus-4-8';

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
 * Extract dish names and prices from menu image(s) using Claude Opus 4.8.
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

  const response = await getClient().messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 16_384,
    output_config: {
      format: zodOutputFormat(extractedMenuSchema),
    },
    messages: [
      {
        role: 'user',
        content: [
          ...imageBlocks,
          {
            type: 'text',
            text: `Analyze these restaurant menu images and extract the menu identity and every item in source order.

Return ONLY one JSON object with this exact structure:
{
  "restaurantName": "Restaurant name or null",
  "menuName": "Dinner Menu or null",
  "currency": "USD or null",
  "sourceLanguage": "English or null",
  "dishes": [
    {
      "name": "Dish Name",
      "description": "Exact printed description or null",
      "price": "$12.99",
      "priceValue": 12.99,
      "category": "Main Courses",
      "categoryOrder": 2,
      "itemOrder": 8,
      "imageSearch": "grilled steak dinner plate",
      "ingredients": ["beef", "peppercorn sauce"],
      "allergens": ["milk"],
      "dietaryTags": ["gluten-free"]
    }
  ]
}

Rules:
- Extract the EXACT dish name as written on the menu
- Preserve printed descriptions; do not invent a description
- Include the price with currency symbol if visible, or null if not shown
- Set priceValue to the numeric base/lowest price without a currency symbol, or null
- Assign each item to a category based on the menu section or infer from the dish type
- Preserve source order using zero-based categoryOrder and itemOrder values
- Use these category names when applicable: "Appetizers", "Salads", "Soups", "Main Courses", "Pasta", "Pizza", "Burgers", "Sandwiches", "Seafood", "Grills", "Sides", "Desserts", "Drinks", "Cocktails", "Breakfast", "Brunch", "Kids Menu", "Specials"
- If a category doesn't fit the above, use a short descriptive name from the menu
- If a dish has multiple sizes/options, include the base name with the first/lowest price
- ingredients must contain only ingredients printed on the menu, never guessed ingredients
- allergens must contain only allergens explicitly printed or directly evidenced by printed ingredients; otherwise use []
- dietaryTags may contain only: vegetarian, vegan, gluten-free, dairy-free, nut-free, halal, kosher, spicy
- Do not infer safety-sensitive dietary tags from general culinary knowledge; use [] when uncertain
- CRITICAL: For imageSearch, describe what the item LOOKS like visually with 4-6 words. Include colors, glass types, and garnishes for drinks. Examples:
  * "Bloody Mary Jug" -> "bloody mary red tomato celery cocktail"
  * "Mimosa" -> "mimosa orange champagne flute brunch"
  * "Old Fashioned" -> "old fashioned amber whiskey orange peel"
  * "Chia Berry" -> "berry smoothie purple red glass"
  * "Pina Colada" -> "pina colada white coconut pineapple tropical"
  * "Mojito" -> "mojito green mint lime cocktail"
  * "Espresso Martini" -> "espresso martini brown coffee foam"
  * For food: "Caesar Salad" -> "caesar salad romaine parmesan croutons"
- Return valid JSON only, no explanation or markdown

Extract all items from the menu:`,
          },
        ],
      },
    ],
  });

  console.log(JSON.stringify({
    type: 'claude_extraction',
    model: response.model,
    stopReason: response.stop_reason,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  }));

  if (response.stop_reason === 'max_tokens') {
    throw new Error('Menu extraction exceeded the model output limit');
  }
  if (!response.parsed_output) {
    throw new Error('Claude returned no structured menu');
  }

  return parseExtractedMenu(response.parsed_output);
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
