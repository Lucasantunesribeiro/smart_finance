import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { createClient } from 'redis';

const router = Router();

// Basic health check
router.get('/', async (req: Request, res: Response) => {
  try {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      pid: process.pid
    };

    res.status(200).json(healthData);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Readiness check (includes dependencies)
router.get('/ready', async (req: Request, res: Response) => {
  try {
    const checks = {
      mongodb: false,
      redis: false
    };

    // Check MongoDB connection
    try {
      if (mongoose.connection.readyState === 1) {
        checks.mongodb = true;
      }
    } catch (error) {
      console.error('MongoDB health check failed:', error);
    }

    // Check Redis connection
    try {
      const redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      });
      
      await redisClient.connect();
      await redisClient.ping();
      checks.redis = true;
      await redisClient.quit();
    } catch (error) {
      console.error('Redis health check failed:', error);
    }

    const isReady = checks.mongodb && checks.redis;
    const status = isReady ? 200 : 503;

    res.status(status).json({
      status: isReady ? 'ready' : 'not ready',
      timestamp: new Date().toISOString(),
      checks
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Liveness check (basic service availability)
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'live',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export const healthRoutes = router;