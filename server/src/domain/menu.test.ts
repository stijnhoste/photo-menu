import { describe, expect, it } from 'vitest';
import {
  dietaryTagSchema,
  extractedDishSchema,
  menuDocumentSchema,
  parseExtractedMenu
} from './menu.js';

describe('menu contracts', () => {
  it('normalizes optional enriched extraction fields', () => {
    const dish = extractedDishSchema.parse({
      name: '  Mushroom Risotto  ',
      category: 'Main Courses',
      imageSearch: 'creamy mushroom risotto plate'
    });

    expect(dish).toMatchObject({
      name: 'Mushroom Risotto',
      description: null,
      price: null,
      priceValue: null,
      ingredients: [],
      allergens: [],
      dietaryTags: []
    });
  });

  it('rejects unsupported dietary claims', () => {
    expect(dietaryTagSchema.safeParse('healthy').success).toBe(false);
  });

  it('rejects malformed persisted menus', () => {
    const result = menuDocumentSchema.safeParse({
      version: 2,
      id: 'not-an-id',
      createdAt: 'yesterday',
      updatedAt: 'today',
      restaurantName: null,
      menuName: null,
      currency: null,
      sourceLanguage: null,
      dishes: []
    });

    expect(result.success).toBe(false);
  });

  it('normalizes harmless AI response variations without weakening the schema', () => {
    const menu = parseExtractedMenu([{ name: 'Soup', priceValue: '$12,50', category: '', dietaryTags: ['Vegan', 'healthy'] }]);
    expect(menu.dishes[0]).toMatchObject({
      name: 'Soup', priceValue: 12.5, category: 'Other', itemOrder: 0,
      imageSearch: 'Soup plated dish', dietaryTags: ['vegan']
    });
  });
});
