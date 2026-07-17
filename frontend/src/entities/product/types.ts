export interface Product {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  costPrice: number;
  quantity: number;
  arrivalDate: string;
  hasPhoto: boolean;
  photoRev: number;
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
  /** data-URL для замены, '' — удалить, undefined — не менять */
  photo?: string;
}
