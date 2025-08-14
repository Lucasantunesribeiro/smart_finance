'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { budgetService } from '@/services/budgetService';
import { categoryService } from '@/services/categoryService';
import { formatCurrency } from '@/lib/utils';
import { Plus, Edit, Trash2, AlertCircle, Target, Calendar, DollarSign } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { BudgetPeriod } from '@/types/budget';
import { toast } from 'sonner';

export const BudgetPage = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<BudgetPeriod>(BudgetPeriod.Monthly);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Conectando com backend real
  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ['budgets', selectedPeriod],
    queryFn: () => budgetService.getBudgets({
      period: selectedPeriod,
      page: 1,
      pageSize: 50,
      isActive: true,
      sortBy: 'name',
      sortOrder: 'asc'
    }).then(response => response.items)
  });

  // Buscar categorias para o formulário
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories({
      page: 1,
      pageSize: 100,
      isActive: true,
      sortBy: 'name',
      sortOrder: 'asc'
    })
  });

  const categories = categoriesData?.items || [];

  const getBudgetStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getBudgetStatusText = (percentage: number) => {
    if (percentage >= 100) return 'Excedido';
    if (percentage >= 90) return 'Crítico';
    if (percentage >= 75) return 'Atenção';
    return 'No orçamento';
  };

  const getPeriodText = (period: BudgetPeriod) => {
    switch (period) {
      case BudgetPeriod.Weekly: return 'Semanal';
      case BudgetPeriod.Monthly: return 'Mensal';
      case BudgetPeriod.Quarterly: return 'Trimestral';
      case BudgetPeriod.Yearly: return 'Anual';
      default: return 'Mensal';
    }
  };

  const totalAllocated = budgets.reduce((sum, budget) => sum + (budget.allocated || 0), 0);
  const totalSpent = budgets.reduce((sum, budget) => sum + (budget.spent || 0), 0);
  const overBudgetCount = budgets.filter(budget => (budget.percentage || 0) >= 90).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Orçamentos</h1>
          <p className="text-gray-600">Controle seus gastos e mantenha-se dentro do orçamento</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Orçamento</span>
        </button>
      </div>

      {/* Period Filter */}
      <div className="flex space-x-2">
        {Object.values(BudgetPeriod).filter(value => typeof value === 'number').map((period) => (
          <button
            key={period}
            onClick={() => setSelectedPeriod(period as BudgetPeriod)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedPeriod === period
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            {getPeriodText(period as BudgetPeriod)}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Orçado</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(totalAllocated)}
              </p>
            </div>
            <Target className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Gasto</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(totalSpent)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Saldo Restante</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalAllocated - totalSpent)}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Orçamentos Críticos</p>
              <p className="text-2xl font-bold text-orange-600">
                {overBudgetCount}
              </p>
            </div>
            <AlertCircle className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Budget List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Orçamentos {getPeriodText(selectedPeriod)}</h2>
        </div>
        
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Carregando orçamentos...</p>
            </div>
          ) : budgets.length === 0 ? (
            <EmptyState
              icon={<Target className="h-12 w-12" />}
              title="Nenhum orçamento encontrado"
              description="Comece criando seu primeiro orçamento para controlar seus gastos mensais"
              actionLabel="Criar Primeiro Orçamento"
              onAction={() => setShowCreateModal(true)}
            />
          ) : (
            <div className="space-y-4">
              {budgets.map((budget) => (
                <div key={budget.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{budget.name}</h3>
                      <p className="text-sm text-gray-600">{budget.description}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {budget.categoryName} • {new Date(budget.startDate).toLocaleDateString()} - {new Date(budget.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        (budget.percentage || 0) >= 100 ? 'bg-red-100 text-red-800' :
                        (budget.percentage || 0) >= 90 ? 'bg-red-100 text-red-800' :
                        (budget.percentage || 0) >= 75 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {getBudgetStatusText(budget.percentage || 0)}
                      </span>
                      <button className="text-gray-400 hover:text-gray-600">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-gray-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mb-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">
                        {formatCurrency(budget.spent || 0)} de {formatCurrency(budget.allocated || 0)}
                      </span>
                      <span className={`font-medium ${
                        (budget.percentage || 0) >= 100 ? 'text-red-600' :
                        (budget.percentage || 0) >= 90 ? 'text-orange-600' :
                        'text-gray-900'
                      }`}>
                        {(budget.percentage || 0).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className={`h-2 rounded-full ${getBudgetStatusColor(budget.percentage || 0)}`}
                        style={{ width: `${Math.min(budget.percentage || 0, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">
                      Restante: {formatCurrency(budget.remaining || 0)}
                    </span>
                    <span className="text-gray-600">
                      Período: {getPeriodText(budget.period)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Budget Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Criar Novo Orçamento</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                                <input 
                  type="text" 
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Orçamento Mensal"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor Orçado</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0,00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <select className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecione uma categoria</option>
                  {categories.length > 0 ? (
                    categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))
                  ) : (
                    <option disabled>Nenhuma categoria disponível</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
                <select className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value={BudgetPeriod.Weekly}>Semanal</option>
                  <option value={BudgetPeriod.Monthly}>Mensal</option>
                  <option value={BudgetPeriod.Quarterly}>Trimestral</option>
                  <option value={BudgetPeriod.Yearly}>Anual</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  toast.success('Orçamento criado com sucesso!');
                  setShowCreateModal(false);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Criar Orçamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 