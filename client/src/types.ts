export interface Dish {
  name: string;
  price: string | null;
  imageUrl: string | null;
  category: string;
  /** Set when the menu is being viewed in translation */
  originalName?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface Menu {
  id: string;
  dishes: Dish[];
  createdAt: string;
  expiresAt?: string;
}

export interface ScanResponse {
  dishes: Dish[];
}

export interface ShareResponse {
  shareId: string;
  expiresAt: string;
}
