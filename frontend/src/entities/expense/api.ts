import { http } from '@/shared/api/http';
import {
  CreateExpensePayload,
  Expense,
  ExpensesFilter,
  ExpensesListResponse,
} from './types';

const clean = <T extends object>(obj: T) =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  );

export const expensesApi = {
  create: (payload: CreateExpensePayload) =>
    http.post<Expense>('/expenses', payload).then((r) => r.data),
  list: (filter: ExpensesFilter) =>
    http.get<ExpensesListResponse>('/expenses', { params: clean(filter) }).then((r) => r.data),
  remove: (id: string) =>
    http.delete<{ success: boolean }>(`/expenses/${id}`).then((r) => r.data),
};
