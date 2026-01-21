import { api } from '@/lib/api';
import { Category, CategoryType } from '@/types/category';

export interface CategoryFilter {
  page?: number;
  pageSize?: number;
  isActive?: boolean;
  type?: CategoryType;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  includeInactive?: boolean;
}

export interface PagedCategoryResult {
  items: Category[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateCategoryDto {
  name: string;
  type: CategoryType;
  description?: string;
  color?: string;
  icon?: string;
  parentCategoryId?: string;
}

export interface UpdateCategoryDto {
  name?: string;
  type?: CategoryType;
  description?: string;
  color?: string;
  icon?: string;
  parentCategoryId?: string;
  isActive?: boolean;
}

export const categoryService = {
  async getCategories(filter?: CategoryFilter): Promise<PagedCategoryResult> {
    const params = new URLSearchParams();
    
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    const response = await api.get<PagedCategoryResult>(`/categories?${params}`);
    return response.data;
  },

  async getCategoryById(id: string): Promise<Category> {
    const response = await api.get<Category>(`/categories/${id}`);
    return response.data;
  },

  async createCategory(category: CreateCategoryDto): Promise<Category> {
    const response = await api.post<Category>('/categories', category);
    return response.data;
  },

  async updateCategory(id: string, category: UpdateCategoryDto): Promise<Category> {
    const response = await api.put<Category>(`/categories/${id}`, category);
    return response.data;
  },

  async deleteCategory(id: string, force?: boolean): Promise<void> {
    const params = force ? '?force=true' : '';
    await api.delete(`/categories/${id}${params}`);
  },

  async getActiveCategories(type?: CategoryType): Promise<Category[]> {
    const params = new URLSearchParams();
    params.append('isActive', 'true');
    params.append('pageSize', '100');
    
    if (type !== undefined) {
      params.append('type', type.toString());
    }

    const response = await api.get<PagedCategoryResult>(`/categories?${params}`);
    return response.data.items;
  },

  async getCategoryStats(categoryId: string): Promise<{
    totalTransactions: number;
    totalAmount: number;
    averageAmount: number;
    lastTransaction: string;
  }> {
    const response = await api.get(`/categories/${categoryId}/stats`);
    return response.data;
  }
}; 