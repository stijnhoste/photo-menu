import Anthropic from '@anthropic-ai/sdk';

// Lazy initialization to ensure dotenv has loaded
let anthropic: Anthropic | null = null;

function getClient(): Anthropic {
  if (!anthropic) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropic;
}

export interface ExtractedDish {
  name: string;
  price: string | null;
  category: string;
}

/**
 * Extract dish names and prices from menu image(s) using Claude Haiku 4.5.
 *
 * @param images - Array of base64-encoded images (with or without data URL prefix)
 * @returns Array of extracted dishes with names and prices
 */
export async function extractMenuDishes(images: string[]): Promise<ExtractedDish[]> {
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

  const response = await getClient().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          ...imageBlocks,
          {
            type: 'text',
            text: `Analyze this restaurant menu image(s) and extract all items with their prices and categories.

Return ONLY a JSON array of objects with this exact format:
[
  {"name": "Dish Name", "price": "$12.99", "category": "Main Courses"},
  {"name": "Another Dish", "price": null, "category": "Appetizers"}
]

Rules:
- Extract the EXACT dish name as written on the menu
- Include the price with currency symbol if visible, or null if not shown
- Assign each item to a category based on the menu section or infer from the dish type
- Use these category names when applicable: "Appetizers", "Salads", "Soups", "Main Courses", "Pasta", "Pizza", "Burgers", "Sandwiches", "Seafood", "Grills", "Sides", "Desserts", "Drinks", "Cocktails", "Breakfast", "Brunch", "Kids Menu", "Specials"
- If a category doesn't fit the above, use a short descriptive name from the menu
- If a dish has multiple sizes/options, include the base name with the first/lowest price
- Return valid JSON only, no explanation or markdown

Extract all items from the menu:`,
          },
        ],
      },
    ],
  });

  // Extract text content from response
  const textContent = response.content.find((block) => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  // Parse JSON response
  try {
    // Handle potential markdown code blocks in response
    let jsonText = textContent.text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
    }

    const dishes = JSON.parse(jsonText) as ExtractedDish[];

    // Validate and clean the response
    return dishes.filter(
      (dish) => dish && typeof dish.name === 'string' && dish.name.trim().length > 0
    ).map((dish) => ({
      name: dish.name.trim(),
      price: dish.price ? String(dish.price).trim() : null,
      category: dish.category?.trim() || 'Other',
    }));
  } catch (error) {
    console.error('Failed to parse Claude response:', textContent.text);
    throw new Error('Failed to parse menu extraction response');
  }
}
