'use client';

import { useState, useEffect } from 'react';
import { X, Save, Palette, Tag, Hash } from 'lucide-react';
import { Category, CategoryType } from '@/types/category';
import { CreateCategoryDto, UpdateCategoryDto } from '@/services/categoryService';

type CategoryModalPayload = CreateCategoryDto | (UpdateCategoryDto & { id: string });

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category | null;
  mode: 'create' | 'edit';
  onSubmit: (data: CategoryModalPayload) => void;
  isSubmitting: boolean;
}

// Lista de ícones disponíveis com emojis
const AVAILABLE_ICONS = [
  { emoji: '🍽️', name: 'Alimentação' },
  { emoji: '🚗', name: 'Transporte' },
  { emoji: '💼', name: 'Trabalho' },
  { emoji: '📈', name: 'Investimentos' },
  { emoji: '🏥', name: 'Saúde' },
  { emoji: '📚', name: 'Educação' },
  { emoji: '🎮', name: 'Lazer' },
  { emoji: '🏠', name: 'Casa' },
  { emoji: '👕', name: 'Roupas' },
  { emoji: '⚡', name: 'Energia' },
  { emoji: '📱', name: 'Telefone' },
  { emoji: '💡', name: 'Utilidades' },
  { emoji: '🎭', name: 'Entretenimento' },
  { emoji: '✈️', name: 'Viagem' },
  { emoji: '💊', name: 'Remédios' },
  { emoji: '🏋️', name: 'Academia' },
  { emoji: '🐕', name: 'Pets' },
  { emoji: '💰', name: 'Salário' },
  { emoji: '🎁', name: 'Presentes' },
  { emoji: '📦', name: 'Outros' }
];

// Cores disponíveis
const AVAILABLE_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
  '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
  '#EE5A24', '#0FB9B1', '#3742FA', '#2F3542', '#57606F',
  '#2ED573', '#FFA502', '#FF3838', '#1E90FF', '#FF1493'
];

export const CategoryModal = ({ isOpen, onClose, category, mode, onSubmit, isSubmitting }: CategoryModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: CategoryType.Expense,
    color: '#FF6B6B',
    icon: '📦'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (category && mode === 'edit') {
      setFormData({
        name: category.name,
        description: category.description || '',
        type: category.type,
        color: category.color,
        icon: category.icon || '📦'
      });
    } else {
      setFormData({
        name: '',
        description: '',
        type: CategoryType.Expense,
        color: '#FF6B6B',
        icon: '📦'
      });
    }
    setErrors({});
  }, [category, mode, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (formData.name.trim().length < 2) {
      newErrors.name = 'Nome deve ter pelo menos 2 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const submitData = mode === 'edit'
      ? { ...formData, id: category?.id ?? '' }
      : formData;

    onSubmit(submitData);
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg"
              style={{ backgroundColor: formData.color }}
            >
              {formData.icon}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {mode === 'create' ? 'Nova Categoria' : 'Editar Categoria'}
              </h2>
              <p className="text-sm text-gray-500">
                {mode === 'create' ? 'Crie uma nova categoria para organizar suas transações' : 'Modifique os dados da categoria'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nome da Categoria */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Tag className="inline w-4 h-4 mr-1" />
              Nome da Categoria
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Ex: Alimentação, Transporte..."
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição (opcional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Descreva brevemente esta categoria..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
            />
          </div>

          {/* Tipo de Categoria */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Hash className="inline w-4 h-4 mr-1" />
              Tipo de Categoria
            </label>
            <select
              value={formData.type}
              onChange={(e) => handleChange('type', Number(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value={CategoryType.Income}>Receita</option>
              <option value={CategoryType.Expense}>Despesa</option>
            </select>
          </div>

          {/* Seleção de Ícone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Ícone da Categoria
            </label>
            <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-lg">
              {AVAILABLE_ICONS.map((iconData, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleChange('icon', iconData.emoji)}
                  className={`w-10 h-10 text-xl rounded-lg border-2 hover:border-blue-400 transition-colors flex items-center justify-center ${
                    formData.icon === iconData.emoji 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  title={iconData.name}
                >
                  {iconData.emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Seleção de Cor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Palette className="inline w-4 h-4 mr-1" />
              Cor da Categoria
            </label>
            <div className="grid grid-cols-10 gap-2">
              {AVAILABLE_COLORS.map((color, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleChange('color', color)}
                  className={`w-8 h-8 rounded-full border-2 hover:scale-110 transition-transform ${
                    formData.color === color 
                      ? 'border-gray-800 ring-2 ring-gray-300' 
                      : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">Preview</p>
            <div className="flex items-center space-x-3">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl"
                style={{ backgroundColor: formData.color }}
              >
                {formData.icon}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {formData.name || 'Nome da categoria'}
                </p>
                <p className="text-sm text-gray-500">
                  {formData.type === CategoryType.Income ? 'Receita' : 'Despesa'}
                </p>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Salvando...' : mode === 'create' ? 'Criar Categoria' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
