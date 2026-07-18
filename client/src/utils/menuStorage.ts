import type { Dish, Menu, MenuMetadata } from '../types';

const STORAGE_KEY = 'savedMenusV2';
const LEGACY_KEY = 'savedMenus';
const MAX_SAVED_MENUS = 50;

function normalizeDish(value: unknown, index: number): Dish | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<Dish>;
  if (typeof raw.name !== 'string' || !raw.name.trim()) return null;
  return {
    id: typeof raw.id === 'string' ? raw.id : crypto.randomUUID(),
    name: raw.name.trim(),
    description: typeof raw.description === 'string' ? raw.description : null,
    price: typeof raw.price === 'string' ? raw.price : null,
    priceValue: typeof raw.priceValue === 'number' ? raw.priceValue : null,
    imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : null,
    imageIsRepresentative: raw.imageIsRepresentative !== false,
    category: typeof raw.category === 'string' ? raw.category : 'Other',
    categoryOrder: typeof raw.categoryOrder === 'number' ? raw.categoryOrder : 0,
    itemOrder: typeof raw.itemOrder === 'number' ? raw.itemOrder : index,
    ingredients: Array.isArray(raw.ingredients) ? raw.ingredients.filter((item): item is string => typeof item === 'string') : [],
    allergens: Array.isArray(raw.allergens) ? raw.allergens.filter((item): item is string => typeof item === 'string') : [],
    dietaryTags: Array.isArray(raw.dietaryTags) ? raw.dietaryTags : []
  };
}

function normalizeMenu(value: unknown): Menu | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<Menu>;
  if (!Array.isArray(raw.dishes)) return null;
  const dishes = raw.dishes.map(normalizeDish).filter((dish): dish is Dish => dish !== null);
  if (dishes.length === 0) return null;
  const createdAt = typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString();
  return {
    version: 2,
    id: typeof raw.id === 'string' ? raw.id : crypto.randomUUID(),
    restaurantName: typeof raw.restaurantName === 'string' ? raw.restaurantName : null,
    menuName: typeof raw.menuName === 'string' ? raw.menuName : null,
    currency: typeof raw.currency === 'string' ? raw.currency : null,
    sourceLanguage: typeof raw.sourceLanguage === 'string' ? raw.sourceLanguage : null,
    dishes,
    createdAt,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : createdAt,
    expiresAt: typeof raw.expiresAt === 'string' ? raw.expiresAt : undefined
  };
}

function parseStored(raw: string | null): Menu[] {
  if (!raw) return [];
  try {
    const values = JSON.parse(raw) as unknown;
    return Array.isArray(values)
      ? values.map(normalizeMenu).filter((menu): menu is Menu => menu !== null)
      : [];
  } catch {
    return [];
  }
}

export function loadMenus(): Menu[] {
  const current = parseStored(localStorage.getItem(STORAGE_KEY));
  if (current.length > 0) return current;

  const legacy = parseStored(localStorage.getItem(LEGACY_KEY));
  if (legacy.length > 0) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
    localStorage.removeItem(LEGACY_KEY);
  }
  return legacy;
}

export function saveMenu(menu: Menu): Menu[] {
  const menus = loadMenus().filter(existing => existing.id !== menu.id);
  const updated = [{ ...menu, updatedAt: new Date().toISOString() }, ...menus].slice(0, MAX_SAVED_MENUS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function deleteMenu(id: string): Menu[] {
  const updated = loadMenus().filter(menu => menu.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function createMenu(
  metadata: MenuMetadata,
  dishes: Dish[],
  id: string = crypto.randomUUID()
): Menu {
  const now = new Date().toISOString();
  return { version: 2, id, ...metadata, dishes, createdAt: now, updatedAt: now };
}
