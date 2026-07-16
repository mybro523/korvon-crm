export interface SalesPoint {
  id: string;
  name: string;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  stockItems?: number;
}

export interface PointStockRow {
  productId: string;
  name: string;
  category: string | null;
  unit: string;
  quantity: number;
  costPrice?: number;
}

export interface TransferRecord {
  id: string;
  productId: string | null;
  productName: string;
  unit: string;
  pointId: string;
  direction: 'TO_POINT' | 'TO_WAREHOUSE';
  quantity: number;
  userName: string;
  createdAt: string;
}
