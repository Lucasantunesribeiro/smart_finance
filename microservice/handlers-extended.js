/**
 * Extended API Handlers - SmartFinance Backend
 * 
 * @description Handlers para Accounts, Categories, Budgets e Analytics
 * @author Principal Engineer
 * @version 2.0.0 (Critical Production Fix)
 */

const {
  validate,
  accountCreateSchema,
  accountUpdateSchema,
  categoryCreateSchema,
  categoryUpdateSchema,
  budgetCreateSchema,
  budgetUpdateSchema,
} = require('./validation');

// Data variables (will be injected)
let store;
let config, logger, readJsonBody, sendJson, sendError;

// Extended data injection
function injectExtendedServerData(serverData) {
  store = serverData.store;
  config = serverData.config;
  logger = serverData.logger;
  readJsonBody = serverData.readJsonBody;
  sendJson = serverData.sendJson;
  sendError = serverData.sendError;
}

function formatAccountForFrontend(account) {
  return {
    id: (account.external_id || account.id)?.toString(),
    name: account.name,
    type: account.type,
    balance: Number(account.balance || 0),
    accountNumber: account.account_number || '',
    isActive: account.is_active,
    currency: account.currency || 'BRL',
    description: account.description || '',
    createdAt: account.created_at || new Date().toISOString(),
    updatedAt: account.updated_at || new Date().toISOString(),
  };
}

function formatCategoryForFrontend(category) {
  return {
    id: (category.external_id || category.id)?.toString(),
    name: category.name,
    type: category.type,
    description: category.description || '',
    color: category.color,
    icon: category.icon || null,
    parentId: category.parent_id || null,
    parentName: null,
    isActive: category.is_active,
    transactionCount: category.transaction_count || 0,
    totalAmount: Number(category.total_amount || 0),
    createdAt: category.created_at || new Date().toISOString(),
    updatedAt: category.updated_at || new Date().toISOString(),
  };
}

function formatBudgetForFrontend(budget) {
  const spent = Number(budget.spent || 0);
  const allocated = Number(budget.allocated || 0);
  const remaining = allocated - spent;
  const percentage = allocated > 0 ? (spent / allocated) * 100 : 0;

  return {
    id: (budget.external_id || budget.id)?.toString(),
    name: budget.name,
    description: budget.description || '',
    allocated: allocated,
    spent: spent,
    remaining: remaining,
    percentage: percentage,
    categoryId: budget.category_external_id || (budget.category_id ? budget.category_id.toString() : null),
    categoryName: budget.category_name || null,
    period: budget.period,
    startDate: budget.start_date,
    endDate: budget.end_date,
    isActive: budget.is_active,
    createdAt: budget.created_at || new Date().toISOString(),
    updatedAt: budget.updated_at || new Date().toISOString(),
  };
}

// ==================== ACCOUNT HANDLERS ====================

async function handleGetAccounts(req, res) {
  try {
    const accounts = await store.listAccounts(req.user.id);
    const publicAccounts = accounts.filter((a) => !a.is_default);
    const accountsWithBalance = publicAccounts.map(formatAccountForFrontend);

    sendJson(res, 200, {
      items: accountsWithBalance,
      totalCount: accountsWithBalance.length,
      page: 1,
      pageSize: 50,
      totalPages: Math.ceil(accountsWithBalance.length / 50),
    });
  } catch (error) {
    logger.error('accounts.list_error', { error: error.message });
    sendError(res, 500, config.isProd ? 'Internal server error' : error.message);
  }
}

async function handleGetAccount(req, res, { params }) {
  const account = await store.getAccount(req.user.id, params.id);
  if (!account) {
    return sendError(res, 404, 'Account not found');
  }
  sendJson(res, 200, formatAccountForFrontend(account));
}

async function handleAccountsBalance(req, res) {
  try {
    const accounts = await store.listAccounts(req.user.id);
    const publicAccounts = accounts.filter((a) => !a.is_default);
    const totalBalance = publicAccounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);
    const totalAssets = publicAccounts.filter((a) => a.type <= 2).reduce((sum, a) => sum + Number(a.balance || 0), 0);
    const totalLiabilities = publicAccounts.filter((a) => a.type >= 3).reduce((sum, a) => sum + Math.abs(Number(a.balance || 0)), 0);

    sendJson(res, 200, {
      totalBalance,
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
      accountsCount: publicAccounts.length,
      currency: 'BRL',
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('accounts.balance_error', { error: error.message });
    sendError(res, 500, config.isProd ? 'Internal server error' : error.message);
  }
}

async function handleCreateAccount(req, res) {
  let data;
  try {
    data = await readJsonBody(req, config.bodyLimitBytes);
  } catch (error) {
    return sendError(res, 400, error.message);
  }

  const { error, value } = validate(accountCreateSchema, data);
  if (error) {
    return sendError(res, 400, error);
  }

  const created = await store.createAccount(req.user.id, {
    name: value.name,
    type: value.type || 0,
    accountNumber: value.accountNumber || '',
    currency: value.currency || 'BRL',
    description: value.description || '',
  });

  logger.info('accounts.create', { accountId: created.id });
  sendJson(res, 201, formatAccountForFrontend(created));
}

async function handleUpdateAccount(req, res, { params }) {
  let data;
  try {
    data = await readJsonBody(req, config.bodyLimitBytes);
  } catch (error) {
    return sendError(res, 400, error.message);
  }

  const { error, value } = validate(accountUpdateSchema, data);
  if (error) {
    return sendError(res, 400, error);
  }

  const updated = await store.updateAccount(req.user.id, params.id, {
    name: value.name,
    type: value.type,
    accountNumber: value.accountNumber,
    currency: value.currency,
    description: value.description,
    isActive: value.isActive,
  });

  if (!updated) {
    return sendError(res, 404, 'Account not found');
  }

  logger.info('accounts.update', { accountId: updated.id });
  sendJson(res, 200, formatAccountForFrontend(updated));
}

async function handleDeleteAccount(req, res, { params }) {
  const deleted = await store.deleteAccount(req.user.id, params.id);
  if (!deleted) {
    return sendError(res, 404, 'Account not found');
  }
  if (deleted.error === 'default') {
    return sendError(res, 400, 'Cannot delete default account');
  }
  logger.info('accounts.delete', { accountId: deleted.id });
  sendJson(res, 200, { message: 'Account deleted successfully' });
}

// ==================== CATEGORY HANDLERS ====================

async function handleGetCategories(req, res) {
  try {
    const categories = await store.listCategories(req.user.id);
    const publicCategories = categories.filter((c) => !c.is_default);
    const categoriesWithStats = publicCategories.map(formatCategoryForFrontend);

    sendJson(res, 200, {
      items: categoriesWithStats,
      totalCount: categoriesWithStats.length,
      page: 1,
      pageSize: 50,
      totalPages: Math.ceil(categoriesWithStats.length / 50),
    });
  } catch (error) {
    logger.error('categories.list_error', { error: error.message });
    sendError(res, 500, config.isProd ? 'Internal server error' : error.message);
  }
}

async function handleGetCategory(req, res, { params }) {
  const category = await store.getCategory(req.user.id, params.id);
  if (!category) {
    return sendError(res, 404, 'Category not found');
  }
  sendJson(res, 200, formatCategoryForFrontend(category));
}

async function handleCreateCategory(req, res) {
  let data;
  try {
    data = await readJsonBody(req, config.bodyLimitBytes);
  } catch (error) {
    return sendError(res, 400, error.message);
  }

  const { error, value } = validate(categoryCreateSchema, data);
  if (error) {
    return sendError(res, 400, error);
  }

  let resolvedParentCategoryId = null;
  if (value.parentCategoryId) {
    resolvedParentCategoryId = await store.resolveCategoryId(req.user.id, value.parentCategoryId);
    if (!resolvedParentCategoryId) {
      return sendError(res, 400, 'Invalid parent category');
    }
  }

  const created = await store.createCategory(req.user.id, {
    name: value.name,
    type: value.type || 1,
    description: value.description || '',
    color: value.color || '#000000',
    icon: value.icon || null,
    parentCategoryId: resolvedParentCategoryId,
  });

  logger.info('categories.create', { categoryId: created.id });
  sendJson(res, 201, formatCategoryForFrontend(created));
}

async function handleUpdateCategory(req, res, { params }) {
  let data;
  try {
    data = await readJsonBody(req, config.bodyLimitBytes);
  } catch (error) {
    return sendError(res, 400, error.message);
  }

  const { error, value } = validate(categoryUpdateSchema, data);
  if (error) {
    return sendError(res, 400, error);
  }

  let resolvedParentCategoryId = undefined;
  if (value.parentCategoryId !== undefined) {
    if (value.parentCategoryId === null) {
      resolvedParentCategoryId = null;
    } else {
      resolvedParentCategoryId = await store.resolveCategoryId(req.user.id, value.parentCategoryId);
      if (!resolvedParentCategoryId) {
        return sendError(res, 400, 'Invalid parent category');
      }
    }
  }

  const updated = await store.updateCategory(req.user.id, params.id, {
    name: value.name,
    type: value.type,
    description: value.description,
    color: value.color,
    icon: value.icon,
    parentCategoryId: resolvedParentCategoryId,
    isActive: value.isActive,
  });

  if (!updated) {
    return sendError(res, 404, 'Category not found');
  }

  logger.info('categories.update', { categoryId: updated.id });
  sendJson(res, 200, formatCategoryForFrontend(updated));
}

async function handleDeleteCategory(req, res, { params }) {
  const deleted = await store.deleteCategory(req.user.id, params.id);
  if (!deleted) {
    return sendError(res, 404, 'Category not found');
  }
  if (deleted.error === 'default') {
    return sendError(res, 400, 'Cannot delete default category');
  }
  logger.info('categories.delete', { categoryId: deleted.id });
  sendJson(res, 200, { message: 'Category deleted successfully' });
}

async function handleCategoryStats(req, res, { params }) {
  const stats = await store.getCategoryStats(req.user.id, params.id);
  if (!stats) {
    return sendError(res, 404, 'Category not found');
  }
  sendJson(res, 200, {
    totalTransactions: stats.total_transactions || 0,
    totalAmount: Number(stats.total_amount || 0),
    averageAmount: Number(stats.average_amount || 0),
    lastTransaction: stats.last_transaction || null,
  });
}

// ==================== ANALYTICS HANDLERS ====================

function handleAnalyticsSummary(req, res, { params, query }) {
  store.getAnalyticsSummary(req.user.id)
    .then((summary) => {
      const totalIncome = Number(summary.total_income || 0);
      const totalExpenses = Number(summary.total_expenses || 0);
      const netSavings = totalIncome - totalExpenses;
      const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

      logger.info('analytics.summary', { query });

      sendJson(res, 200, {
        totalIncome,
        totalExpenses,
        netSavings,
        savingsRate: Math.round(savingsRate * 10) / 10,
        topCategory: 'Nenhuma',
        transactionCount: summary.transaction_count || 0,
        period: query.period || 'all',
        generatedAt: new Date().toISOString(),
      });
    })
    .catch((error) => {
      logger.error('analytics.summary_error', { error: error.message });
      sendError(res, 500, config.isProd ? 'Internal server error' : error.message);
    });
}

function handleAnalyticsTrends(req, res, { params, query }) {
  store.getAnalyticsTrends(req.user.id)
    .then((trends) => {
      logger.info('analytics.trends', { query });
      sendJson(res, 200, {
        ...trends,
        period: query.period || 'monthly',
        generatedAt: new Date().toISOString(),
      });
    })
    .catch((error) => {
      logger.error('analytics.trends_error', { error: error.message });
      sendError(res, 500, config.isProd ? 'Internal server error' : error.message);
    });
}

function handleAnalyticsData(req, res, { params, query }) {
  store.getAnalyticsData(req.user.id)
    .then((rows) => {
      if (!rows.length) {
        return sendJson(res, 200, { labels: [], datasets: [] });
      }

      const labels = rows.map((row) => new Date(row.month).toLocaleDateString('pt-BR', { month: 'short' }));
      const incomeData = rows.map((row) => Number(row.income || 0));
      const expenseData = rows.map((row) => -Number(row.expenses || 0));

      sendJson(res, 200, {
        labels,
        datasets: [
          { label: 'Receitas', data: incomeData, backgroundColor: 'rgba(34, 197, 94, 0.8)' },
          { label: 'Despesas', data: expenseData, backgroundColor: 'rgba(239, 68, 68, 0.8)' },
        ],
        period: query.period || 'monthly',
        generatedAt: new Date().toISOString(),
      });
    })
    .catch((error) => {
      logger.error('analytics.data_error', { error: error.message });
      sendError(res, 500, config.isProd ? 'Internal server error' : error.message);
    });
}

function handleAnalyticsCashFlow(req, res, { params, query }) {
  store.getAnalyticsCashFlow(req.user.id)
    .then((flow) => {
      const cashFlow = {
        labels: ['Ultima semana'],
        inflow: [Number(flow.inflow || 0)],
        outflow: [Number(flow.outflow || 0)],
        netFlow: [Number(flow.netflow || 0)],
      };

      sendJson(res, 200, {
        ...cashFlow,
        period: query.period || 'weekly',
        generatedAt: new Date().toISOString(),
      });
    })
    .catch((error) => {
      logger.error('analytics.cashflow_error', { error: error.message });
      sendError(res, 500, config.isProd ? 'Internal server error' : error.message);
    });
}

function handleAnalyticsCategories(req, res, { params, query }) {
  store.getAnalyticsCategories(req.user.id)
    .then((categories) => {
      sendJson(res, 200, {
        categories: categories.map((c) => ({
          name: c.name,
          amount: Number(c.amount || 0),
          percentage: 0,
          color: c.color,
          transactionCount: c.transaction_count || 0,
        })),
        period: query.period || 'all',
        generatedAt: new Date().toISOString(),
      });
    })
    .catch((error) => {
      logger.error('analytics.categories_error', { error: error.message });
      sendError(res, 500, config.isProd ? 'Internal server error' : error.message);
    });
}

// ==================== BUDGET HANDLERS ====================

async function handleGetBudgets(req, res, { params, query }) {
  try {
    const page = Math.max(1, parseInt(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize) || 50));
    const sortBy = query.sortBy || 'name';
    const sortOrder = (query.sortOrder || 'asc').toLowerCase();
    const isActive = query.isActive !== undefined ? query.isActive === 'true' : true;

    let budgets = await store.listBudgets(req.user.id, { isActive });

    budgets.sort((a, b) => {
      let aVal;
      let bVal;
      switch (sortBy) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'allocated':
          aVal = a.allocated;
          bVal = b.allocated;
          break;
        case 'spent':
          aVal = a.spent || 0;
          bVal = b.spent || 0;
          break;
        case 'startDate':
          aVal = new Date(a.start_date);
          bVal = new Date(b.start_date);
          break;
        case 'endDate':
          aVal = new Date(a.end_date);
          bVal = new Date(b.end_date);
          break;
        default:
          aVal = a.id;
          bVal = b.id;
      }

      const multiplier = sortOrder === 'asc' ? 1 : -1;
      if (aVal < bVal) return -1 * multiplier;
      if (aVal > bVal) return 1 * multiplier;
      return 0;
    });

    const totalCount = budgets.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedBudgets = budgets.slice(startIndex, endIndex);

    const response = {
      items: paginatedBudgets.map(formatBudgetForFrontend),
      totalCount,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      appliedFilters: { isActive },
      sorting: { sortBy, sortOrder },
    };

    sendJson(res, 200, response);
  } catch (error) {
    logger.error('budgets.list_error', { error: error.message });
    sendError(res, 500, config.isProd ? 'Internal server error' : error.message);
  }
}

async function handleGetBudget(req, res, { params }) {
  const budget = await store.getBudget(req.user.id, params.id);
  if (!budget) {
    return sendError(res, 404, 'Budget not found');
  }
  sendJson(res, 200, formatBudgetForFrontend(budget));
}

async function handleCreateBudget(req, res) {
  let data;
  try {
    data = await readJsonBody(req, config.bodyLimitBytes);
  } catch (error) {
    return sendError(res, 400, error.message);
  }

  const { error, value } = validate(budgetCreateSchema, data);
  if (error) {
    return sendError(res, 400, error);
  }

  let resolvedCategoryId = null;
  if (value.categoryId) {
    resolvedCategoryId = await store.resolveCategoryId(req.user.id, value.categoryId);
    if (!resolvedCategoryId) {
      return sendError(res, 400, 'Invalid category');
    }
  }

  const created = await store.createBudget(req.user.id, {
    name: value.name,
    description: value.description || '',
    allocated: parseFloat(value.allocated) || 0,
    categoryId: resolvedCategoryId,
    period: value.period || 'monthly',
    startDate: value.startDate || new Date().toISOString().split('T')[0],
    endDate: value.endDate || new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
    isActive: value.isActive !== undefined ? value.isActive : true,
  });

  logger.info('budgets.create', { budgetId: created.id });
  sendJson(res, 201, formatBudgetForFrontend(created));
}

async function handleUpdateBudget(req, res, { params }) {
  let data;
  try {
    data = await readJsonBody(req, config.bodyLimitBytes);
  } catch (error) {
    return sendError(res, 400, error.message);
  }

  const { error, value } = validate(budgetUpdateSchema, data);
  if (error) {
    return sendError(res, 400, error);
  }

  let resolvedCategoryId = undefined;
  if (value.categoryId !== undefined) {
    if (value.categoryId === null) {
      resolvedCategoryId = null;
    } else {
      resolvedCategoryId = await store.resolveCategoryId(req.user.id, value.categoryId);
      if (!resolvedCategoryId) {
        return sendError(res, 400, 'Invalid category');
      }
    }
  }

  const updated = await store.updateBudget(req.user.id, params.id, {
    name: value.name,
    description: value.description,
    allocated: value.allocated,
    categoryId: resolvedCategoryId,
    period: value.period,
    startDate: value.startDate,
    endDate: value.endDate,
    isActive: value.isActive,
  });

  if (!updated) {
    return sendError(res, 404, 'Budget not found');
  }

  logger.info('budgets.update', { budgetId: updated.id });
  sendJson(res, 200, formatBudgetForFrontend(updated));
}

async function handleDeleteBudget(req, res, { params }) {
  const deleted = await store.deleteBudget(req.user.id, params.id);
  if (!deleted) {
    return sendError(res, 404, 'Budget not found');
  }
  logger.info('budgets.delete', { budgetId: deleted.id });
  sendJson(res, 200, { message: 'Budget deleted successfully' });
}

module.exports = {
  injectExtendedServerData,
  
  // Accounts
  handleGetAccounts,
  handleGetAccount,
  handleAccountsBalance,
  handleCreateAccount,
  handleUpdateAccount,
  handleDeleteAccount,
  
  // Categories
  handleGetCategories,
  handleGetCategory,
  handleCreateCategory,
  handleUpdateCategory,
  handleDeleteCategory,
  handleCategoryStats,
  
  // Budgets
  handleGetBudgets,
  handleGetBudget,
  handleCreateBudget,
  handleUpdateBudget,
  handleDeleteBudget,
  
  // Analytics
  handleAnalyticsSummary,
  handleAnalyticsTrends,
  handleAnalyticsData,
  handleAnalyticsCashFlow,
  handleAnalyticsCategories
};
