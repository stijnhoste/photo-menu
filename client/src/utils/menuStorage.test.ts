// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { createMenu, deleteMenu, loadMenus, saveMenu } from './menuStorage';
import type { Dish } from '../types';

const dish: Dish = {
  id: '9a0ff07a-4e02-4a77-9777-79886f1d3560', name: 'Soup', description: null,
  price: '$8', priceValue: 8, imageUrl: null, imageIsRepresentative: true,
  category: 'Soups', categoryOrder: 0, itemOrder: 0, ingredients: [], allergens: [], dietaryTags: []
};

beforeEach(() => localStorage.clear());

describe('menu storage', () => {
  it('saves, replaces, and deletes versioned menus', () => {
    const menu = createMenu({ restaurantName: 'Bistro', menuName: 'Lunch', currency: 'USD', sourceLanguage: 'English' }, [dish]);
    expect(saveMenu(menu)).toHaveLength(1);
    expect(saveMenu({ ...menu, menuName: 'Brunch' })).toHaveLength(1);
    expect(loadMenus()[0].menuName).toBe('Brunch');
    expect(deleteMenu(menu.id)).toEqual([]);
  });

  it('migrates legacy dish-only saved menus', () => {
    localStorage.setItem('savedMenus', JSON.stringify([{ id: 'legacy', createdAt: '2026-01-01T00:00:00.000Z', dishes: [{ name: 'Tea', price: '$3', imageUrl: null }] }]));
    const [menu] = loadMenus();
    expect(menu.version).toBe(2);
    expect(menu.dishes[0]).toMatchObject({ name: 'Tea', category: 'Other', dietaryTags: [] });
    expect(localStorage.getItem('savedMenus')).toBeNull();
  });
});
