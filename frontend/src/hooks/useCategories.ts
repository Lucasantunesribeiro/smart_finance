import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryService, CreateCategoryDto, UpdateCategoryDto, CategoryFilter } from '@/services/categoryService';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n/locale-context';
import { extractErrorMessage } from '@/lib/errorHelpers';

export const useCategories = (filter?: CategoryFilter) => {
  const queryClient = useQueryClient();
  const { localize } = useTranslation();

  // Query para buscar categorias
  const categoriesQuery = useQuery({
    queryKey: ['categories', filter],
    queryFn: () => categoryService.getCategories(filter),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // Mutation para criar categoria
  const createCategoryMutation = useMutation({
    mutationFn: (data: CreateCategoryDto) => categoryService.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success(localize('Categoria criada com sucesso!', 'Category created successfully!'));
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error, localize('Erro ao criar categoria.', 'Failed to create category.')));
    }
  });

  // Mutation para atualizar categoria
  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCategoryDto }) => 
      categoryService.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success(localize('Categoria atualizada com sucesso!', 'Category updated successfully!'));
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error, localize('Erro ao atualizar categoria.', 'Failed to update category.')));
    }
  });

  // Mutation para deletar categoria
  const deleteCategoryMutation = useMutation({
    mutationFn: ({ id, force }: { id: string; force?: boolean }) => 
      categoryService.deleteCategory(id, force),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      if (variables.force) {
        toast.success(localize('Categoria e transações deletadas com sucesso!', 'Category and transactions deleted successfully!'));
      } else {
        toast.success(localize('Categoria deletada com sucesso!', 'Category deleted successfully!'));
      }
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error, localize('Erro ao deletar categoria.', 'Failed to delete category.')));
    }
  });

  // Wrapper function to handle both single string and object parameters
  const handleDeleteCategory = (idOrParams: string | { id: string; force?: boolean }, force?: boolean) => {
    if (typeof idOrParams === 'string') {
      deleteCategoryMutation.mutate({ id: idOrParams, force });
    } else {
      deleteCategoryMutation.mutate(idOrParams);
    }
  };

  return {
    // Data
    categories: categoriesQuery.data?.items ?? [],
    totalCount: categoriesQuery.data?.totalCount ?? 0,
    isLoading: categoriesQuery.isLoading,
    isError: categoriesQuery.isError,
    error: categoriesQuery.error,
    
    // Mutations
    createCategory: createCategoryMutation.mutate,
    updateCategory: updateCategoryMutation.mutate,
    deleteCategory: handleDeleteCategory,
    
    // Loading states
    isCreating: createCategoryMutation.isPending,
    isUpdating: updateCategoryMutation.isPending,
    isDeleting: deleteCategoryMutation.isPending,
    
    // Refetch
    refetch: categoriesQuery.refetch
  };
};
