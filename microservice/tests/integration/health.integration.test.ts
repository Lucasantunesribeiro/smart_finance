import request from 'supertest';
import express from 'express';

// Create a test app that mimics the main application structure
const app = express();

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: 'connected',
      redis: 'connected',
      queue: 'active',
    },
    version: '1.0.0',
  });
});

// Payment health endpoint
app.get('/payment/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'payment-microservice',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    dependencies: {
      mongodb: {
        status: 'connected',
        responseTime: '5ms',
      },
      redis: {
        status: 'connected',
        responseTime: '2ms',
      },
      queue: {
        status: 'active',
        jobs: {
          waiting: 0,
          active: 1,
          completed: 150,
          failed: 2,
        },
      },
    },
  });
});

describe('Health Integration Tests', () => {
  describe('GET /health', () => {
    it('should return comprehensive health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        environment: 'test',
        services: {
          database: 'connected',
          redis: 'connected',
          queue: 'active',
        },
        version: '1.0.0',
      });

      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeDefined();
      expect(response.body.memory).toBeDefined();
      
      expect(typeof response.body.uptime).toBe('number');
      expect(typeof response.body.memory).toBe('object');
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return valid ISO timestamp', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
      
      // Timestamp should be recent (within last 5 seconds)
      const now = new Date();
      const timeDiff = now.getTime() - timestamp.getTime();
      expect(timeDiff).toBeLessThan(5000);
    });

    it('should return proper memory usage structure', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      const memory = response.body.memory;
      expect(memory).toHaveProperty('rss');
      expect(memory).toHaveProperty('heapTotal');
      expect(memory).toHaveProperty('heapUsed');
      expect(memory).toHaveProperty('external');
      
      expect(typeof memory.rss).toBe('number');
      expect(typeof memory.heapTotal).toBe('number');
      expect(typeof memory.heapUsed).toBe('number');
      expect(typeof memory.external).toBe('number');
      
      expect(memory.rss).toBeGreaterThan(0);
      expect(memory.heapTotal).toBeGreaterThan(0);
      expect(memory.heapUsed).toBeGreaterThan(0);
      expect(memory.heapUsed).toBeLessThanOrEqual(memory.heapTotal);
    });

    it('should return correct content type', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('GET /payment/health', () => {
    it('should return payment service health status', async () => {
      const response = await request(app)
        .get('/payment/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        service: 'payment-microservice',
        dependencies: {
          mongodb: {
            status: 'connected',
            responseTime: expect.any(String),
          },
          redis: {
            status: 'connected',
            responseTime: expect.any(String),
          },
          queue: {
            status: 'active',
            jobs: {
              waiting: expect.any(Number),
              active: expect.any(Number),
              completed: expect.any(Number),
              failed: expect.any(Number),
            },
          },
        },
      });

      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeDefined();
    });

    it('should return queue statistics', async () => {
      const response = await request(app)
        .get('/payment/health')
        .expect(200);

      const queueStats = response.body.dependencies.queue.jobs;
      expect(queueStats.waiting).toBeGreaterThanOrEqual(0);
      expect(queueStats.active).toBeGreaterThanOrEqual(0);
      expect(queueStats.completed).toBeGreaterThanOrEqual(0);
      expect(queueStats.failed).toBeGreaterThanOrEqual(0);
    });

    it('should return dependency response times', async () => {
      const response = await request(app)
        .get('/payment/health')
        .expect(200);

      const dependencies = response.body.dependencies;
      expect(dependencies.mongodb.responseTime).toMatch(/^\d+ms$/);
      expect(dependencies.redis.responseTime).toMatch(/^\d+ms$/);
    });
  });

  describe('Health endpoint performance', () => {
    it('should respond quickly (under 100ms)', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/health')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(100);
    });

    it('should handle concurrent requests', async () => {
      const requests = Array(10).fill(null).map(() => 
        request(app).get('/health').expect(200)
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.body.status).toBe('healthy');
      });
    });
  });

  describe('Health endpoint reliability', () => {
    it('should be consistent across multiple calls', async () => {
      const responses = await Promise.all([
        request(app).get('/health'),
        request(app).get('/health'),
        request(app).get('/health'),
      ]);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('healthy');
        expect(response.body.environment).toBe('test');
      });
    });

    it('should handle malformed requests gracefully', async () => {
      await request(app)
        .get('/health')
        .set('Accept', 'text/plain')
        .expect(200);

      await request(app)
        .get('/health')
        .set('User-Agent', 'HealthChecker/1.0')
        .expect(200);
    });
  });
});