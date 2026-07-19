import { http } from '@/shared/api/http';
import { Product, ProductPayload } from './types';

export const productsApi = {
  list: (search?: string, category?: string) =>
    http
      .get<Product[]>('/products', { params: { search: search || undefined, category: category || undefined } })
      .then((r) => r.data),
  categories: () => http.get<string[]>('/products/categories').then((r) => r.data),
  create: (payload: ProductPayload) =>
    http.post<Product>('/products', payload).then((r) => r.data),
  update: (id: string, payload: ProductPayload) =>
    http.patch<Product>(`/products/${id}`, payload).then((r) => r.data),
  remove: (id: string) => http.delete(`/products/${id}`).then((r) => r.data),
  /** перенос со склада в точку продажи */
  transfer: (id: string, quantity: number) =>
    http.post<Product>(`/products/${id}/transfer`, { quantity }).then((r) => r.data),
};
