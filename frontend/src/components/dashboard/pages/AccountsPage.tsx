'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { accountService } from '@/services/accountService';
import { AccountType } from '@/types/account';
import { formatCurrency } from '@/lib/utils';
import { Plus, CreditCard, DollarSign, Wallet, TrendingUp, TrendingDown, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';

export const AccountsPage = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);

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

  const handleDeleteAccount = async (accountId: string) => {
    if (confirm('Are you sure you want to delete this account?')) {
      try {
        await accountService.deleteAccount(accountId);
        toast.success('Account deleted successfully');
        // Refresh data
        window.location.reload();
      } catch (error) {
        toast.error('Failed to delete account');
      }
    }
  };

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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
            <p className="text-gray-600">Manage your financial accounts</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </Button>
        </div>

        <EmptyState
          icon={<Wallet className="h-16 w-16" />}
          title="No accounts found"
          description="Get started by adding your first financial account to track your money."
          actionLabel="Add Your First Account"
          onAction={() => setShowCreateModal(true)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
          <p className="text-gray-600">Manage your financial accounts</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Account
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Balance</p>
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
                <p className="text-sm text-gray-600">Total Assets</p>
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
                <p className="text-sm text-gray-600">Total Liabilities</p>
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
                <p className="text-sm text-gray-600">Net Worth</p>
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
                  <p className="text-sm text-gray-600">Current Balance</p>
                  <p className={`text-2xl font-bold ${getBalanceColor(account.balance)}`}>
                    {formatCurrency(account.balance)}
                  </p>
                </div>

                {account.description && (
                  <div>
                    <p className="text-sm text-gray-600">Description</p>
                    <p className="text-sm text-gray-900">{account.description}</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <span>{account.isActive ? 'Active' : 'Inactive'}</span>
                    <span>•</span>
                    <span>{account.currency}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDeleteAccount(account.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
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

      {/* Create Account Modal would go here */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New Account</h2>
            <p className="text-gray-600 mb-4">Create account functionality coming soon...</p>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                setShowCreateModal(false);
                toast.info('Account creation coming soon!');
              }}>
                Create Account
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};