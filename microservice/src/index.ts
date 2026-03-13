import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { createClient } from 'redis';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';

import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { correlationIdMiddleware, httpObservabilityMiddleware } from './middleware/observability';
import { registry, setDependencyStatus } from './observability/metrics';
import { paymentRoutes } from './routes/paymentRoutes';
import { bankingRoutes } from './routes/bankingRoutes';
import { queueService } from './services/queueService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const dependencies = {
  mongodb: false,
  queue: false,
  redis: false,
};

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));
app.use(compression());
app.use(correlationIdMiddleware);
app.use(httpObservabilityMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(limiter);

app.use('/api/v1/payments', authMiddleware, paymentRoutes);
app.use('/api/v1/banking', authMiddleware, bankingRoutes);
app.get('/metrics', async (_req, res, next) => {
  try {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  } catch (error) {
    next(error);
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/ready', (_req, res) => {
  const isReady = Object.values(dependencies).every(Boolean);
  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ready' : 'degraded',
    dependencies,
    timestamp: new Date().toISOString(),
  });
});

app.use(errorHandler);

async function startServer() {
  try {
    const redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    redisClient.on('error', (error) => {
      dependencies.redis = false;
      setDependencyStatus('redis', false);
      logger.error('Redis connection error:', error);
    });

    await redisClient.connect();
    dependencies.redis = true;
    setDependencyStatus('redis', true);
    logger.info('Redis connected successfully');

    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartfinance_payments');
    dependencies.mongodb = true;
    setDependencyStatus('mongodb', true);
    logger.info('MongoDB connected successfully');

    await queueService.initialize();
    dependencies.queue = true;
    setDependencyStatus('queue', true);
    logger.info('Queue service initialized successfully');

    app.listen(PORT, () => {
      logger.info(`Payment microservice running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  await queueService.shutdown();
  await mongoose.connection.close();
  dependencies.mongodb = false;
  dependencies.queue = false;
  dependencies.redis = false;
  setDependencyStatus('mongodb', false);
  setDependencyStatus('queue', false);
  setDependencyStatus('redis', false);
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  await queueService.shutdown();
  await mongoose.connection.close();
  dependencies.mongodb = false;
  dependencies.queue = false;
  dependencies.redis = false;
  setDependencyStatus('mongodb', false);
  setDependencyStatus('queue', false);
  setDependencyStatus('redis', false);
  process.exit(0);
});

startServer();
