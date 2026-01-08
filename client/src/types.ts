export interface Dish {
  name: string;
  price: string | null;
  imageUrl: string | null;
  category: string;
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
