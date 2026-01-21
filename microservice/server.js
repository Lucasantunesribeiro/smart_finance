/**
 * SmartFinance Server - REFATORADO COM SMARTROUTER
 * 
 * @description Servidor Node.js refatorado com SmartRouter v2.0.0
 * @author Principal Engineer
 * @version 2.0.0 (Critical Production Fix)
 * 
 * ==================== MUDANÇAS CRÍTICAS ====================
 * ✅ SmartRouter implementado para roteamento robusto
 * ✅ Query parameters funcionando (paginação, filtros, ordenação)  
 * ✅ Parâmetros dinâmicos funcionando (/transactions/:id)
 * ✅ Handlers extraídos para módulos separados
 * ✅ 100% compatibilidade com frontend existente
 * ✅ Zero erros 404 em endpoints válidos
 */

const http = require('http');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const SmartRouter = require('./router');
const { buildConfig } = require('./config');
const { parseCookies, buildSetCookie, sendJson, sendError, readJsonBody, getClientIp, sendHtml } = require('./http-utils');
const { setSecurityHeaders } = require('./security-headers');
const { createRateLimiter } = require('./rate-limiter');
const logger = require('./logger');
const { createStore } = require('./store');
const { 
  injectServerData,
  handleHealth, 
  handleLogin,
  handleRefresh,
  handleLogout,
  handleMe,
  handleGetTransactions,
  handleGetTransaction,
  handleCreateTransaction, 
  handleUpdateTransaction,
  handleDeleteTransaction,
  handleTransactionsSummary
} = require('./handlers');

const {
  injectExtendedServerData,
  handleGetAccounts,
  handleGetAccount,
  handleAccountsBalance,
  handleCreateAccount,
  handleUpdateAccount,
  handleDeleteAccount,
  handleGetCategories,
  handleGetCategory,
  handleCreateCategory,
  handleUpdateCategory,
  handleDeleteCategory,
  handleCategoryStats,
  handleGetBudgets,
  handleGetBudget,
  handleCreateBudget,
  handleUpdateBudget,
  handleDeleteBudget,
  handleAnalyticsSummary,
  handleAnalyticsTrends,
  handleAnalyticsData,
  handleAnalyticsCashFlow,
  handleAnalyticsCategories
} = require('./handlers-extended');

const config = buildConfig();
const ipLimiter = createRateLimiter({ windowMs: config.rateLimit.windowMs, max: config.rateLimit.maxIp });
const userLimiter = createRateLimiter({ windowMs: config.rateLimit.windowMs, max: config.rateLimit.maxUser });
const loginLimiter = createRateLimiter({ windowMs: config.rateLimit.windowMs, max: config.rateLimit.maxLogin });

const docsServerUrl = process.env.DOCS_SERVER_URL || 'http://localhost:5000';
const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'SmartFinance Node.js Microservice',
    version: '2.0.0',
    description: 'Authenticated REST API for SmartFinance (Node.js)',
    contact: {
      name: 'SmartFinance Engineering',
      email: 'support@smartfinance.com',
    },
  },
  servers: [
    {
      url: docsServerUrl,
      description: 'Local Node.js microservice',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      SimpleAuthRequest: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
        required: ['email', 'password'],
      },
      LoginResponse: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
        },
      },
    },
  },
  paths: {
    '/api/v1/simpleauth/login': {
      post: {
        summary: 'Authenticate a user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SimpleAuthRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Tokens issued',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginResponse' },
              },
            },
          },
          '401': { description: 'Invalid credentials' },
        },
      },
    },
    '/api/v1/simpleauth/me': {
      get: {
        summary: 'Return information about the current user',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'User object',
          },
          '401': { description: 'Authentication required' },
        },
      },
    },
    '/api/v1/transactions': {
      get: {
        summary: 'List transactions for the authenticated user',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Paged transactions' },
        },
      },
      post: {
        summary: 'Create a transaction',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  description: { type: 'string' },
                  amount: { type: 'number' },
                  type: { type: 'integer', enum: [0, 1, 2] },
                  accountId: { type: 'string', format: 'uuid' },
                  categoryId: { type: 'string', format: 'uuid' },
                  transactionDate: { type: 'string', format: 'date' },
                },
                required: ['description', 'amount', 'type', 'accountId'],
              },
            },
          },
        },
        responses: {
          '201': { description: 'Transaction created' },
          '400': { description: 'Validation error' },
        },
      },
    },
    '/api/v1/budgets': {
      get: {
        summary: 'List budgets',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Budget list' },
        },
      },
    },
  },
};
const docsHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SmartFinance API Docs</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      body { margin:0; }
      #swagger-ui { width: 100vw; height: 100vh; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.onload = () => {
        SwaggerUIBundle({
          url: window.location.origin + '/docs/openapi.json',
          dom_id: '#swagger-ui',
          presets: [SwaggerUIBundle.presets.apis],
        });
      };
    </script>
  </body>
</html>
`;

// ==================== DATA STORAGE ====================

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function parseDurationToSeconds(value, fallback) {
  if (!value || typeof value !== 'string') return fallback;
  const match = value.trim().match(/^(\d+)(s|m|h|d)$/);
  if (!match) return fallback;
  const amount = parseInt(match[1], 10);
  const unit = match[2];
  if (unit === 's') return amount;
  if (unit === 'm') return amount * 60;
  if (unit === 'h') return amount * 60 * 60;
  if (unit === 'd') return amount * 60 * 60 * 24;
  return fallback;
}

function buildRefreshExpiryDate() {
  const refreshSeconds = parseDurationToSeconds(config.jwt.refreshTtl, 60 * 60 * 24 * 7);
  return new Date(Date.now() + refreshSeconds * 1000);
}

function createTokens(user) {
  const accessToken = jwt.sign(
    { sub: user.id.toString(), email: user.email, role: user.role, type: 'access' },
    config.jwt.accessSecret,
    { issuer: config.jwt.issuer, audience: config.jwt.audience, expiresIn: config.jwt.accessTtl }
  );
  const refreshToken = jwt.sign(
    { sub: user.id.toString(), email: user.email, role: user.role, type: 'refresh', jti: crypto.randomUUID() },
    config.jwt.refreshSecret,
    { issuer: config.jwt.issuer, audience: config.jwt.audience, expiresIn: config.jwt.refreshTtl }
  );
  return { accessToken, refreshToken };
}

async function issueTokens(user, context = {}) {
  const tokens = createTokens(user);
  const hashed = hashToken(tokens.refreshToken);
  const refreshExpiresAt = buildRefreshExpiryDate();
  await store.saveRefreshToken({
    userId: user.id,
    tokenHash: hashed,
    expiresAt: refreshExpiresAt,
    ip: context.ip,
    userAgent: context.userAgent,
  });
  return tokens;
}

function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    });
    if (decoded.type !== 'access') return null;
    return decoded;
  } catch {
    return null;
  }
}

function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    });
    if (decoded.type !== 'refresh') return null;
    return decoded;
  } catch {
    return null;
  }
}

async function rotateRefreshToken(refreshToken, context = {}) {
  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded) return null;
  const userId = parseInt(decoded.sub, 10);
  const oldHash = hashToken(refreshToken);
  const user = { id: userId, email: decoded.email, role: decoded.role };
  const tokens = createTokens(user);
  const newHash = hashToken(tokens.refreshToken);
  const refreshExpiresAt = buildRefreshExpiryDate();
  const rotated = await store.rotateRefreshToken(
    userId,
    oldHash,
    newHash,
    refreshExpiresAt,
    context.ip,
    context.userAgent
  );
  if (!rotated) {
    return null;
  }
  return { tokens, user };
}

async function revokeRefreshToken(refreshToken) {
  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded) return false;
  const userId = parseInt(decoded.sub, 10);
  const hashed = hashToken(refreshToken);
  return store.revokeRefreshToken(userId, hashed, null);
}

function setAuthCookies(res, tokens) {
  const accessMaxAge = parseDurationToSeconds(config.jwt.accessTtl, 60 * 15);
  const refreshMaxAge = parseDurationToSeconds(config.jwt.refreshTtl, 60 * 60 * 24 * 7);
  const accessCookie = buildSetCookie(config.cookies.accessName, tokens.accessToken, {
    httpOnly: true,
    secure: config.cookies.secure,
    sameSite: config.cookies.sameSite,
    domain: config.cookies.domain,
    maxAge: accessMaxAge,
  });
  const refreshCookie = buildSetCookie(config.cookies.refreshName, tokens.refreshToken, {
    httpOnly: true,
    secure: config.cookies.secure,
    sameSite: config.cookies.sameSite,
    domain: config.cookies.domain,
    maxAge: refreshMaxAge,
  });
  const csrfCookie = buildSetCookie(config.cookies.csrfName, crypto.randomBytes(24).toString('hex'), {
    httpOnly: false,
    secure: config.cookies.secure,
    sameSite: config.cookies.sameSite,
    domain: config.cookies.domain,
    maxAge: refreshMaxAge,
  });
  res.setHeader('Set-Cookie', [accessCookie, refreshCookie, csrfCookie]);
}

function clearAuthCookies(res) {
  const expired = new Date(0);
  res.setHeader('Set-Cookie', [
    buildSetCookie(config.cookies.accessName, '', { expires: expired, path: '/' }),
    buildSetCookie(config.cookies.refreshName, '', { expires: expired, path: '/' }),
    buildSetCookie(config.cookies.csrfName, '', { expires: expired, path: '/' }),
  ]);
}

let store;

// ==================== SMARTROUTER SETUP ====================

logger.info('server.init', { version: '2.0.0' });

const router = new SmartRouter();

// Register all routes
logger.info('router.registering');

// === HEALTH & AUTH ===
router.register('GET', '/health', handleHealth);
router.register('POST', '/api/v1/simpleauth/login', handleLogin);
router.register('POST', '/api/v1/simpleauth/refresh', handleRefresh);
router.register('POST', '/api/v1/simpleauth/logout', handleLogout);
router.register('GET', '/api/v1/simpleauth/me', handleMe);

// === TRANSACTIONS ===  
router.register('GET', '/api/v1/transactions', handleGetTransactions);
router.register('GET', '/api/v1/transactions/:id', handleGetTransaction);
router.register('POST', '/api/v1/transactions', handleCreateTransaction);
router.register('PUT', '/api/v1/transactions/:id', handleUpdateTransaction);
router.register('DELETE', '/api/v1/transactions/:id', handleDeleteTransaction);
router.register('GET', '/api/v1/transactions/summary', handleTransactionsSummary);

// === ACCOUNTS ===
router.register('GET', '/api/v1/accounts', handleGetAccounts);
router.register('GET', '/api/v1/accounts/:id', handleGetAccount);
router.register('GET', '/api/v1/accounts/balance', handleAccountsBalance);
router.register('POST', '/api/v1/accounts', handleCreateAccount);
router.register('PUT', '/api/v1/accounts/:id', handleUpdateAccount);
router.register('DELETE', '/api/v1/accounts/:id', handleDeleteAccount);

// === CATEGORIES ===
router.register('GET', '/api/v1/categories', handleGetCategories);
router.register('GET', '/api/v1/categories/:id', handleGetCategory);
router.register('POST', '/api/v1/categories', handleCreateCategory);
router.register('PUT', '/api/v1/categories/:id', handleUpdateCategory);
router.register('DELETE', '/api/v1/categories/:id', handleDeleteCategory);
router.register('GET', '/api/v1/categories/:id/stats', handleCategoryStats);

// === BUDGETS ===
router.register('GET', '/api/v1/budgets', handleGetBudgets);
router.register('GET', '/api/v1/budgets/:id', handleGetBudget);
router.register('POST', '/api/v1/budgets', handleCreateBudget);
router.register('PUT', '/api/v1/budgets/:id', handleUpdateBudget);
router.register('DELETE', '/api/v1/budgets/:id', handleDeleteBudget);

// === ANALYTICS ===
router.register('GET', '/api/v1/analytics/summary', handleAnalyticsSummary);
router.register('GET', '/api/v1/analytics/trends', handleAnalyticsTrends);
router.register('GET', '/api/v1/analytics/data', handleAnalyticsData);
router.register('GET', '/api/v1/analytics/cash-flow', handleAnalyticsCashFlow);
router.register('GET', '/api/v1/analytics/categories', handleAnalyticsCategories);
router.register('GET', '/docs/openapi.json', (req, res) => {
  sendJson(res, 200, openApiSpec);
});
router.register('GET', '/docs', (req, res) => {
  sendHtml(res, 200, docsHtml);
});

const stats = router.getStats();
logger.info('router.ready', { totalRoutes: stats.totalRoutes, routesByMethod: stats.routesByMethod });

const publicPaths = new Set(['/health', '/api/v1/simpleauth/login', '/api/v1/simpleauth/refresh']);

function applyCors(req, res) {
  const origin = req.headers.origin;
  if (origin && config.allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token');
}

function handlePreflight(req, res) {
  const origin = req.headers.origin;
  if (origin && !config.allowedOrigins.includes(origin)) {
    sendError(res, 403, 'Origin not allowed');
    return true;
  }
  res.writeHead(204);
  res.end();
  return true;
}

async function authenticateRequest(req, res, context) {
  if (publicPaths.has(context.pathname)) {
    return null;
  }

  const cookies = parseCookies(req);
  const authHeader = req.headers.authorization;
  const headerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const cookieToken = cookies[config.cookies.accessName];
  const token = headerToken || cookieToken;
  const tokenSource = headerToken ? 'header' : 'cookie';

  if (!token) {
    sendError(res, 401, 'Access token required');
    return undefined;
  }

  const decoded = verifyAccessToken(token);
  if (!decoded) {
    sendError(res, 401, 'Invalid or expired token');
    return undefined;
  }

  if (tokenSource === 'cookie' && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const csrfHeader = req.headers['x-csrf-token'];
    const csrfCookie = cookies[config.cookies.csrfName];
    if (!csrfHeader || csrfHeader !== csrfCookie) {
      sendError(res, 403, 'CSRF token invalid');
      return undefined;
    }
  }

  return {
    id: parseInt(decoded.sub, 10),
    email: decoded.email,
    role: decoded.role,
  };
}

// ==================== SERVER SETUP ====================

const server = http.createServer(async (req, res) => {
  const requestId = crypto.randomUUID();
  const clientIp = getClientIp(req, config.trustProxy);
  res.setHeader('X-Request-Id', requestId);

  setSecurityHeaders(res, config);
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return handlePreflight(req, res);
  }

  const ipResult = ipLimiter.isAllowed(clientIp);
  if (!ipResult.allowed) {
    return sendError(res, 429, 'Too many requests');
  }

  const match = router.match(req.method, req.url);
  const context = match || { pathname: req.url };

  logger.info('request.start', {
    requestId,
    method: req.method,
    path: req.url,
    ip: clientIp,
  });

  try {
    const user = await authenticateRequest(req, res, context);
    if (user === undefined) return;

    if (!publicPaths.has(context.pathname)) {
      const userResult = userLimiter.isAllowed(user.id.toString());
      if (!userResult.allowed) {
        return sendError(res, 429, 'Too many requests');
      }
      req.user = user;
    }

    if (match) {
      req.context = { requestId, ip: clientIp };
      await match.handler(req, res, {
        params: match.params,
        query: match.query,
        pathname: match.pathname,
        pattern: match.pattern,
      });
    } else {
      logger.warn('route.not_found', { requestId, method: req.method, path: req.url });
      sendError(res, 404, 'Endpoint not found');
    }
  } catch (error) {
    logger.error('request.error', { requestId, error: error.message });
    const message = config.isProd ? 'Internal server error' : error.message;
    sendError(res, 500, message);
  } finally {
    logger.info('request.end', { requestId, method: req.method, path: req.url });
  }
});

server.requestTimeout = 30000;
server.headersTimeout = 35000;
server.keepAliveTimeout = 5000;

async function startServer() {
  store = await createStore(config);
  await store.init();
  logger.info('store.ready', { type: store.type });

  const serverData = {
    store,
    issueTokens,
    verifyRefreshToken,
    rotateRefreshToken,
    revokeRefreshToken,
    setAuthCookies,
    clearAuthCookies,
    config,
    logger,
    readJsonBody,
    sendJson,
    sendError,
    loginLimiter,
    userLimiter,
  };

  injectServerData(serverData);
  injectExtendedServerData(serverData);

  server.listen(config.port, '0.0.0.0', () => {
    logger.info('server.ready', { port: config.port, env: config.env });
    if (!config.isProd) {
      router.printRoutes();
    }
  });
}

startServer().catch((error) => {
  logger.error('server.start_failed', { error: error.message });
  process.exit(1);
});

process.on('SIGTERM', async () => {
  logger.info('server.shutdown', { signal: 'SIGTERM' });
  if (store && store.close) {
    await store.close();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('server.shutdown', { signal: 'SIGINT' });
  if (store && store.close) {
    await store.close();
  }
  process.exit(0);
});
