import { z } from 'zod';
import type { ExtractedMenu } from './menu.js';

const nullableText = (max: number) => z.string().trim().max(max).nullable();

export const compactMenuSchema = z.object({
  restaurantName: nullableText(120),
  menuName: nullableText(120),
  currency: nullableText(10),
  sourceLanguage: nullableText(60),
  categories: z.array(z.string().trim().min(1).max(60)).min(1).max(100),
  items: z.array(z.tuple([
    z.string().trim().min(1).max(200).describe('Exact item name'),
    nullableText(30).describe('Price exactly as printed'),
    z.number().int().nonnegative().describe('Zero-based category index'),
  ])).max(300),
});

export type CompactMenu = z.infer<typeof compactMenuSchema>;

function numericPrice(price: string | null): number | null {
  if (!price) return null;
  const parsed = Number.parseFloat(price.replace(',', '.').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function expandCompactMenu(menu: CompactMenu): ExtractedMenu {
  return {
    restaurantName: menu.restaurantName,
    menuName: menu.menuName,
    currency: menu.currency,
    sourceLanguage: menu.sourceLanguage,
    dishes: menu.items.map(([name, price, rawCategoryIndex], itemOrder) => {
      const categoryIndex = Math.min(rawCategoryIndex, menu.categories.length - 1);
      const category = menu.categories[categoryIndex] || 'Other';
      return {
        name,
        description: null,
        price,
        priceValue: numericPrice(price),
        category,
        categoryOrder: categoryIndex,
        itemOrder,
        imageSearch: `${name} ${category}`,
        ingredients: [],
        allergens: [],
        dietaryTags: [],
      };
    }),
  };
}

export function mergeExtractedMenus(menus: ExtractedMenu[]): ExtractedMenu {
  const dishes: ExtractedMenu['dishes'] = [];
  const categoryOrders = new Map<string, number>();
  const seen = new Set<string>();

  for (const menu of menus) {
    for (const dish of menu.dishes) {
      const key = `${dish.category.toLowerCase()}\u0000${dish.name.toLowerCase()}\u0000${dish.price || ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!categoryOrders.has(dish.category)) categoryOrders.set(dish.category, categoryOrders.size);
      dishes.push({
        ...dish,
        categoryOrder: categoryOrders.get(dish.category)!,
        itemOrder: dishes.length,
      });
    }
  }

  if (dishes.length === 0) throw new Error('No menu items extracted');
  const metadata = (field: keyof Omit<ExtractedMenu, 'dishes'>) =>
    menus.find(menu => menu[field])?.[field] || null;
  return {
    restaurantName: metadata('restaurantName'),
    menuName: metadata('menuName'),
    currency: metadata('currency'),
    sourceLanguage: metadata('sourceLanguage'),
    dishes,
  };
}
