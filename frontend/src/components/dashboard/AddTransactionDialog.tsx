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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface AddTransactionDialogProps {
  children: React.ReactNode;
  onSuccess?: () => void;
}

export const AddTransactionDialog = ({ 
  children, 
  onSuccess 
}: AddTransactionDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: '',
    categoryId: '',
    accountId: '',
    transactionDate: new Date().toISOString().split('T')[0]
  });

  // Fetch categories for dropdown
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories({
      page: 1,
      pageSize: 50,
      sortBy: 'name',
      sortOrder: 'asc'
    }),
  });

  // Fetch user accounts for dropdown
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountService.getAccounts({
      page: 1,
      pageSize: 50,
      sortBy: 'name',
      sortOrder: 'asc'
    }),
  });

  const categories = categoriesData?.items || [];
  const accounts = accountsData?.items || [];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validação antes de criar os dados da transação
      console.log('=== PRE-SEND VALIDATION ===');
      console.log('Form data before processing:', formData);
      
      // Validar campos obrigatórios
      const errors = [];
      if (!formData.description.trim()) {
        errors.push('Descrição é obrigatória');
      }
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        errors.push('Valor deve ser maior que zero');
      }
      if (!formData.type) {
        errors.push('Tipo de transação é obrigatório');
      }
      if (!formData.categoryId) {
        errors.push('Categoria é obrigatória');
      }
      
      if (errors.length > 0) {
        console.error('❌ Validation errors:', errors);
        toast.error(`Erros de validação: ${errors.join(', ')}`);
        return;
      }

      // Use the selected accountId or the first available account
      const selectedAccountId = formData.accountId || (accounts.length > 0 ? accounts[0].id : '');
      
      if (!selectedAccountId) {
        toast.error('Nenhuma conta disponível. Crie uma conta primeiro.');
        return;
      }

      const transactionData = {
        description: formData.description.trim(),
        amount: parseFloat(formData.amount),
        type: parseInt(formData.type),
        categoryId: formData.categoryId, // ✅ Sempre obrigatório
        accountId: selectedAccountId, // Use selected or first available account
        transactionDate: formData.transactionDate,
        isRecurring: false,
        tagNames: []
      };
      
      console.log('✅ Validation passed. Transaction data:', transactionData);

      await transactionService.createTransaction(transactionData);
      
      toast.success('Transaction created successfully!');
      
      // Reset form
      setFormData({
        description: '',
        amount: '',
        type: '',
        categoryId: '',
        accountId: '',
        transactionDate: new Date().toISOString().split('T')[0]
      });
      
      setOpen(false);
      
      // Call onSuccess callback to refresh data
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast.error('Failed to create transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter transaction description"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
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
            <Label htmlFor="type">Type *</Label>
            <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)} required>
              <SelectTrigger>
                <SelectValue placeholder="Select transaction type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TransactionType.Expense.toString()}>Expense</SelectItem>
                <SelectItem value={TransactionType.Income.toString()}>Income</SelectItem>
                <SelectItem value={TransactionType.Transfer.toString()}>Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={formData.categoryId} onValueChange={(value) => handleInputChange('categoryId', value)} required>
              <SelectTrigger>
                <SelectValue placeholder="Select category (required)" />
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
                    <SelectItem value="11111111-1111-1111-1111-111111111002">🚗 Transporte</SelectItem>
                    <SelectItem value="11111111-1111-1111-1111-111111111003">🎬 Lazer</SelectItem>
                    <SelectItem value="11111111-1111-1111-1111-111111111004">💰 Salário</SelectItem>
                    <SelectItem value="11111111-1111-1111-1111-111111111005">📦 Outros</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountId">Account</Label>
            <Select value={formData.accountId} onValueChange={(value) => handleInputChange('accountId', value)}>
              <SelectTrigger>
                <SelectValue placeholder={accounts.length > 0 ? "Select account (optional)" : "No accounts available"} />
              </SelectTrigger>
              <SelectContent>
                {accounts.length > 0 ? (
                  accounts.map((account: { id: string; name: string; type: number }) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="" disabled>No accounts available</SelectItem>
                )}
              </SelectContent>
            </Select>
            {accounts.length === 0 && (
              <p className="text-sm text-amber-600">
                ⚠️ No accounts found. Please create an account first.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="transactionDate">Date</Label>
            <Input
              id="transactionDate"
              type="date"
              value={formData.transactionDate}
              onChange={(e) => handleInputChange('transactionDate', e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || accounts.length === 0}>
              {loading ? 'Creating...' : 'Create Transaction'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};