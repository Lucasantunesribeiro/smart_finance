import { api } from '@/lib/api';
import { Account, AccountType } from '@/types/account';

export interface AccountFilter {
  page?: number;
  pageSize?: number;
  isActive?: boolean;
  type?: AccountType;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PagedAccountResult {
  items: Account[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AccountBalance {
  totalBalance: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  accountsCount: number;
  currency: string;
  lastUpdated: string;
}

export interface CreateAccountDto {
  name: string;
  type: AccountType;
  balance: number;
  description?: string;
  currency?: string;
}

export interface UpdateAccountDto {
  name?: string;
  type?: AccountType;
  balance?: number;
  description?: string;
  isActive?: boolean;
}

export const accountService = {
  async getAccounts(filter: AccountFilter = {}): Promise<PagedAccountResult> {
    const params = new URLSearchParams();
    
    if (filter.page) params.append('page', filter.page.toString());
    if (filter.pageSize) params.append('pageSize', filter.pageSize.toString());
    if (filter.isActive !== undefined) params.append('isActive', filter.isActive.toString());
    if (filter.type !== undefined) params.append('type', filter.type.toString());
    if (filter.sortBy) params.append('sortBy', filter.sortBy);
    if (filter.sortOrder) params.append('sortOrder', filter.sortOrder);
    
    const response = await api.get<PagedAccountResult>(`/accounts?${params}`);
    return response.data;
  },

  async getAccountById(id: string): Promise<Account> {
    const response = await api.get<Account>(`/accounts/${id}`);
    return response.data;
  },

  async createAccount(accountData: CreateAccountDto): Promise<Account> {
    const response = await api.post<Account>('/accounts', accountData);
    return response.data;
  },

  async updateAccount(id: string, accountData: UpdateAccountDto): Promise<Account> {
    const response = await api.put<Account>(`/accounts/${id}`, accountData);
    return response.data;
  },

  async deleteAccount(id: string): Promise<void> {
    await api.delete(`/accounts/${id}`);
  },

  async getAccountBalance(): Promise<AccountBalance> {
    const response = await api.get<AccountBalance>('/accounts/balance');
    return response.data;
  },

  // Utility methods
  formatAccountNumber(accountNumber: string): string {
    if (accountNumber.startsWith('****')) {
      return accountNumber;
    }
    return '****' + accountNumber.slice(-4);
  },

  getAccountTypeLabel(type: AccountType): string {
    switch (type) {
      case AccountType.Checking: return 'Checking';
      case AccountType.Savings: return 'Savings';
      case AccountType.Investment: return 'Investment';
      case AccountType.Credit: return 'Credit';
      case AccountType.Loan: return 'Loan';
      case AccountType.Other: return 'Other';
      default: return 'Unknown';
    }
  },

  getAccountTypeColor(type: AccountType): string {
    switch (type) {
      case AccountType.Checking: return 'bg-blue-100 text-blue-800';
      case AccountType.Savings: return 'bg-green-100 text-green-800';
      case AccountType.Investment: return 'bg-purple-100 text-purple-800';
      case AccountType.Credit: return 'bg-red-100 text-red-800';
      case AccountType.Loan: return 'bg-orange-100 text-orange-800';
      case AccountType.Other: return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
}; 