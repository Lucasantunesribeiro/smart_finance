'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { transactionService } from '@/services/transactionService';
import { formatCurrency } from '@/lib/utils';
import { 
  FileText, 
  Download, 
  Calendar, 
  Filter,
  PieChart,
  BarChart3,
  TrendingUp,
  Receipt,
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';

export const ReportsPage = () => {
  const [selectedReport, setSelectedReport] = useState('monthly');
  const [dateRange, setDateRange] = useState({
    fromDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0]
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const reportTypes = [
    {
      id: 'monthly',
      name: 'Relatório Mensal',
      description: 'Resumo completo das transações do mês',
      icon: Calendar
    },
    {
      id: 'category',
      name: 'Relatório por Categoria',
      description: 'Análise de gastos por categoria',
      icon: PieChart
    },
    {
      id: 'cashflow',
      name: 'Fluxo de Caixa',
      description: 'Análise do fluxo de entrada e saída',
      icon: TrendingUp
    },
    {
      id: 'budget',
      name: 'Relatório de Orçamento',
      description: 'Comparação entre orçado e realizado',
      icon: BarChart3
    },
    {
      id: 'annual',
      name: 'Relatório Anual',
      description: 'Resumo completo do ano',
      icon: FileText
    }
  ];

  const exportFormats = [
    { id: 'pdf', name: 'PDF', description: 'Documento formatado' },
    { id: 'excel', name: 'Excel', description: 'Planilha para análise' },
    { id: 'csv', name: 'CSV', description: 'Dados brutos' }
  ];

  // Dados reais do backend
  const { data: reportData, isLoading: reportLoading } = useQuery({
    queryKey: ['report-data', selectedReport, dateRange],
    retry: false, // TEMPORARY: Stop infinite retry loop on 500 errors
    refetchOnWindowFocus: false,
    queryFn: async () => {
      // Buscar resumo das transações
      const summary = await transactionService.getTransactionSummary(
        dateRange.fromDate, 
        dateRange.toDate
      );
      
      // Buscar transações para análise
      const transactions = await transactionService.getTransactions({
        fromDate: dateRange.fromDate,
        toDate: dateRange.toDate,
        page: 1,
        pageSize: 100, // or appropriate number
        sortBy: 'transactionDate', // or appropriate field
        sortOrder: 'desc' // or 'asc'
      });
      
      // Calcular estatísticas
      const totalTransactions = transactions.totalCount;
      const totalIncome = summary.totalIncome;
      const totalExpenses = summary.totalExpense;
      const netAmount = summary.netAmount;
      
      // Agrupar por categoria
      const categoryMap = new Map();
      transactions.items.forEach(transaction => {
        const categoryName = transaction.categoryName || 'Outros';
        if (!categoryMap.has(categoryName)) {
          categoryMap.set(categoryName, 0);
        }
        categoryMap.set(categoryName, categoryMap.get(categoryName) + transaction.amount);
      });
      
      const categories = Array.from(categoryMap.entries())
        .map(([name, amount]) => ({
          name,
          amount,
          percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);
      
      // Maiores despesas
      const topExpenses = transactions.items
        .filter(t => t.type === 1) // Expense
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)
        .map(t => ({
          description: t.description,
          amount: t.amount,
          date: t.transactionDate
        }));
      
      return {
        totalTransactions,
        totalIncome,
        totalExpenses,
        netAmount,
        categories,
        topExpenses
      };
    }
  });

  const handleGenerateReport = async (format: 'csv' | 'pdf' | 'excel') => {
    setIsGenerating(true);
    try {
      // Criar filtro baseado no tipo de relatório selecionado
      const filter = {
        fromDate: dateRange.fromDate,
        toDate: dateRange.toDate,
        page: 1,
        pageSize: 10000,
        sortBy: 'transactionDate',
        sortOrder: 'desc'
      };
      
      // Chamar serviço real para gerar relatório
      const blob = await transactionService.exportTransactions(filter, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-${selectedReport}-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Relatório ${format.toUpperCase()} gerado com sucesso!`);
      
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast.error('Erro ao gerar relatório');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios Financeiros</h1>
          <p className="text-gray-600">Gere relatórios detalhados das suas finanças</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedReport}
            onChange={(e) => setSelectedReport(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {reportTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Período do Relatório</h3>
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Inicial</label>
            <input
              type="date"
              value={dateRange.fromDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, fromDate: e.target.value }))}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Final</label>
            <input
              type="date"
              value={dateRange.toDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, toDate: e.target.value }))}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center space-x-2">
              <Filter className="w-4 h-4" />
              <span>Aplicar Filtros</span>
            </button>
          </div>
        </div>
      </div>

      {/* Report Types */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Tipos de Relatório</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => setSelectedReport(type.id)}
                className={`p-4 rounded-lg border text-left transition-colors ${
                  selectedReport === type.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3 mb-2">
                  <Icon className={`w-5 h-5 ${
                    selectedReport === type.id ? 'text-blue-600' : 'text-gray-600'
                  }`} />
                  <h4 className="font-medium">{type.name}</h4>
                </div>
                <p className="text-sm text-gray-600">{type.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Report Preview */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Prévia do Relatório</h3>
        
        {reportLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Carregando dados do relatório...</p>
          </div>
        ) : reportData ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total de Transações</p>
                    <p className="text-xl font-bold">{reportData.totalTransactions}</p>
                  </div>
                  <Receipt className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total de Receitas</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(reportData.totalIncome)}</p>
                  </div>
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total de Despesas</p>
                    <p className="text-xl font-bold text-red-600">{formatCurrency(reportData.totalExpenses)}</p>
                  </div>
                  <Receipt className="w-6 h-6 text-red-600" />
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Saldo Líquido</p>
                    <p className="text-xl font-bold text-blue-600">{formatCurrency(reportData.netAmount)}</p>
                  </div>
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            {/* Categories Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Gastos por Categoria</h4>
                <div className="space-y-2">
                  {reportData.categories.map((category, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{category.name}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{formatCurrency(category.amount)}</span>
                        <span className="text-xs text-gray-500">({category.percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-3">Maiores Despesas</h4>
                <div className="space-y-2">
                  {reportData.topExpenses.map((expense, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium">{expense.description}</span>
                        <p className="text-xs text-gray-500">{new Date(expense.date).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <span className="text-sm font-medium">{formatCurrency(expense.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600">Nenhum dado disponível para o período selecionado</p>
          </div>
        )}
      </div>

      {/* Export Options */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Exportar Relatório</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {exportFormats.map((format) => (
            <button
              key={format.id}
              onClick={() => handleGenerateReport(format.id as 'csv' | 'pdf' | 'excel')}
              disabled={isGenerating}
              className="p-4 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Download className="w-5 h-5 text-blue-600" />
                <span className="font-medium">{format.name}</span>
              </div>
              <p className="text-sm text-gray-600">{format.description}</p>
            </button>
          ))}
        </div>
        
        {isGenerating && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-blue-600">Gerando relatório...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 