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
const DRINK_CATEGORIES = ['coffee', 'drinks', 'cocktails', 'beverages', 'smoothies', 'juices', 'tea', 'fruit smoothies', 'boozy', 'beer', 'wine', 'spirits'];
const COFFEE_TYPES = ['espresso', 'latte', 'cappuccino', 'americano', 'macchiato', 'mocha', 'flat white', 'cortado', 'ristretto', 'affogato', 'cold brew', 'iced coffee', 'frappe'];
const COCKTAIL_TYPES = ['mimosa', 'bloody mary', 'sangria', 'margarita', 'mojito', 'martini', 'cosmopolitan', 'daiquiri', 'piña colada', 'bellini', 'spritz', 'aperol', 'negroni', 'old fashioned', 'manhattan', 'whiskey sour', 'pisco sour', 'caipirinha', 'sazerac', 'sidecar', 'paloma', 'moscow mule', 'mai tai', 'long island', 'gin tonic', 'cuba libre', 'tequila sunrise', 'sex on the beach', 'white russian', 'black russian', 'espresso martini', 'irish coffee', 'amaretto sour', 'tom collins', 'french 75', 'mint julep', 'hurricane', 'zombie', 'planter\'s punch', 'singapore sling', 'caipiroska'];
const FRUIT_KEYWORDS = ['mango', 'raspberry', 'strawberry', 'banana', 'blueberry', 'orange', 'apple', 'peach', 'pineapple', 'coconut', 'berry', 'acai', 'kiwi', 'watermelon', 'grape', 'cherry', 'lemon', 'lime', 'passion fruit', 'papaya', 'guava', 'pomegranate', 'dragon fruit', 'lychee', 'blackberry', 'cranberry', 'grapefruit', 'tangerine', 'melon'];
const HOT_DRINKS = ['hot chocolate', 'chai', 'matcha', 'tea', 'green tea', 'black tea', 'herbal tea', 'oolong', 'earl grey', 'chamomile'];

// Beer types
const BEER_TYPES = ['ipa', 'stout', 'porter', 'pilsner', 'lager', 'ale', 'wheat beer', 'hefeweizen', 'pale ale', 'amber ale', 'belgian', 'sour beer', 'saison', 'kolsch', 'bock', 'dunkel', 'schwarzbier', 'craft beer', 'draft beer'];

// Wine types
const WINE_TYPES = ['champagne', 'prosecco', 'cava', 'sparkling wine', 'red wine', 'white wine', 'rosé', 'rose wine', 'cabernet', 'merlot', 'pinot noir', 'pinot grigio', 'chardonnay', 'sauvignon blanc', 'riesling', 'moscato', 'malbec', 'syrah', 'shiraz', 'zinfandel', 'bordeaux', 'burgundy', 'chianti', 'tempranillo', 'sangiovese'];

// Spirits/shots
const SPIRIT_TYPES = ['whiskey', 'whisky', 'bourbon', 'scotch', 'vodka', 'tequila', 'rum', 'gin', 'brandy', 'cognac', 'mezcal', 'sake', 'soju', 'grappa', 'absinthe', 'schnapps', 'liqueur', 'amaretto', 'kahlua', 'baileys', 'limoncello'];

// Dessert keywords (to prevent false matches with coffee/cocktail terms)
const DESSERT_KEYWORDS = ['cake', 'tiramisu', 'cheesecake', 'brownie', 'cookie', 'cupcake', 'pie', 'tart', 'mousse', 'pudding', 'ice cream', 'gelato', 'sorbet', 'crème brûlée', 'creme brulee', 'panna cotta', 'cannoli', 'éclair', 'eclair', 'macaron', 'profiterole', 'churro', 'donut', 'doughnut', 'pastry', 'croissant', 'muffin', 'scone', 'flan', 'baklava', 'sundae', 'parfait', 'truffle', 'soufflé', 'souffle', 'biscotti'];
const DESSERT_CATEGORIES = ['dessert', 'desserts', 'sweets', 'pastries', 'bakery', 'sweet'];

// Cuisine-specific patterns
const ASIAN_DISHES = ['pad thai', 'pho', 'ramen', 'sushi', 'sashimi', 'tempura', 'teriyaki', 'yakitori', 'udon', 'soba', 'dim sum', 'dumpling', 'gyoza', 'spring roll', 'egg roll', 'fried rice', 'lo mein', 'chow mein', 'kung pao', 'general tso', 'orange chicken', 'sweet and sour', 'miso', 'edamame', 'bibimbap', 'bulgogi', 'kimchi', 'satay', 'curry', 'tikka masala', 'butter chicken', 'naan', 'samosa', 'pakora', 'vindaloo', 'korma', 'biryani', 'tom yum', 'green curry', 'red curry', 'massaman', 'banh mi', 'bao', 'laksa', 'rendang', 'nasi goreng'];
const ITALIAN_DISHES = ['pizza', 'pasta', 'spaghetti', 'lasagna', 'lasagne', 'fettuccine', 'penne', 'ravioli', 'gnocchi', 'risotto', 'carbonara', 'bolognese', 'alfredo', 'marinara', 'pesto', 'bruschetta', 'caprese', 'carpaccio', 'arancini', 'focaccia', 'ciabatta', 'panini', 'prosciutto', 'antipasto', 'minestrone', 'osso buco', 'saltimbocca', 'piccata', 'parmigiana', 'eggplant parmesan'];
const MEXICAN_DISHES = ['taco', 'tacos', 'burrito', 'quesadilla', 'enchilada', 'fajita', 'nachos', 'guacamole', 'salsa', 'ceviche', 'tamale', 'tamales', 'tostada', 'chimichanga', 'churro', 'elote', 'carnitas', 'al pastor', 'barbacoa', 'pozole', 'mole', 'chile relleno', 'huevos rancheros', 'chilaquiles', 'torta', 'sope', 'gordita', 'flautas'];
const MEDITERRANEAN_DISHES = ['falafel', 'hummus', 'shawarma', 'kebab', 'gyro', 'souvlaki', 'tzatziki', 'baba ganoush', 'tabbouleh', 'fattoush', 'pita', 'dolma', 'moussaka', 'spanakopita', 'kibbeh', 'labneh'];
const AMERICAN_DISHES = ['burger', 'hamburger', 'cheeseburger', 'hot dog', 'buffalo wings', 'mac and cheese', 'bbq ribs', 'pulled pork', 'brisket', 'fried chicken', 'chicken wings', 'chicken tenders', 'onion rings', 'french fries', 'fries', 'coleslaw', 'corn dog', 'po boy', 'philly cheesesteak', 'sloppy joe', 'meatloaf', 'clam chowder', 'gumbo', 'jambalaya'];
const FRENCH_DISHES = ['croissant', 'baguette', 'quiche', 'ratatouille', 'coq au vin', 'beef bourguignon', 'bouillabaisse', 'cassoulet', 'confit', 'foie gras', 'escargot', 'croque monsieur', 'croque madame', 'onion soup', 'nicoise', 'tartare', 'bearnaise', 'hollandaise'];

// Protein/main ingredient keywords
const PROTEIN_KEYWORDS = ['chicken', 'beef', 'pork', 'lamb', 'steak', 'fish', 'salmon', 'tuna', 'shrimp', 'prawn', 'lobster', 'crab', 'scallop', 'oyster', 'mussel', 'clam', 'squid', 'calamari', 'octopus', 'duck', 'turkey', 'veal', 'rabbit', 'venison', 'bison', 'tofu', 'tempeh', 'seitan'];

// Seafood category keywords
const SEAFOOD_KEYWORDS = ['fish', 'salmon', 'tuna', 'cod', 'halibut', 'tilapia', 'mahi', 'swordfish', 'trout', 'bass', 'snapper', 'grouper', 'flounder', 'sole', 'mackerel', 'sardine', 'anchovy', 'shrimp', 'prawn', 'lobster', 'crab', 'scallop', 'oyster', 'mussel', 'clam', 'squid', 'calamari', 'octopus', 'ceviche', 'poke', 'sashimi', 'seafood'];

// Food category-specific search modifiers
const CATEGORY_MODIFIERS: Record<string, string> = {
  'appetizer': 'appetizer starter',
  'appetizers': 'appetizer starter',
  'starter': 'appetizer starter',
  'starters': 'appetizer starter',
  'salad': 'fresh salad bowl',
  'salads': 'fresh salad bowl',
  'soup': 'soup bowl',
  'soups': 'soup bowl',
  'seafood': 'seafood plated restaurant',
  'pasta': 'pasta dish italian',
  'sandwich': 'sandwich plated',
  'sandwiches': 'sandwich plated',
  'burger': 'burger restaurant',
  'burgers': 'burger restaurant',
  'main': 'entree plated restaurant',
  'mains': 'entree plated restaurant',
  'entree': 'entree plated restaurant',
  'entrees': 'entree plated restaurant',
  'side': 'side dish',
  'sides': 'side dish',
  'breakfast': 'breakfast plated',
  'brunch': 'brunch plated',
  'lunch': 'lunch plated',
  'dinner': 'dinner entree',
  'vegetarian': 'vegetarian dish',
  'vegan': 'vegan dish plated',
  'grill': 'grilled food plated',
  'grilled': 'grilled food plated',
};

/**
 * Check if the item is a dessert based on name and category.
 * This prevents false matches where "Espresso Tiramisu" would search for coffee.
 */
function isDessert(name: string, category?: string): boolean {
  const lowerName = name.toLowerCase();
  const lowerCategory = category?.toLowerCase() || '';

  // Check if category is dessert-related
  if (DESSERT_CATEGORIES.some(cat => lowerCategory.includes(cat))) {
    return true;
  }

  // Check for dessert keywords in name
  return DESSERT_KEYWORDS.some(dessert => lowerName.includes(dessert));
}

/**
 * Find a matching cuisine-specific dish.
 */
function findCuisineDish(name: string): { dish: string; cuisine: string } | null {
  const lowerName = name.toLowerCase();

  for (const dish of ASIAN_DISHES) {
    if (lowerName.includes(dish)) {
      return { dish, cuisine: 'asian' };
    }
  }
  for (const dish of ITALIAN_DISHES) {
    if (lowerName.includes(dish)) {
      return { dish, cuisine: 'italian' };
    }
  }
  for (const dish of MEXICAN_DISHES) {
    if (lowerName.includes(dish)) {
      return { dish, cuisine: 'mexican' };
    }
  }
  for (const dish of MEDITERRANEAN_DISHES) {
    if (lowerName.includes(dish)) {
      return { dish, cuisine: 'mediterranean' };
    }
  }
  for (const dish of AMERICAN_DISHES) {
    if (lowerName.includes(dish)) {
      return { dish, cuisine: 'american' };
    }
  }
  for (const dish of FRENCH_DISHES) {
    if (lowerName.includes(dish)) {
      return { dish, cuisine: 'french' };
    }
  }

  return null;
}

/**
 * Extract the primary protein/ingredient from a dish name.
 */
function extractPrimaryIngredient(name: string): string | null {
  const lowerName = name.toLowerCase();

  // Check for seafood first (more specific)
  for (const seafood of SEAFOOD_KEYWORDS) {
    if (lowerName.includes(seafood)) {
      return seafood;
    }
  }

  // Check for other proteins
  for (const protein of PROTEIN_KEYWORDS) {
    if (lowerName.includes(protein)) {
      return protein;
    }
  }

  return null;
}

/**
 * Extract the most searchable term from a creative menu name.
 * E.g., "Mango Paradise" -> "mango smoothie", "Raspberry Love" -> "raspberry smoothie"
 */
function extractSearchableTerms(name: string, category?: string): string | null {
  const lowerName = name.toLowerCase();
  const lowerCategory = category?.toLowerCase() || '';

  // IMPORTANT: Check if this is a dessert FIRST to prevent false matches
  // E.g., "Espresso Tiramisu" should search for tiramisu, not espresso coffee
  if (isDessert(name, category)) {
    // Find the specific dessert keyword
    for (const dessert of DESSERT_KEYWORDS) {
      if (lowerName.includes(dessert)) {
        return `${dessert} dessert plated`;
      }
    }
    return `${name} dessert`;
  }

  // Check for cocktails (high priority for drinks)
  for (const cocktail of COCKTAIL_TYPES) {
    if (lowerName.includes(cocktail)) {
      return `${cocktail} cocktail drink glass`;
    }
  }

  // Check for beer types
  for (const beer of BEER_TYPES) {
    if (lowerName.includes(beer)) {
      return `${beer} beer glass`;
    }
  }

  // Check for wine types
  for (const wine of WINE_TYPES) {
    if (lowerName.includes(wine)) {
      return `${wine} wine glass`;
    }
  }

  // Check for spirits
  for (const spirit of SPIRIT_TYPES) {
    if (lowerName.includes(spirit)) {
      return `${spirit} drink glass bar`;
    }
  }

  // Check if it's in a boozy/cocktail/beer/wine category
  if (lowerCategory.includes('boozy') || lowerCategory.includes('cocktail')) {
    // Look for specific drink mentions
    if (lowerName.includes('mimosa')) return 'mimosa cocktail champagne orange';
    if (lowerName.includes('bloody mary')) return 'bloody mary cocktail tomato';
    if (lowerName.includes('sangria')) return 'sangria wine drink';
    if (lowerName.includes('bellini')) return 'bellini cocktail peach';
    // Generic cocktail for boozy items
    return `${name} cocktail drink`;
  }

  if (lowerCategory.includes('beer')) {
    return `${name} beer glass`;
  }

  if (lowerCategory.includes('wine')) {
    return `${name} wine glass`;
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

  // Check for cuisine-specific dishes
  const cuisineMatch = findCuisineDish(name);
  if (cuisineMatch) {
    return `${cuisineMatch.dish} food restaurant`;
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

  // Check for beer types
  if (BEER_TYPES.some(beer => lowerName.includes(beer))) {
    return true;
  }

  // Check for wine types
  if (WINE_TYPES.some(wine => lowerName.includes(wine))) {
    return true;
  }

  // Check for spirits
  if (SPIRIT_TYPES.some(spirit => lowerName.includes(spirit))) {
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

  // Try to find a primary ingredient for better food searches
  const primaryIngredient = extractPrimaryIngredient(name);

  // Check for category-specific modifiers
  for (const [catKey, modifier] of Object.entries(CATEGORY_MODIFIERS)) {
    if (lowerCategory.includes(catKey)) {
      if (primaryIngredient) {
        return `${primaryIngredient} ${modifier}`;
      }
      return `${name} ${modifier}`;
    }
  }

  // For food items with a known protein/ingredient, use that for better results
  if (primaryIngredient) {
    return `${primaryIngredient} dish plated restaurant`;
  }

  // For food items, just use the name with food context
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
// Fetch timeout in milliseconds
const FETCH_TIMEOUT_MS = 10000;

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

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    // Build smart search query based on item type
    const searchQuery = buildSearchQuery(dishName, category);

    const response = await fetch(
      `${PEXELS_API_URL}?query=${encodeURIComponent(searchQuery)}&per_page=1&orientation=square`,
      {
        headers: {
          Authorization: apiKey,
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429) {
        console.warn('Pexels rate limit exceeded');
      }
      // Don't cache failures - allow retry later
      return null;
    }

    const data = (await response.json()) as PexelsResponse;

    if (data.photos && data.photos.length > 0) {
      // Use medium size for good quality without being too large
      const imageUrl = data.photos[0].src.medium;

      // Only cache successful results (not null/failures)
      cacheImage(dishName, imageUrl);

      return imageUrl;
    }

    // No photos found - don't cache, different query might work later
    return null;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`Pexels API timeout for: ${dishName}`);
    } else {
      console.error('Pexels API error:', error);
    }
    // Don't cache errors - allow retry
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
