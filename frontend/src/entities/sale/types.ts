export type SaleType = 'WHOLESALE' | 'RETAIL';
export type PaymentMethod = 'CASH' | 'CARD';
export type SaleSource = 'WAREHOUSE' | 'POINT';

export interface Sale {
  id: string;
  productId: string | null;
  productName: string;
  unit: string;
  source: SaleSource;
  pointId: string | null;
  pointName: string | null;
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
  available: number;
}

export interface CreateSalePayload {
  source: SaleSource;
  pointId?: string;
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
  pointId?: string;
  source?: SaleSource;
  paymentMethod?: PaymentMethod;
  saleType?: SaleType;
  search?: string;
}
