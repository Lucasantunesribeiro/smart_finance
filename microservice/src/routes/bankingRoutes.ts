import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import { BankingService } from '../services/bankingService';

const router = Router();
const bankingService = new BankingService();

// Create bank account
router.post('/accounts', authMiddleware, async (req, res, next) => {
  try {
    const account = await bankingService.createBankAccount(req.body);
    res.status(201).json({
      status: 'success',
      data: account
    });
  } catch (error) {
    next(error);
  }
});

// Process transaction
router.post('/transactions', authMiddleware, async (req, res, next) => {
  try {
    const transaction = await bankingService.processTransaction(req.body);
    res.status(201).json({
      status: 'success',
      data: transaction
    });
  } catch (error) {
    next(error);
  }
});

// Reconcile transactions
router.post('/reconcile', authMiddleware, async (req, res, next) => {
  try {
    const result = await bankingService.reconcileTransactions(req.body);
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// Get account balance (new path for tests)
router.get('/accounts/:accountId/balance', authMiddleware, async (req, res, next) => {
  try {
    const balance = await bankingService.getAccountBalance(req.params.accountId);
    res.status(200).json({
      status: 'success',
      data: { balance }
    });
  } catch (error) {
    next(error);
  }
});

// Get transaction history (new path for tests)
router.get('/accounts/:accountId/transactions', authMiddleware, async (req, res, next) => {
  try {
    const { limit, offset } = req.query;
    const transactions = await bankingService.getTransactionHistory(
      req.params.accountId,
      parseInt(limit as string) || 50,
      parseInt(offset as string) || 0
    );
    res.status(200).json({
      status: 'success',
      data: transactions
    });
  } catch (error) {
    next(error);
  }
});

// Get bank account info
router.get('/account/:accountId', authMiddleware, async (req, res, next) => {
  try {
    const account = await bankingService.getAccountInfo(req.params.accountId);
    res.status(200).json({
      status: 'success',
      data: account
    });
  } catch (error) {
    next(error);
  }
});

// Get account balance
router.get('/balance/:accountId', authMiddleware, async (req, res, next) => {
  try {
    const balance = await bankingService.getAccountBalance(req.params.accountId);
    res.status(200).json({
      status: 'success',
      data: { balance }
    });
  } catch (error) {
    next(error);
  }
});

// Transfer funds
router.post('/transfer', authMiddleware, async (req, res, next) => {
  try {
    const transfer = await bankingService.transferFunds(req.body);
    res.status(201).json({
      status: 'success',
      data: transfer
    });
  } catch (error) {
    next(error);
  }
});

// Get transaction history
router.get('/transactions/:accountId', authMiddleware, async (req, res, next) => {
  try {
    const { limit, offset } = req.query;
    const transactions = await bankingService.getTransactionHistory(
      req.params.accountId,
      parseInt(limit as string) || 50,
      parseInt(offset as string) || 0
    );
    res.status(200).json({
      status: 'success',
      data: transactions
    });
  } catch (error) {
    next(error);
  }
});

// Verify account
router.post('/verify', authMiddleware, requireRole(['admin']), async (req, res, next) => {
  try {
    const verification = await bankingService.verifyAccount(req.body.accountId);
    res.status(200).json({
      status: 'success',
      data: verification
    });
  } catch (error) {
    next(error);
  }
});

export const bankingRoutes = router; 