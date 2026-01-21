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
  | 'currentLanguage';

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
  },
};

export const getTranslation = (locale: Locale, key: TranslationKey): string => {
  return translations[locale][key] ?? translations.en[key];
};
