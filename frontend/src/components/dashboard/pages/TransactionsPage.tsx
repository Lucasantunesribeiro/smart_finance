'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@/services/transactionService';
import { formatCurrency } from '@/lib/utils';
import { Plus, ArrowUpRight, ArrowDownRight, Filter, Search, Trash2, MoreHorizontal, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AddTransactionDialog } from '@/components/dashboard/AddTransactionDialog';
import { EditTransactionDialog } from '@/components/dashboard/EditTransactionDialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n/locale-context';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: number; // 0: Income, 1: Expense
  categoryName?: string;
  transactionDate: string;
  status: number; // 0: Pending, 1: Completed, 2: Failed
  accountId: string;
  categoryId?: string;
  isRecurring: boolean;
  notes?: string;
  reference?: string;
}

export const TransactionsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

  const { localize } = useTranslation();
  const queryClient = useQueryClient();

  // Fetch transactions
  const { data: transactionsData, isLoading, refetch } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => transactionService.getTransactions({
      page: 1,
      pageSize: 50,
      sortBy: 'transactionDate',
      sortOrder: 'desc'
    }),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => transactionService.deleteTransaction(id),
    onSuccess: () => {
      toast.success(localize('Transação removida com sucesso!', 'Transaction deleted successfully!'));
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      console.error('Error deleting transaction:', error);
      toast.error(
        error.response?.data?.message ||
          localize('Falha ao remover a transação. Tente novamente.', 'Failed to delete transaction')
      );
    },
  });

  const transactions = transactionsData?.items || [];

  const getTypeIcon = (type: number) => {
    switch (type) {
      case 0: // Income
        return <ArrowUpRight className="w-4 h-4 text-green-600" />;
      case 1: // Expense
        return <ArrowDownRight className="w-4 h-4 text-red-600" />;
      default:
        return <ArrowUpRight className="w-4 h-4 text-gray-600" />;
    }
  };

  const getAmountColor = (type: number) => {
    switch (type) {
      case 0: return 'text-green-600'; // Income
      case 1: return 'text-red-600'; // Expense
      default: return 'text-gray-600';
    }
  };

  const getAmountPrefix = (type: number) => {
    switch (type) {
      case 0: return '+'; // Income
      case 1: return '-'; // Expense
      default: return '';
    }
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 1:
        return <Badge variant="default">{localize('Concluído', 'Completed')}</Badge>;
      case 0:
        return <Badge variant="outline">{localize('Pendente', 'Pending')}</Badge>;
      case 2:
        return <Badge variant="destructive">{localize('Falhou', 'Failed')}</Badge>;
      default:
        return <Badge variant="secondary">{localize('Desconhecido', 'Unknown')}</Badge>;
    }
  };

  const handleDeleteClick = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (transactionToDelete) {
      deleteMutation.mutate(transactionToDelete.id);
    }
  };

  const effectiveType = selectedType || 'all';
  const effectiveStatus = selectedStatus || 'all';

  const filteredTransactions = transactions.filter((transaction: Transaction) => {
    const description = transaction.description || '';
    const categoryName = transaction.categoryName || '';
    const matchesSearch = description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         categoryName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = effectiveType === 'all' || transaction.type.toString() === effectiveType;
    const matchesStatus = effectiveStatus === 'all' || transaction.status.toString() === effectiveStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{localize('Transações', 'Transactions')}</h1>
          <p className="text-muted-foreground">
            {localize('Gerencie seus ganhos e despesas', 'Manage your income and expenses')}
          </p>
        </div>
        <AddTransactionDialog onSuccess={refetch}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {localize('Adicionar transação', 'Add Transaction')}
          </Button>
        </AddTransactionDialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            {localize('Filtros', 'Filters')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={localize('Buscar transações...', 'Search transactions...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            <Select value={effectiveType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder={localize('Todos os tipos', 'All Types')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {localize('Todos os tipos', 'All Types')}
                </SelectItem>
                <SelectItem value="0">{localize('Receitas', 'Income')}</SelectItem>
                <SelectItem value="1">{localize('Despesas', 'Expense')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={effectiveStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder={localize('Todos os status', 'All Status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {localize('Todos os status', 'All Status')}
                </SelectItem>
                <SelectItem value="1">{localize('Concluído', 'Completed')}</SelectItem>
                <SelectItem value="0">{localize('Pendente', 'Pending')}</SelectItem>
                <SelectItem value="2">{localize('Falhou', 'Failed')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>{localize('Transações recentes', 'Recent Transactions')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg animate-pulse">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-muted rounded-full"></div>
                    <div>
                      <div className="w-32 h-4 bg-muted rounded"></div>
                      <div className="w-24 h-3 bg-muted rounded mt-2"></div>
                    </div>
                  </div>
                  <div className="w-20 h-4 bg-muted rounded"></div>
                </div>
              ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {localize('Nenhuma transação encontrada.', 'No transactions found.')}
              </p>
              <AddTransactionDialog onSuccess={refetch}>
                <Button className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  {localize('Adicione sua primeira transação', 'Add Your First Transaction')}
                </Button>
              </AddTransactionDialog>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTransactions.map((transaction: Transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-3">
                    {getTypeIcon(transaction.type)}
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>
                          {transaction.categoryName || localize('Sem categoria', 'Uncategorized')}
                        </span>
                        <span>•</span>
                        <span>{new Date(transaction.transactionDate).toLocaleDateString()}</span>
                        <span>•</span>
                        {getStatusBadge(transaction.status)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`font-semibold ${getAmountColor(transaction.type)}`}>
                      {getAmountPrefix(transaction.type)}{formatCurrency(Math.abs(transaction.amount))}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                            <EditTransactionDialog 
                              transaction={transaction} 
                              onSuccess={refetch}
                            >
                              <div className="flex items-center w-full">
                                <Pencil className="mr-2 h-4 w-4" />
                                {localize('Editar', 'Edit')}
                              </div>
                            </EditTransactionDialog>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteClick(transaction)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {localize('Deletar', 'Delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{localize('Tem certeza?', 'Are you sure?')}</DialogTitle>
          <DialogDescription>
            {localize(
              'Esta ação excluirá permanentemente a transação selecionada.',
              'This action permanently deletes the selected transaction.'
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-muted-foreground">
            {localize(
              `Esta ação não pode ser desfeita. Esta transação "${transactionToDelete?.description}" no valor de ${transactionToDelete ? formatCurrency(Math.abs(transactionToDelete.amount)) : ''} será removida permanentemente.`,
              `This action cannot be undone. This will permanently delete the transaction "${transactionToDelete?.description}" with amount ${transactionToDelete ? formatCurrency(Math.abs(transactionToDelete.amount)) : ''}.`
            )}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
            {localize('Cancelar', 'Cancel')}
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="destructive"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending
              ? localize('Deletando...', 'Deleting...')
              : localize('Deletar', 'Delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </div>
  );
};
