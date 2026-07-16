export interface Product {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  costPrice: number;
  quantity: number;
  arrivalDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductPayload {
  name?: string;
  category?: string;
  unit?: string;
  costPrice?: number;
  quantity?: number;
  arrivalDate?: string;
}
