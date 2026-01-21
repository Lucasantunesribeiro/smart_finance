const crypto = require('crypto');

function requireEnv(name, value, isProd) {
  if (isProd && (!value || value.trim() === '')) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function buildConfig() {
  const env = process.env.NODE_ENV || 'development';
  const isProd = env === 'production';

  const accessSecret = process.env.JWT_ACCESS_SECRET || (isProd ? '' : crypto.randomBytes(32).toString('hex'));
  const refreshSecret = process.env.JWT_REFRESH_SECRET || (isProd ? '' : crypto.randomBytes(32).toString('hex'));

  return {
    env,
    isProd,
    port: parseInt(process.env.PORT || '5000', 10),
    trustProxy: process.env.TRUST_PROXY === 'true',
    bodyLimitBytes: parseInt(process.env.BODY_LIMIT_BYTES || '1048576', 10),
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://smartfinance-prod-alb-1713518371.sa-east-1.elb.amazonaws.com/').split(',').map((o) => o.trim()),
    databaseUrl: requireEnv('DATABASE_URL', process.env.DATABASE_URL || '', isProd),
    dbSsl: process.env.DB_SSL === 'true',
    autoMigrate: process.env.AUTO_MIGRATE === 'true',
    seedDemoData: process.env.SEED_DEMO_DATA === 'true',
    jwt: {
      issuer: requireEnv('JWT_ISSUER', process.env.JWT_ISSUER || 'SmartFinance', isProd),
      audience: requireEnv('JWT_AUDIENCE', process.env.JWT_AUDIENCE || 'SmartFinanceUsers', isProd),
      accessSecret: requireEnv('JWT_ACCESS_SECRET', accessSecret, isProd),
      refreshSecret: requireEnv('JWT_REFRESH_SECRET', refreshSecret, isProd),
      accessTtl: process.env.JWT_ACCESS_TTL || '15m',
      refreshTtl: process.env.JWT_REFRESH_TTL || '7d',
    },
    cookies: {
      accessName: process.env.COOKIE_ACCESS_NAME || 'sf_at',
      refreshName: process.env.COOKIE_REFRESH_NAME || 'sf_rt',
      csrfName: process.env.COOKIE_CSRF_NAME || 'sf_csrf',
      domain: process.env.COOKIE_DOMAIN || undefined,
      secure: isProd || process.env.COOKIE_SECURE === 'true',
      sameSite: process.env.COOKIE_SAMESITE || 'Lax',
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
      maxIp: parseInt(process.env.RATE_LIMIT_MAX_IP || '200', 10),
      maxUser: parseInt(process.env.RATE_LIMIT_MAX_USER || '120', 10),
      maxLogin: parseInt(process.env.RATE_LIMIT_MAX_LOGIN || '10', 10),
    },
    security: {
      enableHsts: isProd,
    },
  };
}

module.exports = {
  buildConfig,
};
