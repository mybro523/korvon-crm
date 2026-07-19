export type SaleType = 'WHOLESALE' | 'RETAIL';
export type PaymentMethod = 'CASH' | 'CARD';

export interface Sale {
  id: string;
  productId: string | null;
  productName: string;
  unit: string;
  sellerId: string | null;
  sellerName: string;
  saleType: SaleType;
  paymentMethod: PaymentMethod;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  createdAt: string;
}

export interface SalesListResponse {
  items: Sale[];
  total: number;
  page: number;
  limit: number;
  totalAmount: number;
}

export interface AvailableProduct {
  productId: string;
  name: string;
  category: string | null;
  unit: string;
  /** остаток в точке продажи */
  available: number;
  /** остаток на складе (для подсказки) */
  warehouseQty: number;
  sellPrice: number;
  hasPhoto: boolean;
  photoRev: number;
}

export interface CreateSalePayload {
  productId: string;
  saleType: SaleType;
  paymentMethod: PaymentMethod;
  quantity: number;
  totalAmount?: number;
  unitPrice?: number;
}

export interface SalesFilter {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  sellerId?: string;
  paymentMethod?: PaymentMethod;
  saleType?: SaleType;
  search?: string;
  productName?: string;
}
