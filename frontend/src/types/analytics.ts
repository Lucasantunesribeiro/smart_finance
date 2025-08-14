export interface AnalyticsData {
  period: string;
  income: number;
  expense: number;
  net: number;
  date: string;
}

export interface TrendData {
  label: string;
  value: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'neutral';
}

export interface MonthlyComparison {
  currentMonth: MonthData;
  previousMonth: MonthData;
  comparison: ComparisonData;
}

export interface MonthData {
  month: string;
  year: number;
  income: number;
  expense: number;
  net: number;
  transactionCount: number;
}

export interface ComparisonData {
  incomeChange: number;
  expenseChange: number;
  netChange: number;
  transactionCountChange: number;
}

export interface CashFlowData {
  date: string;
  income: number;
  expense: number;
  balance: number;
  cumulative: number;
}

export interface SpendingTrend {
  category: string;
  periods: SpendingPeriod[];
  total: number;
  average: number;
}

export interface SpendingPeriod {
  period: string;
  amount: number;
  date: string;
}

export interface TopSpenders {
  description: string;
  amount: number;
  category: string;
  date: string;
  frequency: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  current: number;
  percentage: number;
  deadline: string;
  monthlyTarget: number;
  isActive: boolean;
}

export interface AnalyticsFilter {
  fromDate: string;
  toDate: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  categoryId?: string;
  includeTransfers?: boolean;
}

export interface CategoryData {
  name: string;
  amount: number;
  percentage: number;
  color?: string;
}

export interface AnalyticsSummary {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  categories: CategoryData[];
  transactionCount: number;
} 