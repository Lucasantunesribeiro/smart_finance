'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { categoryService } from '@/services/categoryService';
import { accountService } from '@/services/accountService';
import { transactionService } from '@/services/transactionService';
import { TransactionType } from '@/types/transaction';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n/locale-context';

interface AddTransactionDialogProps {
  children: React.ReactNode;
  onSuccess?: () => void;
}

const initialFormState = {
  description: '',
  amount: '',
  type: '',
  categoryId: '',
  accountId: '',
  transactionDate: new Date().toISOString().split('T')[0],
};

export const AddTransactionDialog = ({ children, onSuccess }: AddTransactionDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const { localize } = useTranslation();

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () =>
      categoryService.getCategories({
        page: 1,
        pageSize: 50,
        sortBy: 'name',
        sortOrder: 'asc',
      }),
  });

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () =>
      accountService.getAccounts({
        page: 1,
        pageSize: 50,
        sortBy: 'name',
        sortOrder: 'asc',
      }),
  });

  const categories = categoriesData?.items || [];
  const accounts = accountsData?.items || [];

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData(initialFormState);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const errors: string[] = [];

      if (!formData.description.trim()) {
        errors.push(localize('Descrição é obrigatória', 'Description is required'));
      }
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        errors.push(localize('Valor deve ser maior que zero', 'Amount must be greater than zero'));
      }
      if (!formData.type) {
        errors.push(localize('Tipo de transação é obrigatório', 'Transaction type is required'));
      }
      if (!formData.categoryId) {
        errors.push(localize('Categoria é obrigatória', 'Category is required'));
      }

      if (errors.length > 0) {
        toast.error(
          localize(
            `Erros de validação: ${errors.join(', ')}`,
            `Validation errors: ${errors.join(', ')}`
          )
        );
        return;
      }

      const selectedAccountId = formData.accountId || (accounts.length > 0 ? accounts[0].id : '');

      if (!selectedAccountId) {
        toast.error(localize('Nenhuma conta disponível. Crie uma conta primeiro.', 'No accounts available. Please create one first.'));
        return;
      }

      await transactionService.createTransaction({
        description: formData.description.trim(),
        amount: parseFloat(formData.amount),
        type: parseInt(formData.type, 10),
        categoryId: formData.categoryId,
        accountId: selectedAccountId,
        transactionDate: formData.transactionDate,
        isRecurring: false,
        tagNames: [],
      });

      toast.success(localize('Transação criada com sucesso!', 'Transaction created successfully!'));
      resetForm();
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast.error(localize('Erro ao criar transação. Tente novamente.', 'Failed to create transaction. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{localize('Adicionar nova transação', 'Add New Transaction')}</DialogTitle>
          <DialogDescription>
            {localize(
              'Informe os dados da transação para registrá-la.',
              'Provide the transaction details to add it to your records.'
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">{localize('Descrição *', 'Description *')}</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder={localize('Informe a descrição', 'Enter transaction description')}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">{localize('Valor *', 'Amount *')}</Label>
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

          <div className="space-y-2">
            <Label htmlFor="type">{localize('Tipo *', 'Type *')}</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => handleInputChange('type', value)}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder={localize('Selecione o tipo', 'Select transaction type')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TransactionType.Expense.toString()}>
                  {localize('Despesa', 'Expense')}
                </SelectItem>
                <SelectItem value={TransactionType.Income.toString()}>
                  {localize('Receita', 'Income')}
                </SelectItem>
                <SelectItem value={TransactionType.Transfer.toString()}>
                  {localize('Transferência', 'Transfer')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">{localize('Categoria *', 'Category *')}</Label>
            <Select
              value={formData.categoryId}
              onValueChange={(value) => handleInputChange('categoryId', value)}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder={localize('Selecione a categoria', 'Select category (required)')} />
              </SelectTrigger>
              <SelectContent>
                {categories.length > 0 ? (
                  categories.map((category: { id: string; name: string }) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))
                ) : (
                  <>
                    <SelectItem value="11111111-1111-1111-1111-111111111001">🍽️ Alimentação</SelectItem>
                    <SelectItem value="11111111-1111-1111-1111-111111111002">🚌 Transporte</SelectItem>
                    <SelectItem value="11111111-1111-1111-1111-111111111003">🎮 Lazer</SelectItem>
                    <SelectItem value="11111111-1111-1111-1111-111111111004">🪙 Salário</SelectItem>
                    <SelectItem value="11111111-1111-1111-1111-111111111005">📦 Outros</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountId">{localize('Conta', 'Account')}</Label>
            <Select
              value={formData.accountId}
              onValueChange={(value) => handleInputChange('accountId', value)}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    accounts.length > 0
                      ? localize('Selecione a conta (opcional)', 'Select account (optional)')
                      : localize('Nenhuma conta disponível', 'No accounts available')
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {accounts.length > 0 ? (
                  accounts.map((account: { id: string; name: string }) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-accounts" disabled>
                    {localize('Nenhuma conta disponível', 'No accounts available')}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {accounts.length === 0 && (
              <p className="text-sm text-amber-600">
                {localize(
                  '⚠️ Nenhuma conta encontrada. Crie uma conta primeiro.',
                  '⚠️ No accounts found. Please create an account first.'
                )}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="transactionDate">{localize('Data', 'Date')}</Label>
            <Input
              id="transactionDate"
              type="date"
              value={formData.transactionDate}
              onChange={(e) => handleInputChange('transactionDate', e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {localize('Cancelar', 'Cancel')}
            </Button>
            <Button type="submit" disabled={loading || accounts.length === 0}>
              {loading ? localize('Criando...', 'Creating...') : localize('Criar transação', 'Create Transaction')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
