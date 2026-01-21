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
  | 'statusUnknown';

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
  },
  en: {
    sheetDescription: 'Modern Financial Management',
    sheetTitle: 'SmartFinance',
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
  },
};

export const getTranslation = (locale: Locale, key: TranslationKey): string => {
  return translations[locale][key] ?? translations.en[key];
};
