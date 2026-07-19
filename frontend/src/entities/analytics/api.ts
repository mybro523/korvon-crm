import { http } from '@/shared/api/http';

export interface AnalyticsSummary {
  salesCount: number;
  totalAmount: number;
  cashAmount: number;
  cardAmount: number;
  cashCount: number;
  cardCount: number;
  itemsSold: number;
  wholesaleAmount: number;
  retailAmount: number;
  wholesaleCount: number;
  retailCount: number;
  totalProfit: number;
}

export interface DailyPoint {
  date: string;
  count: number;
  amount: number;
}

export interface TopProduct {
  name: string;
  unit: string;
  quantity: number;
  amount: number;
  profit: number;
  count: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  category: string | null;
  warehouseQty: number;
  shopQty: number;
  warehouseValue: number;
  shopValue: number;
  totalValue: number;
}

export interface InventoryStats {
  productsCount: number;
  warehouseUnits: number;
  shopUnits: number;
  totalUnits: number;
  inventoryCost: number;
  warehouseCost: number;
  shopCost: number;
  lowStockCount: number;
  outOfStockCount: number;
  /** полная разбивка по товарам (до 300) — для кликабельных тайлов */
  items: InventoryItem[];
  /** штучные остатки по каждой единице измерения (кг и дона складывать нельзя) */
  unitsBreakdown: { unit: string; warehouse: number; shop: number }[];
  topByValue: { name: string; unit: string; units: number; value: number }[];
  lowStockItems: {
    id: string;
    name: string;
    unit: string;
    shopQty: number;
    warehouseQty: number;
    threshold: number;
  }[];
  outOfStockItems: { id: string; name: string; unit: string }[];
}

export interface AnalyticsParams {
  from: string;
  to: string;
  tz?: string;
  limit?: number;
}

export const analyticsApi = {
  summary: (params: AnalyticsParams) =>
    http.get<AnalyticsSummary>('/analytics/summary', { params }).then((r) => r.data),
  daily: (params: AnalyticsParams) =>
    http.get<DailyPoint[]>('/analytics/daily', { params }).then((r) => r.data),
  topProducts: (params: AnalyticsParams) =>
    http.get<TopProduct[]>('/analytics/top-products', { params }).then((r) => r.data),
  inventory: () => http.get<InventoryStats>('/analytics/inventory').then((r) => r.data),
};
