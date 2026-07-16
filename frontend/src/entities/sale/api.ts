import { http } from '@/shared/api/http';
import {
  AvailableProduct,
  CreateSalePayload,
  Sale,
  SalesFilter,
  SalesListResponse,
} from './types';

const clean = <T extends object>(obj: T) =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  );

export const salesApi = {
  create: (payload: CreateSalePayload) =>
    http.post<Sale>('/sales', payload).then((r) => r.data),
  list: (filter: SalesFilter) =>
    http.get<SalesListResponse>('/sales', { params: clean(filter) }).then((r) => r.data),
  availableProducts: (source?: string, pointId?: string) =>
    http
      .get<AvailableProduct[]>('/sales/available-products', {
        params: clean({ source, pointId }),
      })
      .then((r) => r.data),
};
