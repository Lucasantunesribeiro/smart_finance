import { api } from '@/lib/api';
import { 
  Budget, 
  CreateBudgetRequest, 
  UpdateBudgetRequest, 
  BudgetFilter, 
  BudgetSummary
} from '@/types/budget';
import { PagedResult } from '@/types/transaction';

export const budgetService = {
  async getBudgets(filter: BudgetFilter): Promise<PagedResult<Budget>> {
    const params = new URLSearchParams();
    
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    
    const response = await api.get<PagedResult<Budget>>(`/budgets?${params}`);
    return response.data;
  },

  async getBudget(id: string): Promise<Budget> {
    const response = await api.get<Budget>(`/budgets/${id}`);
    return response.data;
  },

  async createBudget(data: CreateBudgetRequest): Promise<Budget> {
    const response = await api.post<Budget>('/budgets', data);
    return response.data;
  },

  async updateBudget(id: string, data: UpdateBudgetRequest): Promise<Budget> {
    const response = await api.put<Budget>(`/budgets/${id}`, data);
    return response.data;
  },

  async deleteBudget(id: string): Promise<void> {
    await api.delete(`/budgets/${id}`);
  },

  async getBudgetSummary(fromDate?: string, toDate?: string): Promise<BudgetSummary> {
    const params = new URLSearchParams();
    
    if (fromDate) params.append('fromDate', fromDate);
    if (toDate) params.append('toDate', toDate);
    
    const response = await api.get<BudgetSummary>(`/budgets/summary?${params}`);
    return response.data;
  },

  async getBudgetProgress(id: string): Promise<Budget> {
    const response = await api.get<Budget>(`/budgets/${id}/progress`);
    return response.data;
  },

}; 