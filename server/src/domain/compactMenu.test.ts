import { describe, expect, it } from 'vitest';
import { compactMenuSchema, expandCompactMenu } from './compactMenu.js';

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
});
