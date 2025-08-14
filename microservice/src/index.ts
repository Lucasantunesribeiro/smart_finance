import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createClient } from 'redis';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';

import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { paymentRoutes } from './routes/paymentRoutes';
import { bankingRoutes } from './routes/bankingRoutes';
import { queueService } from './services/queueService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

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
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(limiter);

app.use('/api/v1/payments', authMiddleware, paymentRoutes);
app.use('/api/v1/banking', authMiddleware, bankingRoutes);

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.use(errorHandler);

async function startServer() {
  try {
    const redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    redisClient.on('error', (error) => {
      logger.error('Redis connection error:', error);
    });

    await redisClient.connect();
    logger.info('Redis connected successfully');

    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartfinance_payments');
    logger.info('MongoDB connected successfully');

    await queueService.initialize();
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
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  await queueService.shutdown();
  await mongoose.connection.close();
  process.exit(0);
});

startServer();