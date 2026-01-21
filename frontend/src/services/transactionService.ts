import { api } from '@/lib/api';
import {
  Transaction,
  CreateTransactionRequest,
  UpdateTransactionRequest,
  TransactionFilter,
  TransactionSummary,
  PagedResult,
} from '@/types/transaction';

const buildParams = (filter: Record<string, unknown>) => {
  const params = new URLSearchParams();
  Object.entries(filter).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value.toString());
    }
  });
  return params;
};

export const transactionService = {
  async getTransactions(filter: TransactionFilter): Promise<PagedResult<Transaction>> {
    const params = buildParams(filter);
    const response = await api.get<PagedResult<Transaction>>(`/transactions?${params}`);
    return response.data;
  },

  async getTransaction(id: string): Promise<Transaction> {
    const response = await api.get<Transaction>(`/transactions/${id}`);
    return response.data;
  },

  async createTransaction(data: CreateTransactionRequest): Promise<Transaction> {
    const response = await api.post<Transaction>('/transactions', data);
    return response.data;
  },

  async updateTransaction(id: string, data: UpdateTransactionRequest): Promise<Transaction> {
    const response = await api.put<Transaction>(`/transactions/${id}`, data);
    return response.data;
  },

  async deleteTransaction(id: string): Promise<void> {
    await api.delete(`/transactions/${id}`);
  },

  async getTransactionSummary(fromDate?: string, toDate?: string): Promise<TransactionSummary> {
    const params = new URLSearchParams();
    if (fromDate) params.append('fromDate', fromDate);
    if (toDate) params.append('toDate', toDate);

    const response = await api.get<TransactionSummary>(`/transactions/summary?${params}`);
    return response.data;
  },

  async exportTransactions(filter: TransactionFilter, format: 'csv' | 'pdf' | 'excel'): Promise<Blob> {
    const params = buildParams(filter);
    params.append('format', format);
    const response = await api.get(`/transactions/export?${params}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
