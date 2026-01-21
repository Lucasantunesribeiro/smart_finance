'use client';

import { useState } from 'react';
import { Edit3, Trash2, Plus, Search, Filter, Eye, EyeOff, TrendingUp, BarChart3 } from 'lucide-react';
import { Category, CategoryType } from '@/types/category';
import { formatCurrency } from '@/lib/utils';

interface CategoryListProps {
  categories: Category[];
  isLoading: boolean;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onCreateNew: () => void;
}

export const CategoryList = ({ categories, isLoading, onEdit, onDelete, onCreateNew }: CategoryListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [showInactive, setShowInactive] = useState(false);

  // Filtrar categorias
  const filteredCategories = categories.filter(category => {
    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (category.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    
    const matchesType = filterType === 'all' || 
                       (filterType === 'income' && category.type === CategoryType.Income) ||
                       (filterType === 'expense' && category.type === CategoryType.Expense);
    
    const matchesActive = showInactive || category.isActive;

    return matchesSearch && matchesType && matchesActive;
  });

  const getCategoryTypeInfo = (type: CategoryType) => {
    switch (type) {
      case CategoryType.Income:
        return { label: 'Receita', color: 'text-green-600 bg-green-50', icon: '💰' };
      case CategoryType.Expense:
        return { label: 'Despesa', color: 'text-red-600 bg-red-50', icon: '💸' };
      case CategoryType.Transfer:
        return { label: 'Transferência', color: 'text-blue-600 bg-blue-50', icon: '🔄' };
      case CategoryType.Investment:
        return { label: 'Investimento', color: 'text-purple-600 bg-purple-50', icon: '📈' };
      default:
        return { label: 'Outro', color: 'text-gray-600 bg-gray-50', icon: '📦' };
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Carregando categorias...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header with Search and Filters */}
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar categorias..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter by Type */}
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'all' | 'income' | 'expense')}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Todos os tipos</option>
                <option value="income">Receitas</option>
                <option value="expense">Despesas</option>
              </select>
            </div>

            {/* Show Inactive Toggle */}
            <button
              onClick={() => setShowInactive(!showInactive)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
                showInactive 
                  ? 'bg-blue-50 border-blue-200 text-blue-700' 
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {showInactive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span className="text-sm">Inativas</span>
            </button>

            {/* Create New Button */}
            <button
              onClick={onCreateNew}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Categoria</span>
            </button>
          </div>
        </div>

        {/* Results Counter */}
        <div className="mt-4 text-sm text-gray-600">
          Mostrando {filteredCategories.length} de {categories.length} categorias
        </div>
      </div>

      {/* Categories Grid */}
      <div className="p-6">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'Nenhuma categoria encontrada' : 'Nenhuma categoria criada'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm 
                ? 'Tente buscar com outros termos ou ajuste os filtros'
                : 'Crie sua primeira categoria para organizar suas transações'
              }
            </p>
            {!searchTerm && (
              <button
                onClick={onCreateNew}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
              >
                <Plus className="w-5 h-5" />
                <span>Criar Primeira Categoria</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.map((category) => {
              const typeInfo = getCategoryTypeInfo(category.type);
              
              return (
                <div
                  key={category.id}
                  className={`relative group bg-white border-2 rounded-xl p-6 hover:shadow-lg transition-all duration-300 ${
                    category.isActive 
                      ? 'border-gray-200 hover:border-blue-300' 
                      : 'border-gray-100 bg-gray-50 opacity-75'
                  }`}
                >
                  {/* Status Indicator */}
                  {!category.isActive && (
                    <div className="absolute top-3 right-3">
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                        Inativa
                      </span>
                    </div>
                  )}

                  {/* Category Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-14 h-14 rounded-full flex items-center justify-center text-white text-2xl shadow-sm"
                        style={{ backgroundColor: category.color }}
                      >
                        {category.icon || '📦'}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {category.name}
                        </h3>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${typeInfo.color}`}>
                          <span className="mr-1">{typeInfo.icon}</span>
                          {typeInfo.label}
                        </div>
                      </div>
                    </div>

                    {/* Actions Menu */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => onEdit(category)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar categoria"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete(category)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Deletar categoria"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {category.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {category.description}
                    </p>
                  )}

                  {/* Statistics */}
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <BarChart3 className="w-4 h-4" />
                        <span>Transações</span>
                      </div>
                      <span className="font-semibold text-gray-900">
                        {category.transactionCount.toLocaleString('pt-BR')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <TrendingUp className="w-4 h-4" />
                        <span>Total</span>
                      </div>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(category.totalAmount)}
                      </span>
                    </div>

                    {/* Average per transaction */}
                    {category.transactionCount > 0 && (
                      <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-100">
                        Média: {formatCurrency(category.totalAmount / category.transactionCount)} por transação
                      </div>
                    )}
                  </div>

                  {/* Updated date */}
                  <div className="mt-4 text-xs text-gray-400 text-center">
                    Atualizada em {new Date(category.updatedAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
