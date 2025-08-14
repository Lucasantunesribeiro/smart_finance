import { api } from '@/lib/api';
import { 
  Transaction, 
  CreateTransactionRequest, 
  UpdateTransactionRequest, 
  TransactionFilter, 
  TransactionSummary,
  PagedResult 
} from '@/types/transaction';

export const transactionService = {
  async getTransactions(filter: TransactionFilter): Promise<PagedResult<Transaction>> {
    const params = new URLSearchParams();
    
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    
    const response = await api.get<PagedResult<Transaction>>(`/transactions?${params}`);
    return response.data;
  },

  async getTransaction(id: string): Promise<Transaction> {
    const response = await api.get<Transaction>(`/transactions/${id}`);
    return response.data;
  },

  async createTransaction(data: CreateTransactionRequest): Promise<Transaction> {
    try {
      console.log('=== TRANSACTION CREATION DEBUG ===');
      console.log('Request data before sending:', JSON.stringify(data, null, 2));
      console.log('Data types:', {
        amount: typeof data.amount,
        description: typeof data.description,
        type: typeof data.type,
        accountId: typeof data.accountId,
        categoryId: typeof data.categoryId,
        transactionDate: typeof data.transactionDate,
        isRecurring: typeof data.isRecurring,
        tagNames: typeof data.tagNames
      });
      console.log('Data values:', {
        amount: data.amount,
        description: data.description,
        type: data.type,
        accountId: data.accountId,
        categoryId: data.categoryId,
        transactionDate: data.transactionDate,
        isRecurring: data.isRecurring,
        tagNames: data.tagNames
      });
      
      const response = await api.post<Transaction>('/transactions', data);
      
      console.log('✅ Transaction created successfully:', response.data);
      console.log('=== END TRANSACTION DEBUG ===');
      
      return response.data;
    } catch (error: unknown) {
      console.error('=== TRANSACTION ERROR DEBUG ===');
      
      const err = error as Error & {
        status?: number;
        code?: string;
        response?: {
          status: number;
          statusText: string;
          data: unknown;
          headers: Record<string, string>;
        };
        config?: {
          url?: string;
          method?: string;
          data?: unknown;
          headers?: Record<string, string>;
        };
      };
      
      console.error('Error creating transaction:', err.message);
      console.error('Error status:', err.status);
      console.error('Error code:', err.code);
      
      if (err.response) {
        console.error('Response status:', err.response.status);
        console.error('Response statusText:', err.response.statusText);
        console.error('Response data:', err.response.data);
        console.error('Response headers:', err.response.headers);
      }
      
      if (err.config) {
        console.error('Request URL:', err.config.url);
        console.error('Request method:', err.config.method);
        console.error('Request data sent:', err.config.data);
        console.error('Request headers:', err.config.headers);
      }
      
      console.error('Full error object:', err);
      console.error('=== END TRANSACTION ERROR DEBUG ===');
      
      throw error;
    }
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
    const params = new URLSearchParams();
    
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    
    params.append('format', format);
    
    const response = await api.get(`/transactions/export?${params}`, {
      responseType: 'blob'
    });
    
    return response.data;
  }
};