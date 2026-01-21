'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryService } from '@/services/categoryService';
import { accountService } from '@/services/accountService';
import { transactionService } from '@/services/transactionService';
import { TransactionType } from '@/types/transaction';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n/locale-context';
import { Pencil } from 'lucide-react';

interface EditTransactionDialogProps {
  transaction: {
    id: string;
    description: string;
    amount: number;
    type: TransactionType;
    categoryId?: string;
    accountId: string;
    transactionDate: string;
    isRecurring: boolean;
    notes?: string;
    reference?: string;
  };
  onSuccess?: () => void;
  children?: React.ReactNode;
}

export const EditTransactionDialog = ({ transaction, onSuccess, children }: EditTransactionDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: '',
    categoryId: '',
    accountId: '',
    transactionDate: '',
    isRecurring: false,
    notes: '',
    reference: ''
  });

  const queryClient = useQueryClient();

  // Fetch categories and accounts
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories(),
  });

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountService.getAccounts(),
  });

  const categories = categoriesData?.items || [];
  const accounts = accountsData?.items || [];
  const { localize } = useTranslation();

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => transactionService.updateTransaction(transaction.id, data),
    onSuccess: () => {
      toast.success(localize('Transação atualizada com sucesso!', 'Transaction updated successfully!'));
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setOpen(false);
      onSuccess?.();
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      console.error('Error updating transaction:', error);
      toast.error(
        error.response?.data?.message || localize('Falha ao atualizar a transação.', 'Failed to update transaction')
      );
    },
  });

  // Initialize form data when transaction changes
  useEffect(() => {
    if (transaction) {
      setFormData({
        description: transaction.description,
        amount: transaction.amount.toString(),
        type: transaction.type.toString(),
        categoryId: transaction.categoryId || '',
        accountId: transaction.accountId,
        transactionDate: transaction.transactionDate.split('T')[0],
        isRecurring: transaction.isRecurring,
        notes: transaction.notes || '',
        reference: transaction.reference || ''
      });
    }
  }, [transaction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData = {
        description: formData.description.trim(),
        amount: parseFloat(formData.amount),
        type: parseInt(formData.type!) as TransactionType,
        categoryId: formData.categoryId || undefined,
        accountId: formData.accountId,
        transactionDate: formData.transactionDate,
        isRecurring: formData.isRecurring,
        notes: formData.notes.trim() || undefined,
        reference: formData.reference.trim() || undefined
      };

      await updateMutation.mutateAsync(updateData);
    } catch (error) {
      console.error('Error in handleSubmit:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
          <DialogDescription>
            Update the transaction details and save your changes.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="description">{localize('Descrição', 'Description')}</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder={localize('Informe a descrição', 'Enter description')}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">{localize('Valor', 'Amount')}</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">{localize('Tipo', 'Type')}</Label>
              <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder={localize('Selecione o tipo', 'Select type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">{localize('Receita', 'Income')}</SelectItem>
                  <SelectItem value="1">{localize('Despesa', 'Expense')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transactionDate">{localize('Data', 'Date')}</Label>
              <Input
                id="transactionDate"
                type="date"
                value={formData.transactionDate}
                onChange={(e) => handleInputChange('transactionDate', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">{localize('Categoria', 'Category')}</Label>
              <Select value={formData.categoryId} onValueChange={(value) => handleInputChange('categoryId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder={localize('Selecione a categoria', 'Select category')} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category: { id: string; name: string }) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="account">{localize('Conta', 'Account')}</Label>
              <Select value={formData.accountId} onValueChange={(value) => handleInputChange('accountId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder={localize('Selecione a conta', 'Select account')} />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account: { id: string; name: string }) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">{localize('Referência (Opcional)', 'Reference (Optional)')}</Label>
            <Input
              id="reference"
              value={formData.reference}
              onChange={(e) => handleInputChange('reference', e.target.value)}
              placeholder={localize('Informe uma referência', 'Enter reference')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{localize('Observações (Opcional)', 'Notes (Optional)')}</Label>
            <Input
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder={localize('Informe observações', 'Enter notes')}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isRecurring"
              checked={formData.isRecurring}
              onChange={(e) => handleInputChange('isRecurring', e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="isRecurring">{localize('Transação recorrente', 'Recurring Transaction')}</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {localize('Cancelar', 'Cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? localize('Atualizando...', 'Updating...') : localize('Atualizar transação', 'Update Transaction')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 
