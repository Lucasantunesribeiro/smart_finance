'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountService, CreateAccountDto, UpdateAccountDto } from '@/services/accountService';
import { AccountType, Account } from '@/types/account';
import { formatCurrency } from '@/lib/utils';
import {
  Plus,
  CreditCard,
  DollarSign,
  Wallet,
  TrendingUp,
  TrendingDown,
  Edit,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n/locale-context';
import { extractErrorMessage } from '@/lib/errorHelpers';

export const AccountsPage = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const { localize, t } = useTranslation();
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: AccountType.Checking,
    balance: 0,
    description: '',
    isActive: true
  });

  const queryClient = useQueryClient();

  // Conectar com API real usando React Query
  const { data: accountsData, isLoading, error } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountService.getAccounts({
      page: 1,
      pageSize: 50,
      sortBy: 'name',
      sortOrder: 'asc'
    }),
    retry: false,
    refetchOnWindowFocus: false
  });

  const { data: balanceData } = useQuery({
    queryKey: ['account-balance'],
    queryFn: () => accountService.getAccountBalance(),
    retry: false,
    refetchOnWindowFocus: false
  });

  const accounts = accountsData?.items || [];

  // Mutations
  const createAccountMutation = useMutation({
    mutationFn: (data: CreateAccountDto) => accountService.createAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['account-balance'] });
      toast.success(localize('Conta criada com sucesso!', 'Account created successfully!'));
      setShowCreateModal(false);
      resetForm();
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error, localize('Erro ao criar conta.', 'Error creating account')));
    }
  });

  const updateAccountMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAccountDto }) => 
      accountService.updateAccount(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['account-balance'] });
      toast.success(localize('Conta atualizada com sucesso!', 'Account updated successfully!'));
      setShowEditModal(false);
      setEditingAccount(null);
      resetForm();
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error, localize('Erro ao atualizar conta.', 'Error updating account')));
    }
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (id: string) => accountService.deleteAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['account-balance'] });
      toast.success(localize('Conta deletada com sucesso!', 'Account deleted successfully!'));
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error, localize('Erro ao deletar conta.', 'Error deleting account')));
    }
  });

  // Helper functions
  const resetForm = () => {
    setFormData({
      name: '',
      type: AccountType.Checking,
      balance: 0,
      description: '',
      isActive: true
    });
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      type: account.type,
      balance: account.balance,
      description: account.description || '',
      isActive: account.isActive
    });
    setShowEditModal(true);
  };

  const handleDelete = (account: Account) => {
    if (window.confirm(localize('Tem certeza que deseja excluir a conta?', 'Are you sure you want to delete this account?'))) {
      deleteAccountMutation.mutate(account.id);
    }
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('Account name is required');
      return;
    }

    if (editingAccount) {
      updateAccountMutation.mutate({ id: editingAccount.id, data: formData });
    } else {
      createAccountMutation.mutate(formData);
    }
  };

  const getAccountIcon = (type: AccountType) => {
    switch (type) {
      case AccountType.Checking:
        return <Wallet className="h-5 w-5 text-blue-600" />;
      case AccountType.Savings:
        return <DollarSign className="h-5 w-5 text-green-600" />;
      case AccountType.Credit:
        return <CreditCard className="h-5 w-5 text-purple-600" />;
      case AccountType.Investment:
        return <TrendingUp className="h-5 w-5 text-indigo-600" />;
      case AccountType.Loan:
        return <TrendingDown className="h-5 w-5 text-orange-600" />;
      default:
        return <Wallet className="h-5 w-5 text-gray-600" />;
    }
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'text-green-600';
    if (balance < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const createAccountModal = showCreateModal ? (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h2 className="text-xl font-bold mb-4">{localize('createAccountTitle', 'Create New Account')}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {localize('accountName', 'Account Name')}
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={localize('accountPlaceholder', 'Enter account name')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {localize('accountType', 'Account Type')}
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: parseInt(e.target.value) as AccountType }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={AccountType.Checking}>{localize('accountTypeChecking', 'Checking')}</option>
              <option value={AccountType.Savings}>{localize('accountTypeSavings', 'Savings')}</option>
              <option value={AccountType.Credit}>{localize('accountTypeCredit', 'Credit')}</option>
              <option value={AccountType.Investment}>{localize('accountTypeInvestment', 'Investment')}</option>
              <option value={AccountType.Loan}>{localize('accountTypeLoan', 'Loan')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {localize('initialBalance', 'Initial Balance')}
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.balance}
              onChange={(e) => setFormData(prev => ({ ...prev, balance: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {localize('descriptionLabel', 'Description')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={localize('descriptionPlaceholder', 'Account description (optional)')}
              rows={3}
            />
          </div>
        </div>
        <div className="flex justify-end space-x-2 mt-6">
          <Button variant="outline" onClick={() => setShowCreateModal(false)}>
            {localize('cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createAccountMutation.isPending}
          >
            {createAccountMutation.isPending
              ? localize('creatingAccount', 'Creating...')
              : localize('createAccountTitle', 'Create New Account')}
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  const editAccountModal = showEditModal ? (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">{localize('editAccountTitle', 'Edit Account')}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {localize('accountName', 'Account Name')}
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={localize('accountPlaceholder', 'Enter account name')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {localize('accountType', 'Account Type')}
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: parseInt(e.target.value) as AccountType }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={AccountType.Checking}>{localize('accountTypeChecking', 'Checking')}</option>
              <option value={AccountType.Savings}>{localize('accountTypeSavings', 'Savings')}</option>
              <option value={AccountType.Credit}>{localize('accountTypeCredit', 'Credit')}</option>
              <option value={AccountType.Investment}>{localize('accountTypeInvestment', 'Investment')}</option>
              <option value={AccountType.Loan}>{localize('accountTypeLoan', 'Loan')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Balance
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.balance}
              onChange={(e) => setFormData(prev => ({ ...prev, balance: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {localize('descriptionLabel', 'Description')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Account description (optional)"
              rows={3}
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              Account is active
            </label>
          </div>
        </div>
        <div className="flex justify-end space-x-2 mt-6">
          <Button variant="outline" onClick={() => setShowEditModal(false)}>
            {localize('cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={updateAccountMutation.isPending}
          >
            {updateAccountMutation.isPending
              ? localize('updatingAccount', 'Updating...')
              : localize('updateAccount', 'Update Account')}
          </Button>
        </div>
      </div>
    </div>
  ) : null;



  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
            <p className="text-gray-600">Manage your financial accounts</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || accounts.length === 0) {
    return (
      <>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('accountsTitle')}</h1>
              <p className="text-gray-600">{t('accountsSubtitle')}</p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('addAccount')}
            </Button>
          </div>

          <EmptyState
            icon={<Wallet className="h-16 w-16" />}
            title={t('accountsEmptyTitle')}
            description={localize(
              'Comece adicionando sua primeira conta financeira para acompanhar suas finanças.',
              'Get started by adding your first financial account to track your money.'
            )}
            actionLabel={t('addAccountAction')}
            onAction={() => setShowCreateModal(true)}
          />
        </div>
        {createAccountModal}
      </>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('accountsTitle')}</h1>
          <p className="text-gray-600">{t('accountsSubtitle')}</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('addAccount')}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{localize('balanceLabel', 'Total Balance')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(balanceData?.totalBalance || 0)}
                </p>
              </div>
              <Wallet className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{localize('totalIncome', 'Total Assets')}</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(balanceData?.totalAssets || 0)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{localize('totalExpenses', 'Total Liabilities')}</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(balanceData?.totalLiabilities || 0)}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                  <p className="text-sm text-gray-600">{localize('netAmount', 'Net Worth')}</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(balanceData?.netWorth || 0)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((account) => (
          <Card key={account.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getAccountIcon(account.type)}
                  <div>
                    <CardTitle className="text-lg">{account.name}</CardTitle>
                    <p className="text-sm text-gray-600">{account.accountNumber}</p>
                  </div>
                </div>
                <Badge className={accountService.getAccountTypeColor(account.type)}>
                  {accountService.getAccountTypeLabel(account.type)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                <p className="text-sm text-gray-600">{localize('balanceLabel', 'Current Balance')}</p>
                  <p className={`text-2xl font-bold ${getBalanceColor(account.balance)}`}>
                    {formatCurrency(account.balance)}
                  </p>
                </div>

                {account.description && (
                  <div>
                    <p className="text-sm text-gray-600">{localize('descriptionLabel', 'Description')}</p>
                    <p className="text-sm text-gray-900">{account.description}</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <span>{account.isActive ? localize('active', 'Active') : localize('inactive', 'Inactive')}</span>
                    <span>•</span>
                    <span>{account.currency}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleEdit(account)}
                      title="Edit account"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDelete(account)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Delete account"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {createAccountModal}
      {editAccountModal}
    </div>
  );
};
