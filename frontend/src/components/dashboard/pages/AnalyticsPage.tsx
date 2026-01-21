'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/services/analyticsService';
import { formatCurrency } from '@/lib/utils';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  ArrowUpRight,
  BarChart3,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/i18n/locale-context';

// Loading skeleton components
const MetricCardSkeleton = () => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-8 w-8 rounded" />
      </div>
    </CardContent>
  </Card>
);

const ChartSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-48" />
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex items-center space-x-3">
              <Skeleton className="h-2 w-20 rounded-full" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-10" />
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export const AnalyticsPage = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [dateRange, setDateRange] = useState({
    fromDate: new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1).toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0]
  });
  const { localize } = useTranslation();

  // Conectando com backend real
  const { 
    data: analyticsData = [], 
    isLoading: analyticsLoading, 
    error: analyticsError,
    refetch: refetchAnalytics 
  } = useQuery({
    queryKey: ['analytics-data', selectedPeriod, dateRange],
    queryFn: () => analyticsService.getAnalyticsData({
      period: selectedPeriod,
      fromDate: dateRange.fromDate,
      toDate: dateRange.toDate
    }),
    retry: 1,
    refetchOnWindowFocus: false
  });

  const { 
    data: trendData = [], 
    isLoading: trendLoading, 
    error: trendError,
    refetch: refetchTrends 
  } = useQuery({
    queryKey: ['trend-data', selectedPeriod, dateRange],
    queryFn: () => analyticsService.getTrendData({
      period: selectedPeriod,
      fromDate: dateRange.fromDate,
      toDate: dateRange.toDate
    }),
    retry: 1,
    refetchOnWindowFocus: false
  });

  const { 
    data: cashFlowData = [], 
    isLoading: cashFlowLoading, 
    error: cashFlowError,
    refetch: refetchCashFlow 
  } = useQuery({
    queryKey: ['cash-flow-data', selectedPeriod, dateRange],
    queryFn: () => analyticsService.getCashFlowData({
      period: selectedPeriod,
      fromDate: dateRange.fromDate,
      toDate: dateRange.toDate
    }),
    retry: 1,
    refetchOnWindowFocus: false
  });

  // Dados reais do backend
  const { 
    data: summaryData, 
    isLoading: summaryLoading, 
    error: summaryError,
    refetch: refetchSummary 
  } = useQuery({
    queryKey: ['analytics-summary', selectedPeriod, dateRange],
    queryFn: () => analyticsService.getSummary({
      period: selectedPeriod,
      fromDate: dateRange.fromDate,
      toDate: dateRange.toDate
    }),
    retry: 1,
    refetchOnWindowFocus: false
  });

  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <ArrowUpRight className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  // Preparar dados das categorias com cores
  const categoryColors = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];
  const expenseCategories = summaryData?.categories?.map((cat, index: number) => ({
    name: cat.name,
    value: cat.amount,
    color: categoryColors[index % categoryColors.length],
    percentage: cat.percentage
  })) || [];

  const totalExpenses = summaryData?.totalExpenses || 0;

  // Check for loading states
  const isLoading = analyticsLoading || trendLoading || cashFlowLoading || summaryLoading;

  // Check for errors
  const hasErrors = analyticsError || trendError || cashFlowError || summaryError;

  // Check for data
  const hasData = analyticsData.length > 0 || trendData.length > 0 || cashFlowData.length > 0;

  const handleRefresh = () => {
    refetchAnalytics();
    refetchTrends();
    refetchCashFlow();
    refetchSummary();
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {localize('Painel de Analytics', 'Analytics Dashboard')}
          </h1>
          <p className="text-gray-600">
            {localize('Análise detalhada das suas finanças', 'Detailed insights into your finances')}
          </p>
          </div>
          <div className="flex items-center space-x-4">
            <Skeleton className="h-10 w-32" />
            <div className="flex space-x-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </div>

        {/* Metric Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  // Show error state
  if (hasErrors && !hasData) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {localize('Painel de Analytics', 'Analytics Dashboard')}
          </h1>
          <p className="text-gray-600">
            {localize('Análise detalhada das suas finanças', 'Detailed insights into your finances')}
          </p>
        </div>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            {localize('Tentar Novamente', 'Try Again')}
          </Button>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {localize(
              'Ocorreu um erro ao carregar os dados de analytics. Verifique sua conexão e tente novamente.',
              'Failed to load analytics data. Check your connection and try again.'
            )}
          </AlertDescription>
        </Alert>

        <EmptyState
          icon={<BarChart3 className="h-16 w-16" />}
          title={localize('Erro ao carregar dados', 'Failed to load data')}
          description={localize(
            'Não foi possível carregar as informações de analytics. Tente novamente em alguns instantes.',
            'Unable to load analytics information. Please try again shortly.'
          )}
          actionLabel={localize('Recarregar Dados', 'Reload Data')}
          onAction={handleRefresh}
          className="min-h-[400px]"
        />
      </div>
    );
  }

  // Show empty state if no data
  if (!hasData) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600">Análise detalhada das suas finanças</p>
          </div>
        </div>

        <EmptyState
          icon={<BarChart3 className="h-16 w-16" />}
          title={localize('Sem dados para análise', 'No data available for analysis')}
          description={localize(
            'Adicione transações e categorias para visualizar análises detalhadas das suas finanças',
            'Add transactions and categories to view detailed analytics'
          )}
          className="min-h-[400px]"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {localize('Painel de Analytics', 'Analytics Dashboard')}
          </h1>
          <p className="text-gray-600">
            {localize('Análise detalhada das suas finanças', 'Detailed insights into your finances')}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <Select value={selectedPeriod} onValueChange={(value: 'daily' | 'weekly' | 'monthly' | 'yearly') => setSelectedPeriod(value)}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">{localize('Diário', 'Daily')}</SelectItem>
              <SelectItem value="weekly">{localize('Semanal', 'Weekly')}</SelectItem>
              <SelectItem value="monthly">{localize('Mensal', 'Monthly')}</SelectItem>
              <SelectItem value="yearly">{localize('Anual', 'Yearly')}</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input
              type="date"
              value={dateRange.fromDate}
              onChange={(e) => setDateRange({ ...dateRange, fromDate: e.target.value })}
              className="w-full sm:w-auto"
            />
            <Input
              type="date"
              value={dateRange.toDate}
              onChange={(e) => setDateRange({ ...dateRange, toDate: e.target.value })}
              className="w-full sm:w-auto"
            />
          </div>
        </div>
      </div>

      {/* Show partial errors but continue showing data */}
      {hasErrors && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Alguns dados podem estar incompletos devido a erros de conexão. 
            <Button variant="link" onClick={handleRefresh} className="p-0 h-auto ml-1">
              {localize('Tentar recarregar', 'Try to reload')}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  {localize('Média Mensal de Receita', 'Average Monthly Income')}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(analyticsData.reduce((sum, d) => sum + d.income, 0) / analyticsData.length || 0)}
                </p>
                <p className="text-sm text-green-600 mt-1">
                  {localize(
                    `${analyticsData.length} período${analyticsData.length !== 1 ? 's' : ''} analisado${analyticsData.length !== 1 ? 's' : ''}`,
                    `${analyticsData.length} period${analyticsData.length !== 1 ? 's' : ''} analyzed`
                  )}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  {localize('Média Mensal de Despesas', 'Average Monthly Expenses')}
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(analyticsData.reduce((sum, d) => sum + d.expense, 0) / analyticsData.length || 0)}
                </p>
                <p className="text-sm text-red-600 mt-1">
                  {localize(
                    `${analyticsData.length} período${analyticsData.length !== 1 ? 's' : ''} analisado${analyticsData.length !== 1 ? 's' : ''}`,
                    `${analyticsData.length} period${analyticsData.length !== 1 ? 's' : ''} analyzed`
                  )}
                </p>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  {localize('Saldo Líquido Médio', 'Average Net Balance')}
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(analyticsData.reduce((sum, d) => sum + d.net, 0) / analyticsData.length || 0)}
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  {localize('Diferença entre receitas e despesas', 'Difference between income and expenses')}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Spending */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>
              {localize('Gastos por Categoria', 'Spending by Category')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expenseCategories.length > 0 ? (
              <div className="space-y-4">
                {expenseCategories.map((category, index: number) => {
                  const percentage = category.percentage || (category.value / totalExpenses) * 100;
                  return (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: category.color }}
                        ></div>
                        <span className="text-sm font-medium">{category.name}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full"
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: category.color
                            }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600 w-20 text-right">
                          {formatCurrency(category.value)}
                        </span>
                        <span className="text-sm text-gray-500 w-10 text-right">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>{localize('Nenhum dado de categoria disponível', 'No category data available')}</p>
                <p className="text-sm mt-1">
                  {localize(
                    'Adicione transações com categorias para ver esta análise',
                    'Add categorized transactions to view this analysis'
                  )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trends */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>
              {localize('Tendências Financeiras', 'Financial Trends')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trendData.length > 0 ? (
              <div className="space-y-4">
                {trendData.map((trend, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getTrendIcon(trend.trend)}
                      <div>
                        <span className="font-medium">{trend.label}</span>
                        <p className="text-sm text-gray-500">
                          {formatCurrency(trend.value)}
                        </p>
                      </div>
                    </div>
                    <div className={`text-right ${getTrendColor(trend.trend)}`}>
                      <p className="font-semibold">
                        {trend.changePercent > 0 ? '+' : ''}{trend.changePercent.toFixed(1)}%
                      </p>
                      <p className="text-sm">
                        {trend.change > 0 ? '+' : ''}{formatCurrency(trend.change)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>{localize('Nenhuma tendência disponível', 'No trends available')}</p>
                <p className="text-sm mt-1">
                  {localize(
                    'Dados insuficientes para análise de tendências',
                    'Not enough data to analyze trends'
                  )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 
