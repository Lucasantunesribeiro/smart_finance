// MongoDB initialization script for SmartFinance
// This script runs when MongoDB container starts

// Switch to smartfinance database
db = db.getSiblingDB('smartfinance');

// Create collections (they will be created automatically when data is inserted)
// Collections: users, transactions, categories, accounts, budgets, payments

// Create indexes for better performance
db.users.createIndex({ "email": 1 }, { "unique": true });
db.transactions.createIndex({ "userId": 1 });
db.transactions.createIndex({ "transactionDate": -1 });
db.transactions.createIndex({ "categoryId": 1 });
db.accounts.createIndex({ "userId": 1 });
db.budgets.createIndex({ "userId": 1 });
db.categories.createIndex({ "userId": 1 });

// Create indexes for payment microservice
db.payments.createIndex({ "userId": 1 });
db.payments.createIndex({ "status": 1 });
db.payments.createIndex({ "createdAt": -1 });
db.bankAccounts.createIndex({ "userId": 1 });
db.bankTransactions.createIndex({ "accountId": 1 });
db.bankTransactions.createIndex({ "transactionDate": -1 });

// TODO: Insert real initial data here if needed
// No mock data - database will be populated by the application

print("MongoDB initialized successfully - ready for real data"); 