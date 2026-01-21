'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { Plus, Tag, Eye, Receipt, DollarSign } from 'lucide-react';
import { Category } from '@/types/category';
import { useCategories } from '@/hooks/useCategories';
import { useTranslation } from '@/i18n/locale-context';
import { CreateCategoryDto, UpdateCategoryDto } from '@/services/categoryService';

type CategoryModalPayload = CreateCategoryDto | (UpdateCategoryDto & { id: string });

// Import new modular components
import { CategoryModal } from './components/CategoryModal';
import { CategoryList } from './components/CategoryList';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';

export const CategoriesPage = () => {
  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const { localize } = useTranslation();

  // Use custom hook
  const { 
    categories, 
    isLoading, 
    createCategory,
    updateCategory,
    deleteCategory,
    isCreating,
    isUpdating,
    isDeleting
  } = useCategories({
    page: 1,
    pageSize: 100,
    includeInactive: true,
    sortBy: 'name',
    sortOrder: 'asc'
  });

  // Computed stats
  const activeCategories = categories.filter(cat => cat.isActive);
  const inactiveCategories = categories.filter(cat => !cat.isActive);
  const totalTransactions = categories.reduce((sum, cat) => sum + cat.transactionCount, 0);
  const totalAmount = categories.reduce((sum, cat) => sum + cat.totalAmount, 0);

  // Modal handlers
  const handleCreateNew = () => {
    setSelectedCategory(null);
    setModalMode('create');
    setShowCategoryModal(true);
  };

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setModalMode('edit');
    setShowCategoryModal(true);
  };

  const handleDelete = (category: Category) => {
    setSelectedCategory(category);
    setShowDeleteModal(true);
  };

  const closeModal = () => {
    setShowCategoryModal(false);
    setShowDeleteModal(false);
    setSelectedCategory(null);
  };

  // Form submission handlers
  const handleCategorySubmit = (data: CategoryModalPayload) => {
    if ('id' in data) {
      // Edit mode - extract id and pass as separate parameters
      const { id, ...updateData } = data;
      updateCategory({ id, data: updateData });
    } else {
      // Create mode
      createCategory(data);
    }
    closeModal();
  };

  const handleDeleteConfirm = (id: string, force?: boolean) => {
    deleteCategory(id, force);
    closeModal();
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {localize('Gerenciamento de Categorias', 'Category Management')}
          </h1>
          <p className="text-gray-600 mt-1">
            {localize(
              'Organize suas transações por categorias para melhor controle financeiro',
              'Organize your transactions into categories for better financial control'
            )}
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          disabled={isCreating}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 shadow-sm disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>{localize('Nova Categoria', 'New Category')}</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Categories */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Categorias</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{categories.length}</p>
              <p className="text-xs text-gray-500 mt-1">
                {inactiveCategories.length > 0 && `${inactiveCategories.length} inativa${inactiveCategories.length > 1 ? 's' : ''}`}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Tag className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Active Categories */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Categorias Ativas</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{activeCategories.length}</p>
              <p className="text-xs text-gray-500 mt-1">
                {categories.length > 0 && `${Math.round((activeCategories.length / categories.length) * 100)}% do total`}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <Eye className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Total Transactions */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Transações</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{totalTransactions.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-gray-500 mt-1">
                {categories.length > 0 && `Média: ${Math.round(totalTransactions / categories.length)} por categoria`}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Receipt className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Total Amount */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Valor Total</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{formatCurrency(totalAmount)}</p>
              <p className="text-xs text-gray-500 mt-1">
                Todas as categorias
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Categories List Component */}
      <CategoryList
        categories={categories}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreateNew={handleCreateNew}
      />

      {/* Category Modal */}
      <CategoryModal
        isOpen={showCategoryModal}
        onClose={closeModal}
        category={selectedCategory}
        mode={modalMode}
        onSubmit={handleCategorySubmit}
        isSubmitting={isCreating || isUpdating}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={closeModal}
        category={selectedCategory}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  );
};
