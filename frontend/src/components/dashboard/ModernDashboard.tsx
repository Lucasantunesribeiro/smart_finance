'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { transactionService } from '@/services/transactionService';
import { budgetService } from '@/services/budgetService';
import { formatCurrency } from '@/lib/utils';
import { AddTransactionDialog } from './AddTransactionDialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
}

const StatsCard = ({ title, value, change, changeType, icon }: StatsCardProps) => (
  <Card className="relative overflow-hidden transition-all hover:shadow-lg">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        {title}
      </CardTitle>
      <div className="text-muted-foreground">{icon}</div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {change && (
        <div className="flex items-center text-xs text-muted-foreground">
          {changeType === 'positive' && <ArrowUpRight className="mr-1 h-3 w-3 text-green-600" />}
          {changeType === 'negative' && <ArrowDownRight className="mr-1 h-3 w-3 text-red-600" />}
          <span className={
            changeType === 'positive' ? 'text-green-600' : 
            changeType === 'negative' ? 'text-red-600' : 
            'text-muted-foreground'
          }>
            {change}
          </span>
        </div>
      )}
    </CardContent>
  </Card>
);

export const ModernDashboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch data with proper error handling and defaults
  const { data: transactionSummary = { 
    netAmount: 0, 
    totalIncome: 0, 
    totalExpense: 0, 
    transactionCount: 0,
    fromDate: '',
    toDate: ''
  } } = useQuery({
    queryKey: ['transaction-summary'],
    queryFn: () => transactionService.getTransactionSummary(),
    retry: false,
    refetchOnWindowFocus: false
  });

  const { data: recentTransactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ['recent-transactions'],
    queryFn: () => transactionService.getTransactions({
      page: 1,
      pageSize: 5,
      sortBy: 'transactionDate',
      sortOrder: 'desc'
    }),
    retry: false,
    refetchOnWindowFocus: false
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => budgetService.getBudgets({
      page: 1,
      pageSize: 3,
      isActive: true,
      sortBy: 'name',
      sortOrder: 'asc'
    }).then(response => response.items),
    retry: false,
    refetchOnWindowFocus: false
  });

  const recentTransactions = recentTransactionsData?.items || [];

  const getTransactionIcon = (type: number) => {
    switch (type) {
      case 0: // Income
        return <ArrowUpRight className="h-4 w-4 text-green-600" />;
      case 1: // Expense  
        return <ArrowDownRight className="h-4 w-4 text-red-600" />;
      default:
        return <CreditCard className="h-4 w-4 text-blue-600" />;
    }
  };

  const getTransactionTypeText = (type: number) => {
    switch (type) {
      case 0: return 'Income';
      case 1: return 'Expense';
      case 2: return 'Transfer';
      default: return 'Unknown';
    }
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 1:
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Completed</Badge>;
      case 0:
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">Pending</Badge>;
      case 2:
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['transaction-summary'] });
    queryClient.invalidateQueries({ queryKey: ['recent-transactions'] });
    queryClient.invalidateQueries({ queryKey: ['budgets'] });
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome back, {user?.firstName}! Here&apos;s your financial overview.
          </p>
        </div>
        <AddTransactionDialog onSuccess={refreshData}>
          <Button>Add Transaction</Button>
        </AddTransactionDialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Net Amount"
          value={formatCurrency(transactionSummary.netAmount)}
          change=""
          changeType="neutral"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatsCard
          title="Total Income"
          value={formatCurrency(transactionSummary.totalIncome)}
          change=""
          changeType="neutral"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatsCard
          title="Total Expenses"
          value={formatCurrency(transactionSummary.totalExpense)}
          change=""
          changeType="neutral"
          icon={<TrendingDown className="h-4 w-4" />}
        />
        <StatsCard
          title="Transactions"
          value={transactionSummary.transactionCount.toString()}
          change=""
          changeType="neutral"
          icon={<CreditCard className="h-4 w-4" />}
        />
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Transactions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Latest financial activity</CardDescription>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[200px]" />
                      <Skeleton className="h-4 w-[100px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        {getTransactionIcon(transaction.type)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{transaction.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {getTransactionTypeText(transaction.type)} • {transaction.accountName}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {formatCurrency(transaction.amount)}
                      </p>
                      {getStatusBadge(transaction.status)}
                    </div>
                  </div>
                ))}
                {recentTransactions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No recent transactions found
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Budget Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Budget Overview</CardTitle>
            <CardDescription>Current month progress</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {budgets.map((budget) => (
              <div key={budget.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{budget.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {budget.percentage}%
                  </p>
                </div>
                <Progress value={budget.percentage} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatCurrency(budget.spent)}</span>
                  <span>{formatCurrency(budget.allocated)}</span>
                </div>
              </div>
            ))}
            {budgets.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No active budgets found
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
