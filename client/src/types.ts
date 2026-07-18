export interface Dish {
  id: string;
  name: string;
  description: string | null;
  price: string | null;
  priceValue: number | null;
  imageUrl: string | null;
  imageIsRepresentative: boolean;
  category: string;
  categoryOrder: number;
  itemOrder: number;
  ingredients: string[];
  allergens: string[];
  dietaryTags: DietaryTag[];
  /** Set when the menu is being viewed in translation */
  originalName?: string;
}

export type DietaryTag =
  | 'vegetarian'
  | 'vegan'
  | 'gluten-free'
  | 'dairy-free'
  | 'nut-free'
  | 'halal'
  | 'kosher'
  | 'spicy';

export interface MenuMetadata {
  restaurantName: string | null;
  menuName: string | null;
  currency: string | null;
  sourceLanguage: string | null;
}

export interface ScanProgress {
  phase: 'extraction' | 'images' | 'complete';
  completed: number;
  total: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface Menu {
  version: 2;
  id: string;
  restaurantName: string | null;
  menuName: string | null;
  currency: string | null;
  sourceLanguage: string | null;
  dishes: Dish[];
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface ScanResponse {
  dishes: Dish[];
}

export interface ShareResponse {
  shareId: string;
  expiresAt: string;
}
