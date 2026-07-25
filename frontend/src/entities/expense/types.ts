export interface Expense {
  id: string;
  amount: number;
  comment: string;
  createdById: string | null;
  createdByName: string;
  createdAt: string;
}

export interface CreateExpensePayload {
  amount: number;
  comment: string;
}

export interface ExpensesFilter {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  search?: string;
}

export interface ExpensesListResponse {
  items: Expense[];
  total: number;
  page: number;
  limit: number;
  totalAmount: number;
}
