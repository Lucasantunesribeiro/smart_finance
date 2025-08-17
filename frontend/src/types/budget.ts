export interface Budget {
  id: string;
  name: string;
  description?: string;
  allocated: number;
  spent: number;
  remaining: number;
  percentage: number;
  categoryId?: string;
  categoryName?: string;
  period: BudgetPeriod;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export enum BudgetPeriod {
  Weekly = 0,
  Monthly = 1,
  Quarterly = 2,
  Yearly = 3,
}

export interface CreateBudgetRequest {
  name: string;
  description?: string;
  allocated: number;
  categoryId?: string;
  period: BudgetPeriod;
  startDate: string;
  endDate: string;
}

export interface UpdateBudgetRequest {
  name?: string;
  description?: string;
  allocated?: number;
  categoryId?: string;
  period?: BudgetPeriod;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface BudgetSummary {
  totalBudgets: number;
  totalAllocated: number;
  totalSpent: number;
  totalRemaining: number;
  overBudgetCount: number;
  onTrackCount: number;
}

export interface BudgetFilter {
  period?: BudgetPeriod;
  isActive?: boolean;
  categoryId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: string;
} 