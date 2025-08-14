'use client';

import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { transactionService } from '@/services/transactionService';
import { budgetService } from '@/services/budgetService';
import { categoryService } from '@/services/categoryService';
import { TransactionType, TransactionStatus } from '@/types/transaction';
import { QuickActions } from './QuickActions';
import { NotificationPanel } from './NotificationPanel';
import { BudgetPage } from './pages/BudgetPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  BarChart3, 
  Calendar,
  Filter,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Settings,
  FileText,
  Home,
  Wallet,
  Receipt,
  AlertCircle,
  CheckCircle,
  XCircle,
  Menu,
  X
} from 'lucide-react';

export const CompleteDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Dados conectados com backend
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
    refetchInterval: 30000, // Atualiza a cada 30 segundos
    retry: false, // TEMPORARY: Stop infinite retry loop on 500 errors
    refetchOnWindowFocus: false
  });

  const { data: recentTransactionsData } = useQuery({
    queryKey: ['recent-transactions'],
    queryFn: () => transactionService.getTransactions({
      page: 1,
      pageSize: 5,
      sortBy: 'transactionDate',
      sortOrder: 'desc'
    }),
    refetchInterval: 30000
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => budgetService.getBudgets({
      page: 1,
      pageSize: 10,
      isActive: true,
      sortBy: 'name',
      sortOrder: 'asc'
    }).then(response => response.items)
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories({
      page: 1,
      pageSize: 10,
      isActive: true,
      sortBy: 'name',
      sortOrder: 'asc'
    }).then(response => response.items)
  });

  const recentTransactions = recentTransactionsData?.items || [];
  const totalBalance = transactionSummary?.netAmount || 0;
  const monthlyIncome = transactionSummary?.totalIncome || 0;
  const monthlyExpenses = transactionSummary?.totalExpense || 0;
  // Calculate real savings as income minus expenses (if positive, otherwise 0)
  const savings = Math.max(monthlyIncome - monthlyExpenses, 0);

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'budgets', label: 'Budgets', icon: Target },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'categories', label: 'Categories', icon: PieChart },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const getStatusColor = (status: TransactionStatus) => {
    switch (status) {
      case TransactionStatus.Completed: return 'text-green-600';
      case TransactionStatus.Pending: return 'text-yellow-600';
      case TransactionStatus.Failed: return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = (status: TransactionStatus) => {
    switch (status) {
      case TransactionStatus.Completed: return 'Completed';
      case TransactionStatus.Pending: return 'Pending';
      case TransactionStatus.Failed: return 'Failed';
      default: return 'Unknown';
    }
  };

  const getStatusIcon = (status: TransactionStatus) => {
    switch (status) {
      case TransactionStatus.Completed: return <CheckCircle className="w-4 h-4 text-green-600" />;
      case TransactionStatus.Pending: return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case TransactionStatus.Failed: return <XCircle className="w-4 h-4 text-red-600" />;
      default: return null;
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Balance</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(totalBalance)}
              </p>
              <p className="text-sm text-green-600">Saldo atual</p>
            </div>
            <Wallet className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Monthly Income</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(monthlyIncome)}
              </p>
              <p className="text-sm text-green-600">Receita mensal</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Monthly Expenses</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(monthlyExpenses)}
              </p>
              <p className="text-sm text-red-600">Despesas mensais</p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Savings</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(savings)}
              </p>
              <p className="text-sm text-blue-600">Economia estimada</p>
            </div>
            <Target className="h-8 w-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Charts and Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Spending Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Monthly Spending by Category</h3>
          <div className="space-y-4">
            {categories.slice(0, 5).map((category, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full`} style={{ backgroundColor: category.color }}></div>
                  <span className="text-sm font-medium">{category.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatCurrency(category.totalAmount)}</p>
                  <p className="text-xs text-gray-500">{monthlyExpenses > 0 ? Math.round((category.totalAmount / monthlyExpenses) * 100) : 0}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Recent Transactions</h3>
            <button className="text-sm text-blue-600 hover:text-blue-800">View All</button>
          </div>
          <div className="space-y-3">
            {recentTransactions.slice(0, 5).map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {transaction.type === TransactionType.Income ? (
                    <ArrowUpRight className="w-4 h-4 text-green-600" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-600" />
                  )}
                  <div>
                    <p className="font-medium text-sm">{transaction.description}</p>
                    <p className="text-xs text-gray-500">{transaction.categoryName || 'N/A'} • {new Date(transaction.transactionDate).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                <div className="text-right flex items-center space-x-2">
                  <div>
                    <p className={`font-medium text-sm ${
                      transaction.type === TransactionType.Income ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === TransactionType.Income ? '+' : ''}{formatCurrency(transaction.amount)}
                    </p>
                  </div>
                  {getStatusIcon(transaction.status)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Budget Overview */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Budget Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map((budget, index) => (
            <div key={index} className="p-4 border rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">{budget.name}</span>
                <span className="text-sm text-gray-500">
                  {formatCurrency(budget.spent)} / {formatCurrency(budget.allocated)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    budget.percentage > 90 ? 'bg-red-500' : 
                    budget.percentage > 75 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${budget.percentage}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">{budget.percentage}% used</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions and Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QuickActions />
        <NotificationPanel />
      </div>
    </div>
  );

  const renderTransactions = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Transactions</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Add Transaction</span>
        </button>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center mb-4">
          <div className="flex space-x-2">
            <button className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg">
              <Filter className="w-4 h-4" />
              <span>Filter</span>
            </button>
            <button className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg">
              <Calendar className="w-4 h-4" />
              <span>This Month</span>
            </button>
          </div>
        </div>
        
        <div className="space-y-3">
          {recentTransactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
              <div className="flex items-center space-x-3">
                {transaction.type === TransactionType.Income ? (
                  <ArrowUpRight className="w-5 h-5 text-green-600" />
                ) : (
                  <ArrowDownRight className="w-5 h-5 text-red-600" />
                )}
                <div>
                  <p className="font-medium">{transaction.description}</p>
                  <p className="text-sm text-gray-500">{transaction.categoryName || 'N/A'} • {new Date(transaction.transactionDate).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
              <div className="text-right flex items-center space-x-3">
                <div>
                  <p className={`font-medium ${
                    transaction.type === TransactionType.Income ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === TransactionType.Income ? '+' : ''}{formatCurrency(transaction.amount)}
                  </p>
                  <p className={`text-sm ${getStatusColor(transaction.status)}`}>
                    {getStatusText(transaction.status)}
                  </p>
                </div>
                {getStatusIcon(transaction.status)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'transactions': return renderTransactions();
      case 'budgets': return <BudgetPage />;
      case 'analytics': return <AnalyticsPage />;
      case 'categories': return <CategoriesPage />;
      case 'reports': return <ReportsPage />;
      case 'settings': return <SettingsPage />;
      default: return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transition-transform duration-300 ease-in-out`}>
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <DollarSign className="h-8 w-8 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">SmartFinance</h1>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <nav className="mt-6 px-3">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-left transition-colors ${
                  activeTab === item.id 
                    ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
        
        <div className="absolute bottom-0 w-full p-4 border-t">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-medium text-sm">
                {user?.firstName?.charAt(0)}
              </span>
            </div>
            <div>
              <p className="font-medium text-sm">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-0">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden"
                >
                  <Menu className="h-6 w-6" />
                </button>
                <h2 className="text-2xl font-bold text-gray-900 capitalize">
                  {activeTab}
                </h2>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  {new Date().toLocaleDateString('pt-BR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {renderContent()}
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default CompleteDashboard;