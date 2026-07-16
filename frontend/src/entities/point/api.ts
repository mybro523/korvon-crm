import { http } from '@/shared/api/http';
import { PointStockRow, SalesPoint, TransferRecord } from './types';

export const pointsApi = {
  list: () => http.get<SalesPoint[]>('/points').then((r) => r.data),
  one: (id: string) => http.get<SalesPoint>(`/points/${id}`).then((r) => r.data),
  create: (payload: { name: string; address?: string }) =>
    http.post<SalesPoint>('/points', payload).then((r) => r.data),
  update: (id: string, payload: { name?: string; address?: string }) =>
    http.patch<SalesPoint>(`/points/${id}`, payload).then((r) => r.data),
  remove: (id: string) => http.delete(`/points/${id}`).then((r) => r.data),
  stock: (id: string) => http.get<PointStockRow[]>(`/points/${id}/stock`).then((r) => r.data),
  transfer: (id: string, productId: string, quantity: number) =>
    http.post(`/points/${id}/transfer`, { productId, quantity }).then((r) => r.data),
  returnToWarehouse: (id: string, productId: string, quantity: number) =>
    http.post(`/points/${id}/return`, { productId, quantity }).then((r) => r.data),
  transfers: (id: string) =>
    http.get<TransferRecord[]>(`/points/${id}/transfers`).then((r) => r.data),
};
