export enum CategoryType {
  Income = 0,
  Expense = 1,
  Transfer = 2,
  Investment = 3,
  Other = 4,
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  description?: string;
  color: string;
  icon?: string;
  parentId?: string;
  parentName?: string;
  isActive: boolean;
  transactionCount: number;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  color: string;
  icon?: string;
  parentId?: string;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  parentId?: string;
  isActive?: boolean;
}

export interface CategorySummary {
  totalCategories: number;
  activeCategories: number;
  inactiveCategories: number;
  topCategory: string;
}

export interface CategoryFilter {
  isActive?: boolean;
  parentId?: string;
  search?: string;
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: string;
  includeInactive?: boolean;
}

export interface CategorySpending {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
  color: string;
  transactionCount: number;
} 