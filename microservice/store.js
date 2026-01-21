const { Pool } = require('pg');

function createDbPool(config) {
  return new Pool({
    connectionString: config.databaseUrl,
    ssl: config.dbSsl ? { rejectUnauthorized: false } : false,
    max: 10,
  });
}

async function createStore(config) {
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const pool = createDbPool(config);

  async function query(text, params) {
    return pool.query(text, params);
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89abAB][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const numericRegex = /^\d+$/;

  function getEntityTable(type) {
    switch (type) {
      case 'accounts':
        return 'accounts';
      case 'categories':
        return 'categories';
      case 'budgets':
        return 'budgets';
      default:
        throw new Error(`Unsupported entity type: ${type}`);
    }
  }

  async function resolveEntityInternalId(type, userId, identifier) {
    if (!identifier) return null;
    if (typeof identifier === 'number' || numericRegex.test(identifier)) {
      return Number(identifier);
    }
    if (!uuidRegex.test(identifier)) {
      return null;
    }
    const table = getEntityTable(type);
    const result = await query(
      `SELECT id FROM ${table} WHERE user_id = $1 AND external_id = $2 LIMIT 1`,
      [userId, identifier]
    );
    return result.rows[0]?.id || null;
  }

  async function resolveAccountId(userId, identifier) {
    return resolveEntityInternalId('accounts', userId, identifier);
  }

  async function resolveCategoryId(userId, identifier) {
    return resolveEntityInternalId('categories', userId, identifier);
  }

  async function resolveBudgetId(userId, identifier) {
    return resolveEntityInternalId('budgets', userId, identifier);
  }

  async function withTransaction(handler) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await handler(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async function init() {
    await query('SELECT 1');
  }

  async function close() {
    await pool.end();
  }

  async function getUserByEmail(email) {
    const result = await query(
      'SELECT id, email, password_hash, name, role, is_active FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  async function getUserById(id) {
    const result = await query(
      'SELECT id, email, password_hash, name, role, is_active FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async function ensureDefaultAccount(userId) {
    const existing = await query(
      'SELECT id FROM accounts WHERE user_id = $1 AND is_default = true LIMIT 1',
      [userId]
    );
    if (existing.rows[0]) return existing.rows[0].id;
    const created = await query(
      `INSERT INTO accounts (user_id, name, type, account_number, is_active, currency, description, is_default)
       VALUES ($1, $2, $3, $4, true, $5, $6, true)
       RETURNING id`,
      [userId, 'Conta Geral', 0, 'DEFAULT', 'BRL', 'Conta padrao']
    );
    return created.rows[0].id;
  }

  async function ensureDefaultCategory(userId) {
    const existing = await query(
      'SELECT id FROM categories WHERE user_id = $1 AND is_default = true LIMIT 1',
      [userId]
    );
    if (existing.rows[0]) return existing.rows[0].id;
    const created = await query(
      `INSERT INTO categories (user_id, name, type, description, color, icon, is_active, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, true, true)
       RETURNING id`,
      [userId, 'Outros', 1, 'Categoria padrao', '#95A5A6', null]
    );
    return created.rows[0].id;
  }

  async function listTransactions(userId, filters) {
    const values = [userId];
    const conditions = ['t.user_id = $1'];

    const resolvedCategoryId = filters.categoryId
      ? await resolveCategoryId(userId, filters.categoryId)
      : null;
    const resolvedAccountId = filters.accountId
      ? await resolveAccountId(userId, filters.accountId)
      : null;

    if (filters.categoryId && !resolvedCategoryId) {
      return { items: [], totalCount: 0 };
    }

    if (filters.accountId && !resolvedAccountId) {
      return { items: [], totalCount: 0 };
    }

    if (filters.categoryId) {
      values.push(resolvedCategoryId);
      conditions.push(`t.category_id = $${values.length}`);
    }
    if (filters.accountId) {
      values.push(resolvedAccountId);
      conditions.push(`t.account_id = $${values.length}`);
    }

    if (filters.startDate) {
      values.push(filters.startDate);
      conditions.push(`t.date >= $${values.length}`);
    }
    if (filters.endDate) {
      values.push(filters.endDate);
      conditions.push(`t.date <= $${values.length}`);
    }
    if (filters.minAmount !== null) {
      values.push(filters.minAmount);
      conditions.push(`ABS(t.amount) >= $${values.length}`);
    }
    if (filters.maxAmount !== null) {
      values.push(filters.maxAmount);
      conditions.push(`ABS(t.amount) <= $${values.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const sortMap = {
      date: 't.date',
      transactionDate: 't.date',
      amount: 'ABS(t.amount)',
      description: 't.description',
      category: 'c.name',
      id: 't.id',
    };
    const sortBy = sortMap[filters.sortBy] || 't.id';
    const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const countResult = await query(`SELECT COUNT(*)::int AS count FROM transactions t ${whereClause}`, values);
    const totalCount = countResult.rows[0]?.count || 0;

    values.push(filters.pageSize);
    values.push((filters.page - 1) * filters.pageSize);

    const listSql = `
      SELECT t.id,
             t.external_id AS transaction_external_id,
             t.description,
             t.amount,
             t.type,
             t.status,
             t.category_id,
             c.external_id AS category_external_id,
             c.name AS category_name,
             t.account_id,
             a.external_id AS account_external_id,
             a.name AS account_name,
             t.date
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      LEFT JOIN accounts a ON a.id = t.account_id
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `;
    const listResult = await query(listSql, values);
    return { items: listResult.rows, totalCount };
  }

  async function getTransaction(userId, identifier) {
    const useExternal = typeof identifier === 'string' && uuidRegex.test(identifier);
    const internalId = useExternal ? identifier : Number(identifier);
    if (!useExternal && Number.isNaN(internalId)) {
      return null;
    }
    const params = [userId, internalId];
    const whereClause = useExternal ? 't.external_id = $2' : 't.id = $2';
    const result = await query(
      `SELECT t.id,
              t.external_id AS transaction_external_id,
              t.description,
              t.amount,
              t.type,
              t.status,
              t.category_id,
              c.external_id AS category_external_id,
              c.name AS category_name,
              t.account_id,
              a.external_id AS account_external_id,
              a.name AS account_name,
              t.date
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       LEFT JOIN accounts a ON a.id = t.account_id
       WHERE t.user_id = $1 AND ${whereClause}`,
      params
    );
    return result.rows[0] || null;
  }

  async function createTransaction(userId, data) {
    const statusValue = data.status ?? 1;
    const result = await query(
      `INSERT INTO transactions (user_id, description, amount, type, category_id, account_id, date, external_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, gen_random_uuid()), $9)
       RETURNING id`,
      [
        userId,
        data.description,
        data.amount,
        data.type,
        data.categoryId,
        data.accountId,
        data.date,
        data.externalId || null,
        statusValue,
      ]
    );
    return getTransaction(userId, result.rows[0].id);
  }

  async function updateTransaction(userId, id, data) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (data.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(data.description);
    }
    if (data.amount !== undefined) {
      fields.push(`amount = $${idx++}`);
      values.push(data.amount);
    }
    if (data.type !== undefined) {
      fields.push(`type = $${idx++}`);
      values.push(data.type);
    }
    if (data.categoryId !== undefined) {
      fields.push(`category_id = $${idx++}`);
      values.push(data.categoryId);
    }
    if (data.accountId !== undefined) {
      fields.push(`account_id = $${idx++}`);
      values.push(data.accountId);
    }
    if (data.date !== undefined) {
      fields.push(`date = $${idx++}`);
      values.push(data.date);
    }
    if (data.status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(data.status);
    }
    if (!fields.length) return getTransaction(userId, id);

    values.push(userId, id);
    await query(
      `UPDATE transactions SET ${fields.join(', ')}, updated_at = now()
       WHERE user_id = $${idx++} AND id = $${idx}`,
      values
    );
    return getTransaction(userId, id);
  }

  async function deleteTransaction(userId, identifier) {
    const transaction = await getTransaction(userId, identifier);
    if (!transaction) {
      return null;
    }
    await query('DELETE FROM transactions WHERE user_id = $1 AND id = $2', [userId, transaction.id]);
    return transaction;
  }

  async function listAccounts(userId) {
    const result = await query(
      `SELECT a.id, a.external_id, a.name, a.type, a.account_number, a.is_active, a.currency, a.description, a.is_default,
              COALESCE(SUM(t.amount), 0) AS balance, a.created_at, a.updated_at
       FROM accounts a
       LEFT JOIN transactions t ON t.account_id = a.id
       WHERE a.user_id = $1
       GROUP BY a.id
       ORDER BY a.id`,
      [userId]
    );
    return result.rows;
  }

  async function getAccount(userId, identifier) {
    const useExternal = typeof identifier === 'string' && uuidRegex.test(identifier);
    const internalId = useExternal ? identifier : Number(identifier);
    if (!useExternal && Number.isNaN(internalId)) {
      return null;
    }
    const whereClause = useExternal ? 'a.external_id = $2' : 'a.id = $2';
    const result = await query(
      `SELECT a.id, a.external_id, a.name, a.type, a.account_number, a.is_active, a.currency, a.description, a.is_default,
              COALESCE(SUM(t.amount), 0) AS balance, a.created_at, a.updated_at
       FROM accounts a
       LEFT JOIN transactions t ON t.account_id = a.id
       WHERE a.user_id = $1 AND ${whereClause}
       GROUP BY a.id`,
      [userId, internalId]
    );
    return result.rows[0] || null;
  }

  async function createAccount(userId, data) {
    const result = await query(
      `INSERT INTO accounts (user_id, name, type, account_number, is_active, currency, description, is_default, external_id)
       VALUES ($1, $2, $3, $4, true, $5, $6, false, COALESCE($7, gen_random_uuid()))
       RETURNING id`,
      [userId, data.name, data.type, data.accountNumber, data.currency, data.description, data.externalId || null]
    );
    return getAccount(userId, result.rows[0].id);
  }

  async function updateAccount(userId, identifier, data) {
    const account = await getAccount(userId, identifier);
    if (!account) return null;
    const id = account.id;
    const fields = [];
    const values = [];
    let idx = 1;
    if (data.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(data.name);
    }
    if (data.type !== undefined) {
      fields.push(`type = $${idx++}`);
      values.push(data.type);
    }
    if (data.accountNumber !== undefined) {
      fields.push(`account_number = $${idx++}`);
      values.push(data.accountNumber);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(data.description);
    }
    if (data.currency !== undefined) {
      fields.push(`currency = $${idx++}`);
      values.push(data.currency);
    }
    if (data.isActive !== undefined) {
      fields.push(`is_active = $${idx++}`);
      values.push(data.isActive);
    }
    if (!fields.length) return account;
    values.push(userId, id);
    await query(
      `UPDATE accounts SET ${fields.join(', ')}, updated_at = now()
       WHERE user_id = $${idx++} AND id = $${idx}`,
      values
    );
    return getAccount(userId, id);
  }

  async function deleteAccount(userId, id) {
    const account = await getAccount(userId, id);
    if (!account) return null;
    if (account.is_default) return { error: 'default' };
    const defaultAccountId = await ensureDefaultAccount(userId);
    await query(
      'UPDATE transactions SET account_id = $1 WHERE user_id = $2 AND account_id = $3',
      [defaultAccountId, userId, account.id]
    );
    await query('DELETE FROM accounts WHERE user_id = $1 AND id = $2', [userId, account.id]);
    return account;
  }

  async function listCategories(userId) {
    const result = await query(
      `SELECT c.id, c.external_id, c.name, c.type, c.description, c.color, c.icon, c.parent_id, c.is_active, c.is_default,
              COUNT(t.id)::int AS transaction_count,
              COALESCE(SUM(ABS(t.amount)), 0) AS total_amount,
              c.created_at, c.updated_at
       FROM categories c
       LEFT JOIN transactions t ON t.category_id = c.id
       WHERE c.user_id = $1
       GROUP BY c.id
       ORDER BY c.id`,
      [userId]
    );
    return result.rows;
  }

  async function getCategory(userId, identifier) {
    const useExternal = typeof identifier === 'string' && uuidRegex.test(identifier);
    const internalId = useExternal ? identifier : Number(identifier);
    if (!useExternal && Number.isNaN(internalId)) {
      return null;
    }
    const whereClause = useExternal ? 'c.external_id = $2' : 'c.id = $2';
    const result = await query(
      `SELECT c.id, c.external_id, c.name, c.type, c.description, c.color, c.icon, c.parent_id, c.is_active, c.is_default,
              COUNT(t.id)::int AS transaction_count,
              COALESCE(SUM(ABS(t.amount)), 0) AS total_amount,
              c.created_at, c.updated_at
       FROM categories c
       LEFT JOIN transactions t ON t.category_id = c.id
       WHERE c.user_id = $1 AND ${whereClause}
       GROUP BY c.id`,
      [userId, internalId]
    );
    return result.rows[0] || null;
  }

  async function createCategory(userId, data) {
    const result = await query(
      `INSERT INTO categories (user_id, name, type, description, color, icon, parent_id, is_active, is_default, external_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, false, COALESCE($8, gen_random_uuid()))
       RETURNING id`,
      [
        userId,
        data.name,
        data.type,
        data.description,
        data.color,
        data.icon,
        data.parentCategoryId,
        data.externalId || null,
      ]
    );
    return getCategory(userId, result.rows[0].id);
  }

  async function updateCategory(userId, identifier, data) {
    const category = await getCategory(userId, identifier);
    if (!category) return null;
    const id = category.id;
    const fields = [];
    const values = [];
    let idx = 1;
    if (data.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(data.name);
    }
    if (data.type !== undefined) {
      fields.push(`type = $${idx++}`);
      values.push(data.type);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(data.description);
    }
    if (data.color !== undefined) {
      fields.push(`color = $${idx++}`);
      values.push(data.color);
    }
    if (data.icon !== undefined) {
      fields.push(`icon = $${idx++}`);
      values.push(data.icon);
    }
    if (data.parentCategoryId !== undefined) {
      fields.push(`parent_id = $${idx++}`);
      values.push(data.parentCategoryId);
    }
    if (data.isActive !== undefined) {
      fields.push(`is_active = $${idx++}`);
      values.push(data.isActive);
    }
    if (!fields.length) return category;
    values.push(userId, id);
    await query(
      `UPDATE categories SET ${fields.join(', ')}, updated_at = now()
       WHERE user_id = $${idx++} AND id = $${idx}`,
      values
    );
    return getCategory(userId, id);
  }

  async function deleteCategory(userId, id) {
    const category = await getCategory(userId, id);
    if (!category) return null;
    if (category.is_default) return { error: 'default' };
    const defaultCategoryId = await ensureDefaultCategory(userId);
    await query(
      'UPDATE transactions SET category_id = $1 WHERE user_id = $2 AND category_id = $3',
      [defaultCategoryId, userId, category.id]
    );
    await query('DELETE FROM categories WHERE user_id = $1 AND id = $2', [userId, category.id]);
    return category;
  }

  async function getCategoryStats(userId, id) {
    const result = await query(
      `SELECT COUNT(t.id)::int AS total_transactions,
              COALESCE(SUM(ABS(t.amount)), 0) AS total_amount,
              COALESCE(AVG(ABS(t.amount)), 0) AS average_amount,
              MAX(t.date) AS last_transaction
       FROM transactions t
       WHERE t.user_id = $1 AND t.category_id = $2`,
      [userId, id]
    );
    return result.rows[0] || null;
  }

  async function listBudgets(userId, filters) {
    const values = [userId];
    const conditions = ['b.user_id = $1'];
    if (filters.isActive !== undefined) {
      values.push(filters.isActive);
      conditions.push(`b.is_active = $${values.length}`);
    }
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(
      `SELECT b.*, c.external_id AS category_external_id, COALESCE(SUM(ABS(t.amount)), 0) AS spent
       FROM budgets b
       LEFT JOIN transactions t ON t.category_id = b.category_id
         AND t.user_id = b.user_id
         AND t.amount < 0
         AND t.date BETWEEN b.start_date AND b.end_date
       LEFT JOIN categories c ON c.id = b.category_id AND c.user_id = b.user_id
       ${whereClause}
       GROUP BY b.id, c.external_id
       ORDER BY b.id`,
      values
    );
    return result.rows;
  }

  async function getBudget(userId, identifier) {
    const useExternal = typeof identifier === 'string' && uuidRegex.test(identifier);
    const internalId = useExternal ? identifier : Number(identifier);
    if (!useExternal && Number.isNaN(internalId)) {
      return null;
    }
    const whereClause = useExternal ? 'b.external_id = $2' : 'b.id = $2';
    const params = [userId, internalId];
    const result = await query(
      `SELECT b.*, c.external_id AS category_external_id, COALESCE(SUM(ABS(t.amount)), 0) AS spent
       FROM budgets b
       LEFT JOIN transactions t ON t.category_id = b.category_id
         AND t.user_id = b.user_id
         AND t.amount < 0
         AND t.date BETWEEN b.start_date AND b.end_date
       LEFT JOIN categories c ON c.id = b.category_id AND c.user_id = b.user_id
       WHERE b.user_id = $1 AND ${whereClause}
       GROUP BY b.id, c.external_id`,
      params
    );
    return result.rows[0] || null;
  }

  async function createBudget(userId, data) {
    const result = await query(
      `INSERT INTO budgets (user_id, name, description, allocated, category_id, period, start_date, end_date, is_active, external_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, gen_random_uuid()))
       RETURNING id`,
      [
        userId,
        data.name,
        data.description,
        data.allocated,
        data.categoryId,
        data.period,
        data.startDate,
        data.endDate,
        data.isActive,
        data.externalId || null,
      ]
    );
    return getBudget(userId, result.rows[0].id);
  }

  async function updateBudget(userId, id, data) {
    const fields = [];
    const values = [];
    let idx = 1;
    if (data.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(data.description);
    }
    if (data.allocated !== undefined) {
      fields.push(`allocated = $${idx++}`);
      values.push(data.allocated);
    }
    if (data.categoryId !== undefined) {
      fields.push(`category_id = $${idx++}`);
      values.push(data.categoryId);
    }
    if (data.period !== undefined) {
      fields.push(`period = $${idx++}`);
      values.push(data.period);
    }
    if (data.startDate !== undefined) {
      fields.push(`start_date = $${idx++}`);
      values.push(data.startDate);
    }
    if (data.endDate !== undefined) {
      fields.push(`end_date = $${idx++}`);
      values.push(data.endDate);
    }
    if (data.isActive !== undefined) {
      fields.push(`is_active = $${idx++}`);
      values.push(data.isActive);
    }
    if (!fields.length) return getBudget(userId, id);
    values.push(userId, id);
    await query(
      `UPDATE budgets SET ${fields.join(', ')}, updated_at = now()
       WHERE user_id = $${idx++} AND id = $${idx}`,
      values
    );
    return getBudget(userId, id);
  }

  async function deleteBudget(userId, identifier) {
    const budget = await getBudget(userId, identifier);
    if (!budget) {
      return null;
    }
    await query('DELETE FROM budgets WHERE user_id = $1 AND id = $2', [userId, budget.id]);
    return budget;
  }

  async function getAnalyticsSummary(userId) {
    const result = await query(
      `SELECT
         COALESCE(SUM(CASE WHEN amount > 0 THEN amount END), 0) AS total_income,
         COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) END), 0) AS total_expenses,
         COUNT(*)::int AS transaction_count
       FROM transactions
       WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0];
  }

  async function getAnalyticsTrends() {
    return {
      income: { trend: 'neutral', percentage: 0 },
      expenses: { trend: 'neutral', percentage: 0 },
      savings: { trend: 'neutral', percentage: 0 },
    };
  }

  async function getAnalyticsData(userId) {
    const result = await query(
      `SELECT DATE_TRUNC('month', date) AS month,
              SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS income,
              SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) AS expenses
       FROM transactions
       WHERE user_id = $1
       GROUP BY month
       ORDER BY month`,
      [userId]
    );
    return result.rows;
  }

  async function getAnalyticsCashFlow(userId) {
    const result = await query(
      `SELECT
         COALESCE(SUM(CASE WHEN amount > 0 THEN amount END), 0) AS inflow,
         COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) END), 0) AS outflow,
         COALESCE(SUM(amount), 0) AS netflow
       FROM transactions
       WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0];
  }

  async function getAnalyticsCategories(userId) {
    const result = await query(
      `SELECT c.name, c.color,
              COALESCE(SUM(ABS(t.amount)), 0) AS amount,
              COUNT(t.id)::int AS transaction_count
       FROM categories c
       LEFT JOIN transactions t ON t.category_id = c.id AND t.user_id = c.user_id
       WHERE c.user_id = $1 AND c.is_default = false
       GROUP BY c.id
       HAVING COALESCE(SUM(ABS(t.amount)), 0) > 0`,
      [userId]
    );
    return result.rows;
  }

  async function saveRefreshToken({ userId, tokenHash, expiresAt, ip, userAgent }) {
    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, tokenHash, expiresAt, ip || null, userAgent || null]
    );
  }

  async function revokeRefreshToken(userId, tokenHash, replacedByHash) {
    const result = await query(
      `UPDATE refresh_tokens
       SET revoked_at = now(), replaced_by_hash = $3
       WHERE user_id = $1 AND token_hash = $2 AND revoked_at IS NULL
       RETURNING id`,
      [userId, tokenHash, replacedByHash || null]
    );
    return result.rowCount > 0;
  }

  async function rotateRefreshToken(userId, oldHash, newHash, newExpiresAt, ip, userAgent) {
    return withTransaction(async (client) => {
      const revoked = await client.query(
        `UPDATE refresh_tokens
         SET revoked_at = now(), replaced_by_hash = $3
         WHERE user_id = $1 AND token_hash = $2 AND revoked_at IS NULL AND expires_at > now()
         RETURNING id`,
        [userId, oldHash, newHash]
      );
      if (!revoked.rows[0]) {
        return false;
      }
      await client.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, newHash, newExpiresAt, ip || null, userAgent || null]
      );
      return true;
    });
  }

  async function isRefreshTokenValid(userId, tokenHash) {
    const result = await query(
      `SELECT id
       FROM refresh_tokens
       WHERE user_id = $1
         AND token_hash = $2
         AND revoked_at IS NULL
         AND expires_at > now()`,
      [userId, tokenHash]
    );
    return Boolean(result.rows[0]);
  }

  async function moveTransactionsToDefault(userId, options) {
    if (options.fromAccountId) {
      const defaultAccountId = await ensureDefaultAccount(userId);
      await query(
        'UPDATE transactions SET account_id = $1 WHERE user_id = $2 AND account_id = $3',
        [defaultAccountId, userId, options.fromAccountId]
      );
    }
    if (options.fromCategoryId) {
      const defaultCategoryId = await ensureDefaultCategory(userId);
      await query(
        'UPDATE transactions SET category_id = $1 WHERE user_id = $2 AND category_id = $3',
        [defaultCategoryId, userId, options.fromCategoryId]
      );
    }
  }

  return {
    type: 'db',
    init,
    close,
    getUserByEmail,
    getUserById,
    listTransactions,
    getTransaction,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    listAccounts,
    getAccount,
    createAccount,
    updateAccount,
    deleteAccount,
    listCategories,
    getCategory,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoryStats,
    listBudgets,
    getBudget,
    createBudget,
    updateBudget,
    deleteBudget,
    resolveAccountId,
    resolveCategoryId,
    resolveBudgetId,
    getAnalyticsSummary,
    getAnalyticsTrends,
    getAnalyticsData,
    getAnalyticsCashFlow,
    getAnalyticsCategories,
    moveTransactionsToDefault,
    saveRefreshToken,
    revokeRefreshToken,
    rotateRefreshToken,
    isRefreshTokenValid,
  };
}

module.exports = {
  createStore,
};
