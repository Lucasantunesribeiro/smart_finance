# Frontend TypeScript Fixes

## 1. Fix in ReportsPage.tsx

The TypeScript error in `frontend/src/components/dashboard/pages/ReportsPage.tsx` occurs because the `handleGenerateReport` function is using a filter object that doesn't match the `TransactionFilter` interface required by the `exportTransactions` method.

### Current problematic code:

```typescript
const handleGenerateReport = async (format: string) => {
  setIsGenerating(true);
  try {
    // Criar filtro baseado no tipo de relatório selecionado
    const filter = {
      fromDate: dateRange.fromDate,
      toDate: dateRange.toDate,
      reportType: selectedReport  // This is not part of TransactionFilter
    };
    
    // Chamar serviço real para gerar relatório
    const blob = await transactionService.exportTransactions(filter, format);
    // ...
  }
  // ...
}
```

### Fixed code:

```typescript
const handleGenerateReport = async (format: string) => {
  setIsGenerating(true);
  try {
    // Criar filtro baseado no tipo de relatório selecionado
    const filter = {
      fromDate: dateRange.fromDate,
      toDate: dateRange.toDate,
      page: 1,
      pageSize: 1000, // Large enough to include all transactions
      sortBy: 'transactionDate',
      sortOrder: 'desc',
      // Include report type as a custom parameter that will be handled by the API
      reportType: selectedReport
    };
    
    // Chamar serviço real para gerar relatório
    const blob = await transactionService.exportTransactions(filter, format as 'csv' | 'pdf' | 'excel');
    // ...
  }
  // ...
}
```

### Changes made:

1. Added required properties from the `TransactionFilter` interface:
   - `page: 1`
   - `pageSize: 1000`
   - `sortBy: 'transactionDate'`
   - `sortOrder: 'desc'`

2. Added type casting for the format parameter:
   - `format as 'csv' | 'pdf' | 'excel'`

## 2. Fix in transactionService.ts (if needed)

If the backend API expects a `reportType` parameter that's not part of the `TransactionFilter` interface, we have two options:

### Option 1: Extend the TransactionFilter interface

```typescript
// In frontend/src/types/transaction.ts
export interface TransactionFilter {
  fromDate?: string;
  toDate?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  accountId?: string;
  categoryId?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: string;
  reportType?: string; // Add this optional property
}
```

### Option 2: Create a custom type for export filters

```typescript
// In frontend/src/types/transaction.ts
export interface ExportFilter extends TransactionFilter {
  reportType?: string;
}

// In frontend/src/services/transactionService.ts
async exportTransactions(filter: ExportFilter, format: 'csv' | 'pdf' | 'excel'): Promise<Blob> {
  // ...
}
```

## Implementation Notes

1. The `getTransactions` call in the `queryFn` function already includes all required properties, so no changes are needed there.

2. The `totalTransactions` property should reference `transactions.totalCount` instead of `transactions.totalItems` to match the `PagedResult` interface.

3. Make sure all calls to `exportTransactions` throughout the codebase include the required `TransactionFilter` properties.

4. Consider adding TypeScript validation in the CI/CD pipeline to catch these issues before deployment.