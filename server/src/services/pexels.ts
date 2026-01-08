import { getCachedImage, cacheImage } from './imageCache.js';

const PEXELS_API_URL = 'https://api.pexels.com/v1/search';

interface PexelsPhoto {
  id: number;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
  };
  alt: string;
}

interface PexelsResponse {
  photos: PexelsPhoto[];
  total_results: number;
}

// Drink-related categories and keywords
const DRINK_CATEGORIES = ['coffee', 'drinks', 'cocktails', 'beverages', 'smoothies', 'juices', 'tea', 'fruit smoothies', 'boozy'];
const COFFEE_TYPES = ['espresso', 'latte', 'cappuccino', 'americano', 'macchiato', 'mocha', 'flat white', 'cortado'];
const COCKTAIL_TYPES = ['mimosa', 'bloody mary', 'sangria', 'margarita', 'mojito', 'martini', 'cosmopolitan', 'daiquiri', 'piña colada', 'bellini', 'spritz', 'aperol', 'negroni', 'old fashioned', 'manhattan', 'whiskey sour'];
const FRUIT_KEYWORDS = ['mango', 'raspberry', 'strawberry', 'banana', 'blueberry', 'orange', 'apple', 'peach', 'pineapple', 'coconut', 'berry', 'acai', 'kiwi', 'watermelon', 'grape', 'cherry', 'lemon', 'lime', 'passion fruit', 'papaya', 'guava'];
const HOT_DRINKS = ['hot chocolate', 'chai', 'matcha', 'tea'];

/**
 * Extract the most searchable term from a creative menu name.
 * E.g., "Mango Paradise" -> "mango smoothie", "Raspberry Love" -> "raspberry smoothie"
 */
function extractSearchableTerms(name: string, category?: string): string | null {
  const lowerName = name.toLowerCase();
  const lowerCategory = category?.toLowerCase() || '';

  // Check for cocktails first (high priority)
  for (const cocktail of COCKTAIL_TYPES) {
    if (lowerName.includes(cocktail)) {
      return `${cocktail} cocktail drink glass`;
    }
  }

  // Check if it's in a boozy/cocktail category
  if (lowerCategory.includes('boozy') || lowerCategory.includes('cocktail')) {
    // Look for specific drink mentions
    if (lowerName.includes('mimosa')) return 'mimosa cocktail champagne orange';
    if (lowerName.includes('bloody mary')) return 'bloody mary cocktail tomato';
    if (lowerName.includes('sangria')) return 'sangria wine drink';
    if (lowerName.includes('bellini')) return 'bellini cocktail peach';
    // Generic cocktail for boozy items
    return `${name} cocktail drink`;
  }

  // Check for fruit ingredients in smoothie/juice categories
  if (lowerCategory.includes('smoothie') || lowerCategory.includes('juice') || lowerCategory.includes('fruit')) {
    for (const fruit of FRUIT_KEYWORDS) {
      if (lowerName.includes(fruit)) {
        return `${fruit} smoothie drink`;
      }
    }
    // If category is smoothie but no fruit found, just search for smoothie
    return 'fruit smoothie drink';
  }

  // Check for coffee types
  for (const coffee of COFFEE_TYPES) {
    if (lowerName.includes(coffee)) {
      return `${coffee} coffee cup`;
    }
  }

  // Check for hot drinks
  for (const drink of HOT_DRINKS) {
    if (lowerName.includes(drink)) {
      return `${drink} cup drink`;
    }
  }

  // Check for fruits in any context (might be a smoothie)
  for (const fruit of FRUIT_KEYWORDS) {
    if (lowerName.includes(fruit)) {
      if (lowerCategory.includes('drink') || lowerCategory.includes('beverage')) {
        return `${fruit} drink beverage`;
      }
    }
  }

  return null;
}

/**
 * Determine if an item is a drink based on name and category.
 */
function isDrink(name: string, category?: string): boolean {
  const lowerName = name.toLowerCase();
  const lowerCategory = category?.toLowerCase() || '';

  // Check if category is drink-related
  if (DRINK_CATEGORIES.some(cat => lowerCategory.includes(cat))) {
    return true;
  }

  // Check for cocktail types
  if (COCKTAIL_TYPES.some(cocktail => lowerName.includes(cocktail))) {
    return true;
  }

  // Check for coffee types
  if (COFFEE_TYPES.some(coffee => lowerName.includes(coffee))) {
    return true;
  }

  // Check for hot drinks
  if (HOT_DRINKS.some(drink => lowerName.includes(drink))) {
    return true;
  }

  return false;
}

/**
 * Build a smart search query based on item type.
 */
function buildSearchQuery(name: string, category?: string): string {
  // First try to extract specific searchable terms
  const extracted = extractSearchableTerms(name, category);
  if (extracted) {
    return extracted;
  }

  const lowerName = name.toLowerCase();
  const lowerCategory = category?.toLowerCase() || '';

  // For coffee category, search for the specific drink type
  if (lowerCategory.includes('coffee')) {
    // If it's a simple coffee name, search directly
    for (const coffee of COFFEE_TYPES) {
      if (lowerName.includes(coffee)) {
        return `${coffee} coffee cup`;
      }
    }
    // Generic coffee search
    return `coffee drink cup`;
  }

  // For other drinks
  if (isDrink(name, category)) {
    return `${name} drink cup`;
  }

  // For food items, just use the name (simpler is often better)
  return `${name} food plated`;
}

/**
 * Search for a food/drink image on Pexels.
 * Uses caching to avoid redundant API calls for common items.
 *
 * @param dishName - The name of the dish to search for
 * @param category - Optional category to improve search accuracy
 * @returns URL of the image or null if not found
 */
export async function searchDishImage(dishName: string, category?: string): Promise<string | null> {
  // Check cache first
  const cached = getCachedImage(dishName);
  if (cached) {
    return cached;
  }

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.error('PEXELS_API_KEY not configured');
    return null;
  }

  try {
    // Build smart search query based on item type
    const searchQuery = buildSearchQuery(dishName, category);

    const response = await fetch(
      `${PEXELS_API_URL}?query=${encodeURIComponent(searchQuery)}&per_page=1&orientation=square`,
      {
        headers: {
          Authorization: apiKey,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        console.warn('Pexels rate limit exceeded');
      }
      return null;
    }

    const data = (await response.json()) as PexelsResponse;

    if (data.photos && data.photos.length > 0) {
      // Use medium size for good quality without being too large
      const imageUrl = data.photos[0].src.medium;

      // Cache the result
      cacheImage(dishName, imageUrl);

      return imageUrl;
    }

    return null;
  } catch (error) {
    console.error('Pexels API error:', error);
    return null;
  }
}

/**
 * Search for multiple dish images in parallel.
 * Respects rate limits by batching requests.
 *
 * @param dishNames - Array of dish names to search for
 * @returns Map of dish name to image URL
 */
export async function searchMultipleDishImages(
  dishNames: string[]
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();

  // Process in parallel but with a reasonable concurrency limit
  const BATCH_SIZE = 5;

  for (let i = 0; i < dishNames.length; i += BATCH_SIZE) {
    const batch = dishNames.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (name) => {
      const url = await searchDishImage(name);
      results.set(name, url);
    });

    await Promise.all(promises);
  }

  return results;
}
