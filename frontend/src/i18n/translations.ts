export type Locale = 'pt' | 'en';

export type TranslationKey =
  | 'sheetDescription'
  | 'sheetTitle'
  | 'sidebarOverview'
  | 'sidebarTransactions'
  | 'sidebarAccounts'
  | 'sidebarBudgets'
  | 'sidebarCategories'
  | 'sidebarAnalytics'
  | 'sidebarReports'
  | 'sidebarSettings'
  | 'dropdownSettings'
  | 'dropdownLogout'
  | 'toggleMenuLabel'
  | 'welcomeTitle'
  | 'welcomeSubtitle'
  | 'welcomeBulletOne'
  | 'welcomeBulletTwo'
  | 'welcomeBulletThree'
  | 'welcomeBulletFour'
  | 'welcomeFooter'
  | 'languageLabel'
  | 'currentLanguage'
  | 'dashboardTitle'
  | 'dashboardSubtitle'
  | 'addTransaction'
  | 'netAmount'
  | 'totalIncome'
  | 'totalExpenses'
  | 'transactions'
  | 'recentTransactionsTitle'
  | 'recentTransactionsDescription'
  | 'recentTransactionsEmpty'
  | 'budgetOverviewTitle'
  | 'budgetOverviewDescription'
  | 'noActiveBudgets'
  | 'transactionTypeIncome'
  | 'transactionTypeExpense'
  | 'transactionTypeTransfer'
  | 'transactionTypeUnknown'
  | 'statusCompleted'
  | 'statusPending'
  | 'statusFailed'
  | 'statusUnknown'
  | 'accountsTitle'
  | 'accountsSubtitle'
  | 'addAccount'
  | 'createAccountTitle'
  | 'editAccountTitle'
  | 'accountName'
  | 'accountType'
  | 'initialBalance'
  | 'descriptionLabel'
  | 'accountPlaceholder'
  | 'descriptionPlaceholder'
  | 'cancel'
  | 'confirmDelete'
  | 'createAccountSuccess'
  | 'updateAccountSuccess'
  | 'deleteAccountSuccess'
  | 'updateAccount'
  | 'active'
  | 'inactive'
  | 'balanceLabel'
  | 'accountTypeChecking'
  | 'accountTypeSavings'
  | 'accountTypeCredit'
  | 'accountTypeInvestment'
  | 'accountTypeLoan'
  | 'accountsEmptyTitle'
  | 'accountsEmptyDescription'
  | 'addAccountAction'
  | 'accountStatus'
  | 'currencyLabel'
  | 'creatingAccount'
  | 'updatingAccount'
  | 'reportTitle'
  | 'reportSubtitle'
  | 'reportPeriodTitle'
  | 'reportStartDate'
  | 'reportEndDate'
  | 'applyFilters'
  | 'reportTypesTitle'
  | 'reportPreviewTitle'
  | 'reportLoading'
  | 'reportNoData'
  | 'reportLoadError'
  | 'reportTotalTransactions'
  | 'reportTotalIncome'
  | 'reportTotalExpenses'
  | 'reportNetBalance'
  | 'reportCategoriesLabel'
  | 'reportTopExpensesLabel'
  | 'reportExportTitle'
  | 'reportGenerating'
  | 'reportTypeMonthlyName'
  | 'reportTypeMonthlyDescription'
  | 'reportTypeCategoryName'
  | 'reportTypeCategoryDescription'
  | 'reportTypeCashflowName'
  | 'reportTypeCashflowDescription'
  | 'reportTypeBudgetName'
  | 'reportTypeBudgetDescription'
  | 'reportTypeAnnualName'
  | 'reportTypeAnnualDescription'
  | 'reportExportSuccess';

type TranslationDictionary = Record<TranslationKey, string>;

const translations: Record<Locale, TranslationDictionary> = {
  pt: {
    sheetDescription: 'Gestão Financeira Moderna',
    sheetTitle: 'SmartFinance',
    sidebarOverview: 'Visão Geral',
    sidebarTransactions: 'Transações',
    sidebarAccounts: 'Contas',
    sidebarBudgets: 'Orçamentos',
    sidebarCategories: 'Categorias',
    sidebarAnalytics: 'Análises',
    sidebarReports: 'Relatórios',
    sidebarSettings: 'Configurações',
    dropdownSettings: 'Configurações',
    dropdownLogout: 'Sair',
    toggleMenuLabel: 'Alternar menu',
    welcomeTitle: '🎯 SUCESSO TOTAL!',
    welcomeSubtitle: 'Next.js React ORIGINAL funcionando!',
    welcomeBulletOne: 'Design autêntico com DashboardLayout',
    welcomeBulletTwo: 'Sidebar com navegação moderna',
    welcomeBulletThree: 'Tema preto e branco clássico',
    welcomeBulletFour: 'Componentes React shadcn/ui',
    welcomeFooter: 'Redirecionando para o dashboard autêntico...',
    languageLabel: 'Idioma',
    currentLanguage: 'pt-BR',
    dashboardTitle: 'Dashboard',
    dashboardSubtitle: 'Bem-vindo de volta, {name}! Aqui está sua visão financeira.',
    addTransaction: 'Adicionar transação',
    netAmount: 'Valor líquido',
    totalIncome: 'Total de receitas',
    totalExpenses: 'Total de despesas',
    transactions: 'Transações',
    recentTransactionsTitle: 'Transações recentes',
    recentTransactionsDescription: 'Últimas movimentações financeiras',
    recentTransactionsEmpty: 'Nenhuma transação recente encontrada',
    budgetOverviewTitle: 'Visão do orçamento',
    budgetOverviewDescription: 'Progresso do mês atual',
    noActiveBudgets: 'Nenhum orçamento ativo encontrado',
    transactionTypeIncome: 'Receita',
    transactionTypeExpense: 'Despesa',
    transactionTypeTransfer: 'Transferência',
    transactionTypeUnknown: 'Desconhecido',
    statusCompleted: 'Concluído',
    statusPending: 'Pendente',
    statusFailed: 'Falhou',
    statusUnknown: 'Desconhecido',
    accountsTitle: 'Contas',
    accountsSubtitle: 'Gerencie suas contas financeiras',
    addAccount: 'Adicionar conta',
    createAccountTitle: 'Criar nova conta',
    editAccountTitle: 'Editar conta',
    accountName: 'Nome da conta',
    accountType: 'Tipo da conta',
    initialBalance: 'Saldo inicial',
    descriptionLabel: 'Descrição',
    cancel: 'Cancelar',
    confirmDelete: 'Tem certeza que deseja excluir a conta?',
    createAccountSuccess: 'Conta criada com sucesso!',
    updateAccountSuccess: 'Conta atualizada com sucesso!',
    deleteAccountSuccess: 'Conta deletada com sucesso!',
    active: 'Ativa',
    inactive: 'Inativa',
    balanceLabel: 'Saldo atual',
    accountTypeChecking: 'Conta corrente',
    accountTypeSavings: 'Poupança',
    accountTypeCredit: 'Cartão de crédito',
    accountTypeInvestment: 'Investimento',
    accountTypeLoan: 'Empréstimo',
    accountsEmptyTitle: 'Nenhuma conta encontrada',
    accountsEmptyDescription: 'Comece adicionando sua primeira conta financeira.',
    addAccountAction: 'Adicionar sua primeira conta',
    accountStatus: 'Status',
    currencyLabel: 'Moeda',
    creatingAccount: 'Criando...',
    updatingAccount: 'Atualizando...',
    accountPlaceholder: 'Digite o nome da conta',
    descriptionPlaceholder: 'Descrição da conta (opcional)',
    updateAccount: 'Atualizar conta',
    reportTitle: 'Relatórios Financeiros',
    reportSubtitle: 'Gere relatórios detalhados sobre suas finanças',
    reportPeriodTitle: 'Período do Relatório',
    reportStartDate: 'Data Inicial',
    reportEndDate: 'Data Final',
    applyFilters: 'Aplicar filtros',
    reportTypesTitle: 'Tipos de Relatório',
    reportPreviewTitle: 'Prévia do Relatório',
    reportLoading: 'Carregando dados do relatório...',
    reportNoData: 'Nenhum dado disponível para o período selecionado',
    reportLoadError: 'Não foi possível carregar os dados do relatório',
    reportTotalTransactions: 'Total de Transações',
    reportTotalIncome: 'Total de Receitas',
    reportTotalExpenses: 'Total de Despesas',
    reportNetBalance: 'Saldo Líquido',
    reportCategoriesLabel: 'Gastos por Categoria',
    reportTopExpensesLabel: 'Maiores Despesas',
    reportExportTitle: 'Exportar Relatório',
    reportGenerating: 'Gerando relatório...',
    reportTypeMonthlyName: 'Relatório Mensal',
    reportTypeMonthlyDescription: 'Resumo completo das transações do mês',
    reportTypeCategoryName: 'Relatório por Categoria',
    reportTypeCategoryDescription: 'Análise de gastos por categoria',
    reportTypeCashflowName: 'Fluxo de Caixa',
    reportTypeCashflowDescription: 'Análise do fluxo de entrada e saída',
    reportTypeBudgetName: 'Relatório de Orçamento',
    reportTypeBudgetDescription: 'Comparação entre o planejado e o realizado',
    reportTypeAnnualName: 'Relatório Anual',
    reportTypeAnnualDescription: 'Resumo completo do ano',
    reportExportSuccess: 'Relatório exportado com sucesso!'
  },
  en: {
    sheetDescription: 'Modern Financial Management',
    sheetTitle: 'SmartFinance',
    accountPlaceholder: 'Enter account name',
    descriptionPlaceholder: 'Account description (optional)',
    updateAccount: 'Update Account',
    reportTitle: 'Financial Reports',
    reportSubtitle: 'Generate detailed financial insights',
    reportPeriodTitle: 'Report Period',
    reportStartDate: 'Start Date',
    reportEndDate: 'End Date',
    applyFilters: 'Apply filters',
    reportTypesTitle: 'Report Types',
    reportPreviewTitle: 'Report Preview',
    reportLoading: 'Loading report data...',
    reportNoData: 'No data available for the selected period',
    reportLoadError: 'Unable to load report data',
    reportTotalTransactions: 'Total Transactions',
    reportTotalIncome: 'Total Income',
    reportTotalExpenses: 'Total Expenses',
    reportNetBalance: 'Net Balance',
    reportCategoriesLabel: 'Spending by Category',
    reportTopExpensesLabel: 'Top Expenses',
    reportExportTitle: 'Export Report',
    reportGenerating: 'Generating report...',
    reportTypeMonthlyName: 'Monthly Report',
    reportTypeMonthlyDescription: 'Full summary of monthly transactions',
    reportTypeCategoryName: 'Category Report',
    reportTypeCategoryDescription: 'Analysis of spending by category',
    reportTypeCashflowName: 'Cash Flow',
    reportTypeCashflowDescription: 'Insight into incoming and outgoing cash',
    reportTypeBudgetName: 'Budget Report',
    reportTypeBudgetDescription: 'Comparison of budgeted versus actuals',
    reportTypeAnnualName: 'Annual Report',
    reportTypeAnnualDescription: 'Yearly summary',
    reportExportSuccess: 'Report exported successfully!',
    sidebarOverview: 'Overview',
    sidebarTransactions: 'Transactions',
    sidebarAccounts: 'Accounts',
    sidebarBudgets: 'Budgets',
    sidebarCategories: 'Categories',
    sidebarAnalytics: 'Analytics',
    sidebarReports: 'Reports',
    sidebarSettings: 'Settings',
    dropdownSettings: 'Settings',
    dropdownLogout: 'Log out',
    toggleMenuLabel: 'Toggle menu',
    welcomeTitle: '🎯 TOTAL SUCCESS!',
    welcomeSubtitle: 'Next.js React ORIGINAL working!',
    welcomeBulletOne: 'Original design with DashboardLayout',
    welcomeBulletTwo: 'Sidebar with modern navigation',
    welcomeBulletThree: 'Classic light/dark theme',
    welcomeBulletFour: 'shadcn/ui React components',
    welcomeFooter: 'Redirecting to the authentic dashboard...',
    languageLabel: 'Language',
    currentLanguage: 'en-US',
    dashboardTitle: 'Dashboard',
    dashboardSubtitle: 'Welcome back, {name}! Here is your financial overview.',
    addTransaction: 'Add Transaction',
    netAmount: 'Net Amount',
    totalIncome: 'Total Income',
    totalExpenses: 'Total Expenses',
    transactions: 'Transactions',
    recentTransactionsTitle: 'Recent Transactions',
    recentTransactionsDescription: 'Latest financial activity',
    recentTransactionsEmpty: 'No recent transactions found',
    budgetOverviewTitle: 'Budget Overview',
    budgetOverviewDescription: 'Current month progress',
    noActiveBudgets: 'No active budgets found',
    transactionTypeIncome: 'Income',
    transactionTypeExpense: 'Expense',
    transactionTypeTransfer: 'Transfer',
    transactionTypeUnknown: 'Unknown',
    statusCompleted: 'Completed',
    statusPending: 'Pending',
    statusFailed: 'Failed',
    statusUnknown: 'Unknown',
    accountsTitle: 'Accounts',
    accountsSubtitle: 'Manage your financial accounts',
    addAccount: 'Add Account',
    createAccountTitle: 'Create New Account',
    editAccountTitle: 'Edit Account',
    accountName: 'Account Name',
    accountType: 'Account Type',
    initialBalance: 'Initial Balance',
    descriptionLabel: 'Description',
    cancel: 'Cancel',
    confirmDelete: 'Are you sure you want to delete this account?',
    createAccountSuccess: 'Account created successfully!',
    updateAccountSuccess: 'Account updated successfully!',
    deleteAccountSuccess: 'Account deleted successfully!',
    active: 'Active',
    inactive: 'Inactive',
    balanceLabel: 'Current Balance',
    accountTypeChecking: 'Checking',
    accountTypeSavings: 'Savings',
    accountTypeCredit: 'Credit',
    accountTypeInvestment: 'Investment',
    accountTypeLoan: 'Loan',
    accountsEmptyTitle: 'No accounts found',
    accountsEmptyDescription: 'Get started by adding your first financial account.',
    addAccountAction: 'Add Your First Account',
    accountStatus: 'Status',
    currencyLabel: 'Currency',
    creatingAccount: 'Creating...',
    updatingAccount: 'Updating...',
  },
};

export const getTranslation = (locale: Locale, key: TranslationKey): string => {
  return translations[locale][key] ?? translations.en[key];
};
