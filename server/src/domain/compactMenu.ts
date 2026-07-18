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
    z.number().finite().nonnegative().nullable().describe('Numeric lowest price'),
    z.number().int().nonnegative().describe('Zero-based category index'),
    nullableText(500).describe('Exact printed description, otherwise null'),
  ])).min(1).max(300),
});

export type CompactMenu = z.infer<typeof compactMenuSchema>;

export function expandCompactMenu(menu: CompactMenu): ExtractedMenu {
  return {
    restaurantName: menu.restaurantName,
    menuName: menu.menuName,
    currency: menu.currency,
    sourceLanguage: menu.sourceLanguage,
    dishes: menu.items.map(([name, price, priceValue, rawCategoryIndex, description], itemOrder) => {
      const categoryIndex = Math.min(rawCategoryIndex, menu.categories.length - 1);
      const category = menu.categories[categoryIndex] || 'Other';
      return {
        name,
        description,
        price,
        priceValue,
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
