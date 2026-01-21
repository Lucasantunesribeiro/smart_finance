/**
 * API Handlers - SmartFinance Backend
 * 
 * @description Handlers extraídos do servidor principal para uso com SmartRouter
 * @author Principal Engineer  
 * @version 2.0.0 (Critical Production Fix)
 */

const bcrypt = require('bcryptjs');
const { parseCookies } = require('./http-utils');
const {
  validate,
  loginSchema,
  refreshSchema,
  transactionCreateSchema,
  transactionUpdateSchema,
} = require('./validation');

// ==================== UTILITY FUNCTIONS ====================

function parseIntParam(value, defaultValue, min = null, max = null) {
  const parsed = parseInt(value);
  if (isNaN(parsed)) return defaultValue;
  if (min !== null && parsed < min) return min;
  if (max !== null && parsed > max) return max;
  return parsed;
}

function parseFloatParam(value, defaultValue, min = null, max = null) {
  const parsed = parseFloat(value);
  if (isNaN(parsed)) return defaultValue;
  if (min !== null && parsed < min) return min;
  if (max !== null && parsed > max) return max;
  return parsed;
}

// ==================== GLOBAL DATA ACCESS ====================

let store;
let issueTokens, verifyRefreshToken, rotateRefreshToken, revokeRefreshToken;
let setAuthCookies, clearAuthCookies;
let config, logger, readJsonBody, sendJson, sendError, loginLimiter;

// Data injection function (called from server.js)
function injectServerData(serverData) {
  store = serverData.store;
  issueTokens = serverData.issueTokens;
  verifyRefreshToken = serverData.verifyRefreshToken;
  rotateRefreshToken = serverData.rotateRefreshToken;
  revokeRefreshToken = serverData.revokeRefreshToken;
  setAuthCookies = serverData.setAuthCookies;
  clearAuthCookies = serverData.clearAuthCookies;
  config = serverData.config;
  logger = serverData.logger;
  readJsonBody = serverData.readJsonBody;
  sendJson = serverData.sendJson;
  sendError = serverData.sendError;
  loginLimiter = serverData.loginLimiter;
}

// ==================== HEALTH & AUTH HANDLERS ====================

function handleHealth(req, res) {
  sendJson(res, 200, {
    status: 'OK',
    timestamp: new Date().toISOString(),
    router: 'SmartRouter v2.0.0',
  });
}

async function handleLogin(req, res) {
  const ip = req.context?.ip || 'unknown';
  const ipRate = loginLimiter.isAllowed(`login:ip:${ip}`);
  if (!ipRate.allowed) {
    return sendError(res, 429, 'Too many login attempts');
  }

  let body;
  try {
    body = await readJsonBody(req, config.bodyLimitBytes);
  } catch (error) {
    return sendError(res, 400, error.message);
  }

  const { error, value } = validate(loginSchema, body);
  if (error) {
    return sendError(res, 400, error);
  }

  const userRate = loginLimiter.isAllowed(`login:user:${value.email}`);
  if (!userRate.allowed) {
    return sendError(res, 429, 'Too many login attempts');
  }

  const user = await store.getUserByEmail(value.email);
  if (!user || !bcrypt.compareSync(value.password, user.password_hash)) {
    logger.warn('auth.login_failed', { ip });
    return sendError(res, 401, 'Invalid credentials');
  }
  if (!user.is_active) {
    logger.warn('auth.login_inactive', { userId: user.id, ip });
    return sendError(res, 403, 'User inactive');
  }

  const tokens = await issueTokens(user, {
    ip,
    userAgent: req.headers['user-agent'],
  });
  setAuthCookies(res, tokens);

  logger.info('auth.login_success', { userId: user.id, ip });
  sendJson(
    res,
    200,
    {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id.toString(),
        email: user.email,
        firstName: user.name.split(' ')[0] || 'Admin',
        lastName: user.name.split(' ').slice(1).join(' ') || 'User',
        role: user.role,
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    },
    { 'Cache-Control': 'no-store' }
  );
}

async function handleRefresh(req, res) {
  let body = {};
  try {
    body = await readJsonBody(req, config.bodyLimitBytes);
  } catch (error) {
    return sendError(res, 400, error.message);
  }

  const { error, value } = validate(refreshSchema, body);
  if (error) {
    return sendError(res, 400, error);
  }

  const refreshToken = value.refreshToken || parseCookies(req)[config.cookies.refreshName];
  if (!refreshToken) {
    return sendError(res, 400, 'Refresh token is required');
  }

  const rotated = await rotateRefreshToken(refreshToken, {
    ip: req.context?.ip,
    userAgent: req.headers['user-agent'],
  });
  if (!rotated) {
    return sendError(res, 401, 'Invalid refresh token');
  }

  const userRecord = await store.getUserById(rotated.user.id);
  const fullName = userRecord?.name || '';

  setAuthCookies(res, rotated.tokens);
  sendJson(
    res,
    200,
    {
      accessToken: rotated.tokens.accessToken,
      refreshToken: rotated.tokens.refreshToken,
      user: {
        id: rotated.user.id.toString(),
        email: rotated.user.email,
        firstName: fullName.split(' ')[0] || 'User',
        lastName: fullName.split(' ').slice(1).join(' ') || 'User',
        role: rotated.user.role,
        isActive: userRecord ? userRecord.is_active : true,
        createdAt: new Date().toISOString(),
      },
    },
    { 'Cache-Control': 'no-store' }
  );
}

async function handleLogout(req, res) {
  const cookies = parseCookies(req);
  const refreshToken = cookies[config.cookies.refreshName];
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }
  clearAuthCookies(res);
  sendJson(res, 200, { message: 'Logged out' });
}

async function handleMe(req, res) {
  if (!req.user) {
    return sendError(res, 401, 'Authentication required');
  }
  const user = await store.getUserById(req.user.id);
  if (!user) {
    return sendError(res, 401, 'User not found');
  }
  sendJson(res, 200, {
    user: {
      id: user.id.toString(),
      email: user.email,
      firstName: user.name.split(' ')[0] || 'Admin',
      lastName: user.name.split(' ').slice(1).join(' ') || 'User',
      role: user.role,
      isActive: user.is_active,
      createdAt: new Date().toISOString(),
    },
  });
}

// ==================== TRANSACTION HANDLERS ====================

async function handleGetTransactions(req, res, { params, query }) {
  try {
    logger.info('transactions.list', { query, userId: req.user.id });

    const page = Math.max(1, parseIntParam(query.page, 1));
    const pageSize = Math.min(100, Math.max(1, parseIntParam(query.pageSize, 50)));
    const sortBy = query.sortBy || 'id';
    const sortOrder = (query.sortOrder || 'desc').toLowerCase();

    const filters = {
      page,
      pageSize,
      sortBy,
      sortOrder,
      categoryId: query.categoryId ? parseIntParam(query.categoryId, null) : null,
      accountId: query.accountId ? parseIntParam(query.accountId, null) : null,
      startDate: query.startDate || null,
      endDate: query.endDate || null,
      minAmount: query.minAmount ? parseFloatParam(query.minAmount, null) : null,
      maxAmount: query.maxAmount ? parseFloatParam(query.maxAmount, null) : null,
    };

    const { items, totalCount } = await store.listTransactions(req.user.id, filters);
    const totalPages = Math.ceil(totalCount / pageSize);

    const response = {
      items: items.map((transaction) => {
        const transactionId = transaction.transaction_external_id || transaction.id?.toString();
        const accountId = transaction.account_external_id || transaction.account_id?.toString();
        const categoryId = transaction.category_external_id || transaction.category_id?.toString();
        const status = transaction.status ?? 1;
        return {
          id: transactionId,
          amount: Math.abs(Number(transaction.amount)),
          description: transaction.description,
          transactionDate: transaction.date,
          type: transaction.type,
          status,
          accountId,
          accountName: transaction.account_name || 'Conta',
          categoryId,
          categoryName: transaction.category_name || 'Outros',
          reference: null,
          notes: null,
          isRecurring: false,
          tags: [],
          createdAt: new Date().toISOString(),
        };
      }),
      totalCount,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      appliedFilters: {
        categoryId: filters.categoryId,
        accountId: filters.accountId,
        startDate: filters.startDate,
        endDate: filters.endDate,
        minAmount: filters.minAmount,
        maxAmount: filters.maxAmount,
      },
      sorting: { sortBy, sortOrder },
    };

    sendJson(res, 200, response);
  } catch (error) {
    logger.error('transactions.list_error', { error: error.message });
    sendError(res, 500, config.isProd ? 'Internal server error' : error.message);
  }
}

async function handleGetTransaction(req, res, { params }) {
  const transaction = await store.getTransaction(req.user.id, params.id);
  if (!transaction) {
    return sendError(res, 404, 'Transaction not found');
  }

  const externalTransactionId = transaction.transaction_external_id || transaction.id?.toString();
  const externalAccountId = transaction.account_external_id || transaction.account_id?.toString();
  const externalCategoryId = transaction.category_external_id || transaction.category_id?.toString();
  sendJson(res, 200, {
    id: externalTransactionId,
    amount: Math.abs(Number(transaction.amount)),
    description: transaction.description,
    transactionDate: transaction.date,
    type: transaction.type,
    status: transaction.status ?? 1,
    accountId: externalAccountId,
    accountName: transaction.account_name || 'Conta',
    categoryId: externalCategoryId,
    categoryName: transaction.category_name || 'Outros',
    reference: null,
    notes: null,
    isRecurring: false,
    tags: [],
    createdAt: new Date().toISOString(),
  });
}

async function handleCreateTransaction(req, res) {
  let data;
  try {
    data = await readJsonBody(req, config.bodyLimitBytes);
  } catch (error) {
    return sendError(res, 400, error.message);
  }

  const { error, value } = validate(transactionCreateSchema, data);
  if (error) {
    return sendError(res, 400, error);
  }

  let amount = Math.abs(value.amount);
  let transactionType;

  if (value.type === 0) {
    transactionType = 0;
  } else if (value.type === 1) {
    transactionType = 1;
    amount = -amount;
  } else {
    transactionType = 2;
  }

  const internalAccountId = await store.resolveAccountId(req.user.id, value.accountId);
  if (!internalAccountId) {
    return sendError(res, 400, 'Invalid account');
  }

  let internalCategoryId = null;
  if (value.categoryId) {
    internalCategoryId = await store.resolveCategoryId(req.user.id, value.categoryId);
    if (!internalCategoryId) {
      return sendError(res, 400, 'Invalid category');
    }
  }

  const created = await store.createTransaction(req.user.id, {
    description: value.description,
    amount: amount,
    type: transactionType,
    categoryId: internalCategoryId,
    accountId: internalAccountId,
    date: value.transactionDate || new Date().toISOString().split('T')[0],
    status: value.status ?? 1,
  });

  logger.info('transactions.create', { userId: req.user.id, transactionId: created.id });
  const createdExternalId = created.transaction_external_id || created.id?.toString();
  const createdAccountExternalId = created.account_external_id || created.account_id?.toString();
  const createdCategoryExternalId = created.category_external_id || created.category_id?.toString();
  sendJson(res, 201, {
    id: createdExternalId,
    amount: Math.abs(Number(created.amount)),
    description: created.description,
    transactionDate: created.date,
    type: created.type,
    status: created.status ?? 1,
    accountId: createdAccountExternalId,
    accountName: created.account_name || 'Conta',
    categoryId: createdCategoryExternalId,
    categoryName: created.category_name || 'Outros',
    reference: null,
    notes: null,
    isRecurring: false,
    tags: [],
    createdAt: new Date().toISOString(),
  });
}

async function handleUpdateTransaction(req, res, { params }) {
  let data;
  try {
    data = await readJsonBody(req, config.bodyLimitBytes);
  } catch (error) {
    return sendError(res, 400, error.message);
  }

  const { error, value } = validate(transactionUpdateSchema, data);
  if (error) {
    return sendError(res, 400, error);
  }

  const transactionId = params.id;
  const current = await store.getTransaction(req.user.id, transactionId);
  if (!current) {
    return sendError(res, 404, 'Transaction not found');
  }

  let nextAmount = current.amount;
  let nextType = current.type;
  if (value.amount !== undefined) {
    nextAmount = Math.abs(value.amount);
  }
  if (value.type !== undefined) {
    nextType = value.type;
  }
  if (nextType === 1 && nextAmount > 0) {
    nextAmount = -Math.abs(nextAmount);
  }
  if (nextType !== 1 && nextAmount < 0) {
    nextAmount = Math.abs(nextAmount);
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

  let resolvedAccountId = undefined;
  if (value.accountId !== undefined) {
    if (value.accountId === null) {
      resolvedAccountId = null;
    } else {
      resolvedAccountId = await store.resolveAccountId(req.user.id, value.accountId);
      if (!resolvedAccountId) {
        return sendError(res, 400, 'Invalid account');
      }
    }
  }

  const updated = await store.updateTransaction(req.user.id, transactionId, {
    description: value.description,
    amount: value.amount !== undefined || value.type !== undefined ? nextAmount : undefined,
    type: value.type,
    categoryId: resolvedCategoryId,
    accountId: resolvedAccountId,
    date: value.transactionDate,
    status: value.status,
  });

  if (!updated) {
    return sendError(res, 404, 'Transaction not found');
  }

  logger.info('transactions.update', { userId: req.user.id, transactionId: updated.id });
  const updatedExternalId = updated.transaction_external_id || updated.id?.toString();
  const updatedAccountExternalId = updated.account_external_id || updated.account_id?.toString();
  const updatedCategoryExternalId = updated.category_external_id || updated.category_id?.toString();
  sendJson(res, 200, {
    id: updatedExternalId,
    amount: Math.abs(Number(updated.amount)),
    description: updated.description,
    transactionDate: updated.date,
    type: updated.type,
    status: updated.status ?? 1,
    accountId: updatedAccountExternalId,
    accountName: updated.account_name || 'Conta',
    categoryId: updatedCategoryExternalId,
    categoryName: updated.category_name || 'Outros',
    reference: null,
    notes: null,
    isRecurring: false,
    tags: [],
    createdAt: new Date().toISOString(),
  });
}

async function handleDeleteTransaction(req, res, { params }) {
  const transactionId = params.id;
  try {
    const deleted = await store.deleteTransaction(req.user.id, transactionId);
    if (!deleted) {
      return sendError(res, 404, 'Transaction not found');
    }
    logger.info('transactions.delete', { userId: req.user.id, transactionId: deleted.id });
    sendJson(res, 200, { message: 'Transaction deleted successfully' });
  } catch (error) {
    logger.error('transactions.delete_error', { error: error.message });
    sendError(res, 500, config.isProd ? 'Internal server error' : error.message);
  }
}

async function handleTransactionsSummary(req, res) {
  try {
    const summary = await store.getAnalyticsSummary(req.user.id);
    const totalIncome = Number(summary.total_income || 0);
    const totalExpense = Number(summary.total_expenses || 0);
    const netAmount = totalIncome - totalExpense;

    sendJson(res, 200, {
      totalIncome,
      totalExpense,
      netAmount,
      transactionCount: summary.transaction_count || 0,
      fromDate: '',
      toDate: '',
    });
  } catch (error) {
    logger.error('transactions.summary_error', { error: error.message });
    sendError(res, 500, config.isProd ? 'Internal server error' : error.message);
  }
}

// ==================== EXPORT ALL HANDLERS ====================

module.exports = {
  injectServerData,
  
  // Health & Auth
  handleHealth,
  handleLogin,
  handleRefresh,
  handleLogout,
  handleMe,
  
  // Transactions
  handleGetTransactions,
  handleGetTransaction,
  handleCreateTransaction,
  handleUpdateTransaction,
  handleDeleteTransaction,
  handleTransactionsSummary,
  
  // Utility functions
  parseIntParam,
  parseFloatParam
};
