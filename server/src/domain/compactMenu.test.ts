import { describe, expect, it } from 'vitest';
import { compactMenuSchema, expandCompactMenu, mergeExtractedMenus } from './compactMenu.js';

describe('compact menu extraction', () => {
  it('expands compact tuples into ordered menu dishes', () => {
    const compact = compactMenuSchema.parse({
      restaurantName: 'Chinor', menuName: 'Bar Menu', currency: 'TJS', sourceLanguage: 'Russian',
      categories: ['Coffee', 'Tea'],
      items: [
        ['Americano', '18c', 0],
        ['Black tea', '25c', 1],
      ],
    });

    const menu = expandCompactMenu(compact);
    expect(menu.dishes).toMatchObject([
      { name: 'Americano', category: 'Coffee', categoryOrder: 0, itemOrder: 0, ingredients: [] },
      { name: 'Black tea', category: 'Tea', categoryOrder: 1, itemOrder: 1, allergens: [] },
    ]);
  });

  it('clamps an invalid category index instead of failing the scan', () => {
    const compact = compactMenuSchema.parse({
      restaurantName: null, menuName: null, currency: null, sourceLanguage: null,
      categories: ['Other'], items: [['Water', null, 4]],
    });
    expect(expandCompactMenu(compact).dishes[0].category).toBe('Other');
  });

  it('merges parallel regions in order and removes overlap', () => {
    const left = expandCompactMenu(compactMenuSchema.parse({
      restaurantName: 'Chinor', menuName: null, currency: null, sourceLanguage: 'Russian',
      categories: ['Coffee'], items: [['Americano', '18c', 0]],
    }));
    const right = expandCompactMenu(compactMenuSchema.parse({
      restaurantName: null, menuName: 'Bar Menu', currency: 'TJS', sourceLanguage: null,
      categories: ['Coffee', 'Tea'], items: [['Americano', '18c', 0], ['Black tea', '25c', 1]],
    }));

    const merged = mergeExtractedMenus([left, right]);
    expect(merged).toMatchObject({ restaurantName: 'Chinor', menuName: 'Bar Menu', currency: 'TJS' });
    expect(merged.dishes).toMatchObject([
      { name: 'Americano', itemOrder: 0, categoryOrder: 0 },
      { name: 'Black tea', itemOrder: 1, categoryOrder: 1 },
    ]);
  });
});
