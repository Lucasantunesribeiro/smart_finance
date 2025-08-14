'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { categoryService } from '@/services/categoryService';
import { formatCurrency } from '@/lib/utils';
import { Plus, Edit, Trash2, Tag, Eye, EyeOff, Receipt, DollarSign } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';

export const CategoriesPage = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Conectando com backend real
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories', searchTerm, showInactive],
    queryFn: () => categoryService.getCategories({
      page: 1,
      pageSize: 50,
      search: searchTerm,
      includeInactive: showInactive,
      sortBy: 'name',
      sortOrder: 'asc'
    }).then(response => response.items)
  });

  const filteredCategories = categories.filter(category => {
    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = showInactive ? true : category.isActive;
    return matchesSearch && matchesStatus;
  });

  const activeCategories = categories.filter(cat => cat.isActive);
  const totalTransactions = categories.reduce((sum, cat) => sum + cat.transactionCount, 0);
  const totalAmount = categories.reduce((sum, cat) => sum + cat.totalAmount, 0);

  const getIconComponent = (iconName: string) => {
    // Você pode expandir isso com mais ícones conforme necessário
    switch (iconName) {
      case 'UtensilsCrossed':
        return '🍽️';
      case 'Car':
        return '🚗';
      case 'Music':
        return '🎵';
      case 'Receipt':
        return '🧾';
      case 'DollarSign':
        return '💰';
      default:
        return '📁';
    }
  };

  const colorOptions = [
    { name: 'Vermelho', value: '#ef4444' },
    { name: 'Azul', value: '#3b82f6' },
    { name: 'Verde', value: '#22c55e' },
    { name: 'Amarelo', value: '#f59e0b' },
    { name: 'Roxo', value: '#8b5cf6' },
    { name: 'Rosa', value: '#ec4899' },
    { name: 'Laranja', value: '#f97316' },
    { name: 'Ciano', value: '#06b6d4' },
    { name: 'Lime', value: '#84cc16' },
    { name: 'Índigo', value: '#6366f1' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Categorias</h1>
          <p className="text-gray-600">Organize suas transações por categorias</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Categoria</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <input
            type="text"
            placeholder="Buscar categorias..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setShowInactive(!showInactive)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${
              showInactive
                ? 'bg-gray-100 text-gray-700'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {showInactive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{showInactive ? 'Ocultar Inativas' : 'Mostrar Inativas'}</span>
          </button>
        </div>
        <div className="text-sm text-gray-600">
          {filteredCategories.length} de {categories.length} categorias
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total de Categorias</p>
              <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
            </div>
            <Tag className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Categorias Ativas</p>
              <p className="text-2xl font-bold text-green-600">{activeCategories.length}</p>
            </div>
            <Eye className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total de Transações</p>
              <p className="text-2xl font-bold text-blue-600">{totalTransactions}</p>
            </div>
            <Receipt className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Valor Total</p>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(totalAmount)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Categorias</h2>
        </div>
        
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Carregando categorias...</p>
            </div>
          ) : filteredCategories.length === 0 ? (
            <EmptyState
              icon={<Tag className="h-12 w-12" />}
              title={searchTerm ? 'Nenhuma categoria encontrada' : 'Nenhuma categoria criada'}
              description={searchTerm ? 'Tente usar outros termos de busca' : 'Comece criando categorias para organizar suas transações financeiras'}
              actionLabel={!searchTerm ? 'Criar Primeira Categoria' : undefined}
              onAction={!searchTerm ? () => setShowCreateModal(true) : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCategories.map((category) => (
                <div
                  key={category.id}
                  className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                    !category.isActive ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                        style={{ backgroundColor: category.color }}
                      >
                        {getIconComponent(category.icon || 'Tag')}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{category.name}</h3>
                        <p className="text-sm text-gray-600">{category.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        category.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {category.isActive ? 'Ativa' : 'Inativa'}
                      </span>
                      <button className="text-gray-400 hover:text-gray-600">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-gray-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Transações</p>
                      <p className="font-semibold">{category.transactionCount}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Valor Total</p>
                      <p className="font-semibold">{formatCurrency(category.totalAmount)}</p>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-gray-500">
                      Criada em {new Date(category.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Category Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Criar Nova Categoria</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Alimentação"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Descrição da categoria (opcional)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cor</label>
                <div className="grid grid-cols-5 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      className="w-8 h-8 rounded-full border-2 border-gray-300 hover:border-gray-400"
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ícone</label>
                <div className="grid grid-cols-6 gap-2">
                  {['🍽️', '🚗', '🎵', '🧾', '💰', '🏠', '🛒', '⚽', '🎯', '📚', '💊', '✈️'].map((icon) => (
                    <button
                      key={icon}
                      className="w-8 h-8 border rounded-lg hover:bg-gray-100 flex items-center justify-center"
                    >
                      {icon}
                    </button>
                  ))}
                </div>
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
                  toast.success('Categoria criada com sucesso!');
                  setShowCreateModal(false);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Criar Categoria
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 