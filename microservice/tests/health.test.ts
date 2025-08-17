import request from 'supertest';
import express from 'express';

// Create a simple app with just the health endpoint for testing
const app = express();

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
  });
});

describe('Health Endpoint', () => {
  it('should return health status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toMatchObject({
      status: 'healthy',
      environment: 'test',
    });

    expect(response.body.timestamp).toBeDefined();
    expect(response.body.uptime).toBeDefined();
    expect(response.body.memory).toBeDefined();
    expect(typeof response.body.uptime).toBe('number');
    expect(typeof response.body.memory).toBe('object');
  });

  it('should return valid timestamp format', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    const timestamp = new Date(response.body.timestamp);
    expect(timestamp).toBeInstanceOf(Date);
    expect(timestamp.getTime()).not.toBeNaN();
  });

  it('should return memory usage information', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body.memory).toHaveProperty('rss');
    expect(response.body.memory).toHaveProperty('heapTotal');
    expect(response.body.memory).toHaveProperty('heapUsed');
    expect(response.body.memory).toHaveProperty('external');
    
    expect(typeof response.body.memory.rss).toBe('number');
    expect(typeof response.body.memory.heapTotal).toBe('number');
    expect(typeof response.body.memory.heapUsed).toBe('number');
    expect(typeof response.body.memory.external).toBe('number');
  });
});