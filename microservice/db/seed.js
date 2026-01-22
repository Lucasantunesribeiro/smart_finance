const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function seed() {
  const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';
  if (isProd && process.env.ALLOW_SEED_PROD !== 'true') {
    console.error('Refusing to seed in production. Set ALLOW_SEED_PROD=true to override.');
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for seed');
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  await client.connect();

  // Esses usuários são apenas para demonstração/local development; troque por dados reais em produção.
  const users = [
    { email: 'admin@smartfinance.com', password: 'admin123', name: 'Admin User', role: 1 },
    { email: 'teste@smartfinance.com', password: 'teste123', name: 'Teste User', role: 0 },
  ];

  const defaultAccounts = [
    {
      name: 'Main Account',
      type: 0,
      accountNumber: 'DEFAULT',
      currency: 'BRL',
      description: 'Conta Global',
      externalId: '00000000-0000-0000-0000-000000000001',
      isDefault: true,
    },
    {
      name: 'Savings Account',
      type: 1,
      accountNumber: 'SAVINGS',
      currency: 'BRL',
      description: 'Conta de poupança',
      externalId: '00000000-0000-0000-0000-000000000002',
      isDefault: false,
    },
  ];

  const defaultCategories = [
    {
      name: 'Alimentação',
      type: 1,
      color: '#FF6B6B',
      icon: '🍽️',
      externalId: '11111111-1111-1111-1111-111111111001',
    },
    {
      name: 'Transporte',
      type: 1,
      color: '#4ECDC4',
      icon: '🚗',
      externalId: '11111111-1111-1111-1111-111111111002',
    },
    {
      name: 'Lazer',
      type: 1,
      color: '#45B7D1',
      icon: '🎬',
      externalId: '11111111-1111-1111-1111-111111111003',
    },
    {
      name: 'Salário',
      type: 0,
      color: '#96CEB4',
      icon: '💰',
      externalId: '11111111-1111-1111-1111-111111111004',
    },
    {
      name: 'Outros',
      type: 1,
      color: '#FFEAA7',
      icon: '🧾',
      externalId: '11111111-1111-1111-1111-111111111005',
    },
  ];

  for (const user of users) {
    const passwordHash = bcrypt.hashSync(user.password, 10);
    await client.query(
      `INSERT INTO users (email, password_hash, name, role, is_active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (email) DO NOTHING`,
      [user.email, passwordHash, user.name, user.role]
    );

    const result = await client.query('SELECT id FROM users WHERE email = $1', [user.email]);
    const userId = result.rows[0]?.id;
    if (!userId) continue;

    for (const account of defaultAccounts) {
      await client.query(
        `INSERT INTO accounts (user_id, name, type, account_number, is_active, currency, description, is_default, external_id)
         VALUES ($1, $2, $3, $4, true, $5, $6, $7, $8)
         ON CONFLICT (user_id, external_id) DO NOTHING`,
        [
          userId,
          account.name,
          account.type,
          account.accountNumber,
          account.currency,
          account.description,
          account.isDefault,
          account.externalId,
        ]
      );
    }

    for (const category of defaultCategories) {
      await client.query(
        `INSERT INTO categories (user_id, name, type, description, color, icon, is_active, is_default, external_id)
         VALUES ($1, $2, $3, $4, $5, $6, true, false, $7)
         ON CONFLICT (user_id, external_id) DO NOTHING`,
        [
          userId,
          category.name,
          category.type,
          `${category.name} padrão`,
          category.color,
          category.icon,
          category.externalId,
        ]
      );
    }
  }

  if (process.env.SEED_DEMO_DATA === 'true') {
    const admin = await client.query('SELECT id FROM users WHERE email = $1', ['admin@smartfinance.com']);
    const userId = admin.rows[0]?.id;
    if (userId) {
      const account = await client.query('SELECT id FROM accounts WHERE user_id = $1 AND is_default = true', [userId]);
      const category = await client.query('SELECT id FROM categories WHERE user_id = $1 AND is_default = true', [userId]);
      const accountId = account.rows[0]?.id;
      const categoryId = category.rows[0]?.id;

      if (accountId && categoryId) {
        await client.query(
          `INSERT INTO transactions (user_id, description, amount, type, category_id, account_id, date)
           VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)
           ON CONFLICT DO NOTHING`,
          [userId, 'Salario', 5000, 0, categoryId, accountId]
        );
        await client.query(
          `INSERT INTO transactions (user_id, description, amount, type, category_id, account_id, date)
           VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)
           ON CONFLICT DO NOTHING`,
          [userId, 'Supermercado', -350, 1, categoryId, accountId]
        );
      }
    }
  }

  await client.end();
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
