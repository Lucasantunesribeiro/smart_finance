'use client';

import { AlertTriangle, X, Trash2 } from 'lucide-react';
import { Category } from '@/types/category';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category | null;
  onConfirm: (id: string, force?: boolean) => void;
  isDeleting: boolean;
}

export const DeleteConfirmationModal = ({ isOpen, onClose, category, onConfirm, isDeleting }: DeleteConfirmationModalProps) => {
  if (!isOpen || !category) return null;

  const hasTransactions = category.transactionCount > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Confirmar Exclusão</h2>
              <p className="text-sm text-gray-500">Esta ação não pode ser desfeita</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Category Preview */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg"
                style={{ backgroundColor: category.color }}
              >
                {category.icon || '📦'}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{category.name}</h3>
                <p className="text-sm text-gray-500">
                  {category.transactionCount} transações • Total: R$ {category.totalAmount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Warning Message */}
          <div className="mb-6">
            <p className="text-gray-700">
              Você está prestes a excluir a categoria <strong>&quot;{category.name}&quot;</strong>.
            </p>

            {hasTransactions ? (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-yellow-800 font-medium text-sm">
                      Esta categoria possui {category.transactionCount} transação{category.transactionCount > 1 ? 'ões' : ''} associada{category.transactionCount > 1 ? 's' : ''}.
                    </p>
                    <p className="text-yellow-700 text-sm mt-1">
                      As transações serão movidas para a categoria &quot;Outros&quot; automaticamente.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <p className="text-green-800 text-sm">
                    Esta categoria não possui transações associadas e pode ser excluída com segurança.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={() => onConfirm(category.id, hasTransactions)}
              disabled={isDeleting}
              className="flex-1 bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>
                {isDeleting ? 'Excluindo...' : 'Excluir Categoria'}
              </span>
            </button>
          </div>

          {/* Additional Warning */}
          <p className="text-xs text-gray-500 text-center mt-4">
            ⚠️ Esta ação é permanente e não pode ser desfeita
          </p>
        </div>
      </div>
    </div>
  );
};
