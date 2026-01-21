'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetService } from '@/services/budgetService';
import { categoryService } from '@/services/categoryService';
import { formatCurrency } from '@/lib/utils';
import { Plus, Edit, Trash2, AlertCircle, Target, Calendar, DollarSign } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { BudgetPeriod, Budget, CreateBudgetRequest, UpdateBudgetRequest } from '@/types/budget';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n/locale-context';
import { extractErrorMessage } from '@/lib/errorHelpers';

export const BudgetPage = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<BudgetPeriod>(BudgetPeriod.Monthly);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const { localize } = useTranslation();
  
  // Form state
  const [formData, setFormData] = useState<CreateBudgetRequest>({
    name: '',
    allocated: 0,
    categoryId: '',
    period: BudgetPeriod.Monthly,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]
  });

  const queryClient = useQueryClient();

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

  // Mutations
  const createBudgetMutation = useMutation({
    mutationFn: (data: CreateBudgetRequest) => budgetService.createBudget(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success(localize('Orçamento criado com sucesso!', 'Budget created successfully!'));
      setShowCreateModal(false);
      resetForm();
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error, localize('Erro ao criar orçamento.', 'Failed to create budget.')));
    }
  });

  const updateBudgetMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBudgetRequest }) => 
      budgetService.updateBudget(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success(localize('Orçamento atualizado com sucesso!', 'Budget updated successfully!'));
      setShowEditModal(false);
      setEditingBudget(null);
      resetForm();
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error, localize('Erro ao atualizar orçamento.', 'Failed to update budget.')));
    }
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: (id: string) => budgetService.deleteBudget(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success(localize('Orçamento deletado com sucesso!', 'Budget deleted successfully!'));
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error, localize('Erro ao deletar orçamento.', 'Failed to delete budget.')));
    }
  });

  // Helper functions
  const resetForm = () => {
    setFormData({
      name: '',
      allocated: 0,
      categoryId: '',
      period: BudgetPeriod.Monthly,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]
    });
  };

  const formatDateForInput = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toISOString().split('T')[0];
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setFormData({
      name: budget.name,
      allocated: budget.allocated || 0,
      categoryId: budget.categoryId,
      period: budget.period,
      startDate: formatDateForInput(budget.startDate) || new Date().toISOString().split('T')[0],
      endDate: formatDateForInput(budget.endDate) || new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
      description: budget.description
    });
    setShowEditModal(true);
  };

  const handleDelete = (budget: Budget) => {
    if (
      window.confirm(
        localize(
          `Tem certeza que deseja deletar o orçamento "${budget.name}"?`,
          `Are you sure you want to delete the budget "${budget.name}"?`
        )
      )
    ) {
      deleteBudgetMutation.mutate(budget.id);
    }
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('Nome do orçamento é obrigatório');
      return;
    }
    if (!formData.categoryId) {
      toast.error('Categoria é obrigatória');
      return;
    }
    if (formData.allocated <= 0) {
      toast.error('Valor do orçamento deve ser maior que zero');
      return;
    }

    if (editingBudget) {
      updateBudgetMutation.mutate({ id: editingBudget.id, data: formData });
    } else {
      createBudgetMutation.mutate(formData);
    }
  };

  const getBudgetStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getBudgetStatusText = (percentage: number) => {
    if (percentage >= 100) return localize('Excedido', 'Over budget');
    if (percentage >= 90) return localize('Crítico', 'Critical');
    if (percentage >= 75) return localize('Atenção', 'Warning');
    return localize('No orçamento', 'Within budget');
  };

  const getPeriodText = (period: BudgetPeriod) => {
    const options = {
      [BudgetPeriod.Weekly]: localize('Semanal', 'Weekly'),
      [BudgetPeriod.Monthly]: localize('Mensal', 'Monthly'),
      [BudgetPeriod.Quarterly]: localize('Trimestral', 'Quarterly'),
      [BudgetPeriod.Yearly]: localize('Anual', 'Yearly'),
    };
    return options[period] || options[BudgetPeriod.Monthly];
  };

  const totalAllocated = budgets.reduce((sum, budget) => sum + (budget.allocated || 0), 0);
  const totalSpent = budgets.reduce((sum, budget) => sum + (budget.spent || 0), 0);
  const overBudgetCount = budgets.filter(budget => (budget.percentage || 0) >= 90).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {localize('Gerenciamento de Orçamentos', 'Budget Management')}
          </h1>
          <p className="text-gray-600">
            {localize('Controle seus gastos e mantenha-se dentro do orçamento', 'Track spending and stay within budget')}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>{localize('Novo Orçamento', 'New Budget')}</span>
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
              <p className="text-sm text-gray-600">
                {localize('Total Orçado', 'Total Budgeted')}
              </p>
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
              <p className="text-sm text-gray-600">
                {localize('Total Gasto', 'Total Spent')}
              </p>
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
              <p className="text-sm text-gray-600">
                {localize('Saldo Restante', 'Remaining Balance')}
              </p>
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
              <p className="text-sm text-gray-600">
                {localize('Orçamentos Críticos', 'Critical Budgets')}
              </p>
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
          <h2 className="text-lg font-semibold text-gray-900">
            {localize('Orçamentos', 'Budgets')} {getPeriodText(selectedPeriod)}
          </h2>
        </div>
        
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">
                {localize('Carregando orçamentos...', 'Loading budgets...')}
              </p>
            </div>
          ) : budgets.length === 0 ? (
            <EmptyState
              icon={<Target className="h-12 w-12" />}
              title={localize('Nenhum orçamento encontrado', 'No budgets found')}
              description={localize(
                'Comece criando seu primeiro orçamento para controlar seus gastos mensais',
                'Start by creating your first budget to track monthly spending'
              )}
              actionLabel={localize('Criar Primeiro Orçamento', 'Create First Budget')}
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
                        {budget.categoryName} • {new Date(budget.startDate + 'T00:00:00').toLocaleDateString()} - {new Date(budget.endDate + 'T00:00:00').toLocaleDateString()}
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
                      <button 
                        onClick={() => handleEdit(budget)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Editar orçamento"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(budget)}
                        className="text-gray-400 hover:text-red-600"
                        title="Deletar orçamento"
                      >
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
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Orçamento Mensal"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor Orçado</label>
                <input
                  type="number"
                  value={formData.allocated}
                  onChange={(e) => setFormData({ ...formData, allocated: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0,00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <select 
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
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
                <select 
                  value={formData.period}
                  onChange={(e) => setFormData({ ...formData, period: parseInt(e.target.value) as BudgetPeriod })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={BudgetPeriod.Weekly}>Semanal</option>
                  <option value={BudgetPeriod.Monthly}>Mensal</option>
                  <option value={BudgetPeriod.Quarterly}>Trimestral</option>
                  <option value={BudgetPeriod.Yearly}>Anual</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (opcional)</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Descrição do orçamento"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={createBudgetMutation.isPending}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {createBudgetMutation.isPending ? 'Criando...' : 'Criar Orçamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Budget Modal */}
      {showEditModal && editingBudget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Editar Orçamento</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Orçamento Mensal"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor Orçado</label>
                <input
                  type="number"
                  value={formData.allocated}
                  onChange={(e) => setFormData({ ...formData, allocated: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0,00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <select 
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
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
                <select 
                  value={formData.period}
                  onChange={(e) => setFormData({ ...formData, period: parseInt(e.target.value) as BudgetPeriod })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={BudgetPeriod.Weekly}>Semanal</option>
                  <option value={BudgetPeriod.Monthly}>Mensal</option>
                  <option value={BudgetPeriod.Quarterly}>Trimestral</option>
                  <option value={BudgetPeriod.Yearly}>Anual</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (opcional)</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Descrição do orçamento"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingBudget(null);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={updateBudgetMutation.isPending}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {updateBudgetMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 
