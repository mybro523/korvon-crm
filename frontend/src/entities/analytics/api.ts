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
  count: number;
}

export interface PointStat {
  source: string;
  pointId: string | null;
  name: string;
  count: number;
  amount: number;
  items: number;
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
  byPoints: (params: AnalyticsParams) =>
    http.get<PointStat[]>('/analytics/by-points', { params }).then((r) => r.data),
};
