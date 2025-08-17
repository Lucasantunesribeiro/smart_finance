'use client';

import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { transactionService } from '@/services/transactionService';
import { formatCurrency } from '@/lib/utils';
import { PlusCircle, TrendingUp, TrendingDown, CreditCard, ArrowUpRight, ArrowDownRight, DollarSign } from 'lucide-react';
import { LoadingCard, LoadingTable } from '@/components/ui/loading';
import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { TransactionSummary, TransactionFilter } from '@/types/transaction';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const Dashboard = () => {
  const { user, logout } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  // Memoize date range calculation for better performance
  const { fromDate, toDate } = useMemo(() => {
    const now = new Date();
    const toDate = now.toISOString().split('T')[0];
    const fromDate = new Date(now);
    
    switch (selectedPeriod) {
      case '7d':
        fromDate.setDate(fromDate.getDate() - 7);
        break;
      case '30d':
        fromDate.setDate(fromDate.getDate() - 30);
        break;
      case '90d':
        fromDate.setDate(fromDate.getDate() - 90);
        break;
      case '365d':
        fromDate.setDate(fromDate.getDate() - 365);
        break;
      default:
        fromDate.setDate(fromDate.getDate() - 30);
    }
    
    return {
      fromDate: fromDate.toISOString().split('T')[0],
      toDate
    };
  }, [selectedPeriod]);

  // Fetch dashboard stats
  const { data: stats = {
    netAmount: 0,
    totalIncome: 0,
    totalExpense: 0,
    transactionCount: 0,
    fromDate: '',
    toDate: ''
  }, isLoading: statsLoading } = useQuery<TransactionSummary>({
    queryKey: ['dashboard-stats', selectedPeriod, fromDate, toDate],
    queryFn: () => transactionService.getTransactionSummary(fromDate, toDate),
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: false, // TEMPORARY: Stop infinite retry loop on 500 errors
    refetchOnWindowFocus: false
  });

  // Fetch recent transactions
  const { data: recentTransactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ['recent-transactions'],
    queryFn: () => transactionService.getTransactions({
      page: 1,
      pageSize: 10,
      sortBy: 'transactionDate',
      sortOrder: 'desc'
    } as TransactionFilter),
    refetchInterval: 30000,
  });

  const transactions = recentTransactionsData?.items || [];

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch (error) {
      toast.error('Error logging out');
    }
  }, [logout]);

  // Memoize helper functions for better performance
  const getStatusColor = useCallback((status: number) => {
    switch (status) {
      case 1: return 'text-green-600'; // Completed
      case 0: return 'text-yellow-600'; // Pending
      case 2: return 'text-red-600'; // Failed
      case 3: return 'text-gray-600'; // Cancelled
      default: return 'text-gray-600';
    }
  }, []);

  const getStatusText = useCallback((status: number) => {
    switch (status) {
      case 1: return 'Completed';
      case 0: return 'Pending';
      case 2: return 'Failed';
      case 3: return 'Cancelled';
      default: return 'Unknown';
    }
  }, []);

  const getTypeIcon = useCallback((type: number) => {
    switch (type) {
      case 0: // Income
        return <ArrowUpRight className="w-4 h-4 text-green-600" />;
      case 1: // Expense
        return <ArrowDownRight className="w-4 h-4 text-red-600" />;
      case 2: // Transfer
        return <ArrowUpRight className="w-4 h-4 text-blue-600" />;
      default:
        return <ArrowDownRight className="w-4 h-4 text-gray-600" />;
    }
  }, []);

  const getAmountColor = useCallback((type: number) => {
    switch (type) {
      case 0: return 'text-green-600'; // Income
      case 1: return 'text-red-600'; // Expense
      case 2: return 'text-blue-600'; // Transfer
      default: return 'text-gray-600';
    }
  }, []);

  const getAmountPrefix = useCallback((type: number) => {
    switch (type) {
      case 0: return '+'; // Income
      case 1: return '-'; // Expense
      case 2: return ''; // Transfer
      default: return '';
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">SmartFinance</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user?.firstName} {user?.lastName}
              </span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleLogout}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Period Selector */}
        <div className="mb-8">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="365d">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsLoading ? (
            // Show loading cards while data is being fetched
            <>
              <LoadingCard />
              <LoadingCard />
              <LoadingCard />
              <LoadingCard />
            </>
          ) : (
            <>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Net Amount</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(stats?.netAmount || 0)}
                      </p>
                    </div>
                    <CreditCard className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Income</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(stats?.totalIncome || 0)}
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
                      <p className="text-sm text-muted-foreground">Total Expenses</p>
                      <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(stats?.totalExpense || 0)}
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
                      <p className="text-sm text-muted-foreground">Transactions</p>
                      <p className="text-2xl font-bold">
                        {stats?.transactionCount || 0}
                      </p>
                    </div>
                    <PlusCircle className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Transactions</CardTitle>
              <Button variant="link" size="sm">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <LoadingTable />
            ) : transactions && transactions.length > 0 ? (
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      {getTypeIcon(transaction.type)}
                      <div>
                        <p className="font-medium text-gray-900">{transaction.description}</p>
                        <p className="text-sm text-gray-500">
                          {transaction.categoryName || 'Uncategorized'} • {new Date(transaction.transactionDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${getAmountColor(transaction.type)}`}>
                        {getAmountPrefix(transaction.type)}{formatCurrency(Math.abs(transaction.amount))}
                      </p>
                      <p className={`text-sm ${getStatusColor(transaction.status)}`}>
                        {getStatusText(transaction.status)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No recent transactions found.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard; 