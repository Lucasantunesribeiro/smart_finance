// SmartFinance Database Initialization Script
// Optimized for free tier deployment

// Switch to SmartFinance database
db = db.getSiblingDB('smartfinance');

// Create application user with limited permissions
db.createUser({
  user: 'smartfinance_app',
  pwd: 'app_password_2024',
  roles: [
    {
      role: 'readWrite',
      db: 'smartfinance'
    }
  ]
});

// Create collections with optimized settings
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'password', 'createdAt'],
      properties: {
        email: { bsonType: 'string' },
        password: { bsonType: 'string' },
        firstName: { bsonType: 'string' },
        lastName: { bsonType: 'string' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  }
});

db.createCollection('transactions', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'amount', 'type', 'date'],
      properties: {
        userId: { bsonType: 'objectId' },
        amount: { bsonType: 'number' },
        type: { enum: ['income', 'expense'] },
        category: { bsonType: 'string' },
        description: { bsonType: 'string' },
        date: { bsonType: 'date' }
      }
    }
  }
});

db.createCollection('categories');
db.createCollection('budgets');
db.createCollection('payments');

// Create optimized indexes for performance on limited resources
print('Creating indexes...');

// Users collection indexes
db.users.createIndex({ 'email': 1 }, { unique: true, background: true });
db.users.createIndex({ 'createdAt': 1 }, { background: true });

// Transactions collection indexes (compound indexes for efficiency)
db.transactions.createIndex({ 'userId': 1, 'date': -1 }, { background: true });
db.transactions.createIndex({ 'userId': 1, 'type': 1 }, { background: true });
db.transactions.createIndex({ 'userId': 1, 'category': 1 }, { background: true });

// Categories collection indexes
db.categories.createIndex({ 'userId': 1 }, { background: true });
db.categories.createIndex({ 'type': 1 }, { background: true });

// Budgets collection indexes
db.budgets.createIndex({ 'userId': 1 }, { background: true });
db.budgets.createIndex({ 'userId': 1, 'month': 1, 'year': 1 }, { background: true });

// Payments collection indexes
db.payments.createIndex({ 'userId': 1, 'createdAt': -1 }, { background: true });
db.payments.createIndex({ 'status': 1 }, { background: true });

// Insert default categories
print('Inserting default categories...');
db.categories.insertMany([
  {
    name: 'Food & Dining',
    type: 'expense',
    color: '#FF6B6B',
    icon: '🍽️',
    isDefault: true,
    createdAt: new Date()
  },
  {
    name: 'Transportation',
    type: 'expense',
    color: '#4ECDC4',
    icon: '🚗',
    isDefault: true,
    createdAt: new Date()
  },
  {
    name: 'Shopping',
    type: 'expense',
    color: '#45B7D1',
    icon: '🛍️',
    isDefault: true,
    createdAt: new Date()
  },
  {
    name: 'Entertainment',
    type: 'expense',
    color: '#96CEB4',
    icon: '🎬',
    isDefault: true,
    createdAt: new Date()
  },
  {
    name: 'Bills & Utilities',
    type: 'expense',
    color: '#FFEAA7',
    icon: '💡',
    isDefault: true,
    createdAt: new Date()
  },
  {
    name: 'Healthcare',
    type: 'expense',
    color: '#DDA0DD',
    icon: '🏥',
    isDefault: true,
    createdAt: new Date()
  },
  {
    name: 'Salary',
    type: 'income',
    color: '#98D8C8',
    icon: '💰',
    isDefault: true,
    createdAt: new Date()
  },
  {
    name: 'Freelance',
    type: 'income',
    color: '#F7DC6F',
    icon: '💼',
    isDefault: true,
    createdAt: new Date()
  },
  {
    name: 'Investment',
    type: 'income',
    color: '#BB8FCE',
    icon: '📈',
    isDefault: true,
    createdAt: new Date()
  }
]);

// Create database statistics collection for monitoring
db.createCollection('db_stats');

// Insert initial stats document
db.db_stats.insertOne({
  initialized: new Date(),
  version: '1.0.0',
  environment: 'free-tier',
  collections: {
    users: 0,
    transactions: 0,
    categories: 9,
    budgets: 0,
    payments: 0
  }
});

print('SmartFinance database initialized successfully for free tier deployment');
print('Database user created: smartfinance_app');
print('Collections created with optimized indexes');
print('Default categories inserted');
print('Ready for application connection');