export interface Product {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  costPrice: number;
  /** остаток на складе */
  quantity: number;
  /** остаток в точке продажи */
  shopQty: number;
  lowStockThreshold: number;
  lowStockNotified: boolean;
  description: string | null;
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
  shopQty?: number;
  /** остатки, которые видел клиент — сервер отклонит правку, если они уже изменились */
  expectedQuantity?: number;
  expectedShopQty?: number;
  lowStockThreshold?: number;
  description?: string;
  arrivalDate?: string;
  /** data-URL для замены, '' — удалить, undefined — не менять */
  photo?: string;
}
