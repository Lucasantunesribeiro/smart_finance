import { CategoryType } from '@/types/category';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface CategoryFormData {
  name: string;
  type: CategoryType;
  description?: string;
  color: string;
  icon: string;
}

export const validateCategoryForm = (data: CategoryFormData): ValidationResult => {
  const errors: Record<string, string> = {};

  // Validar nome
  if (!data.name || !data.name.trim()) {
    errors.name = 'Nome da categoria é obrigatório';
  } else if (data.name.trim().length < 2) {
    errors.name = 'Nome deve ter pelo menos 2 caracteres';
  } else if (data.name.trim().length > 50) {
    errors.name = 'Nome deve ter no máximo 50 caracteres';
  } else if (!/^[a-zA-ZÀ-ÿ0-9\s\-_\.]+$/.test(data.name.trim())) {
    errors.name = 'Nome contém caracteres inválidos';
  }

  // Validar tipo
  if (data.type === undefined || data.type === null) {
    errors.type = 'Tipo da categoria é obrigatório';
  } else if (!Object.values(CategoryType).includes(data.type)) {
    errors.type = 'Tipo de categoria inválido';
  }

  // Validar descrição (opcional)
  if (data.description && data.description.length > 200) {
    errors.description = 'Descrição deve ter no máximo 200 caracteres';
  }

  // Validar cor
  if (!data.color) {
    errors.color = 'Cor é obrigatória';
  } else if (!/^#[0-9A-F]{6}$/i.test(data.color)) {
    errors.color = 'Cor deve estar no formato hexadecimal (#RRGGBB)';
  }

  // Validar ícone
  if (!data.icon || !data.icon.trim()) {
    errors.icon = 'Ícone é obrigatório';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const sanitizeCategoryName = (name: string): string => {
  return name.trim().replace(/\s+/g, ' ');
};

export const isValidColor = (color: string): boolean => {
  return /^#[0-9A-F]{6}$/i.test(color);
};

export const isValidIcon = (icon: string): boolean => {
  return icon.trim().length > 0;
};