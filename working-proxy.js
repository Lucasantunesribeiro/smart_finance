const express = require('express');
const app = express();
const PORT = 8080;

console.log('🚀 Starting SmartFinance Working Proxy...');

// Parse JSON bodies
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check - MUST be before other routes
app.get('/proxy-health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    services: {
      frontend: 'http://localhost:4001',
      backend: 'http://localhost:5000'
    }
  });
});

// Manual proxy for backend API
app.use('/api', async (req, res) => {
  try {
    const fullPath = `/api${req.url}`;
    console.log(`🔗 Proxying API: ${req.method} ${req.url} -> http://localhost:5000${fullPath}`);
    
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch(`http://localhost:5000${fullPath}`, {
      method: req.method,
      headers: {
        ...req.headers,
        'host': 'localhost:5000',
        'x-forwarded-for': req.ip,
        'x-forwarded-proto': req.protocol,
        'x-forwarded-host': req.get('host')
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined
    });

    // Copy response headers
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    res.status(response.status);
    
    if (response.headers.get('content-type')?.includes('application/json')) {
      const data = await response.json();
      res.json(data);
    } else {
      const text = await response.text();
      res.send(text);
    }

    console.log(`✅ API Response: ${response.status}`);
  } catch (error) {
    console.error('❌ API Proxy Error:', error.message);
    res.status(502).json({ error: 'Backend service unavailable', details: error.message });
  }
});

// Manual proxy for frontend
app.use('/', async (req, res) => {
  try {
    console.log(`🎨 Proxying Frontend: ${req.method} ${req.url} -> http://localhost:4001${req.url}`);
    
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch(`http://localhost:4001${req.url}`, {
      method: req.method,
      headers: {
        ...req.headers,
        'host': 'localhost:4001',
        'x-forwarded-for': req.ip,
        'x-forwarded-proto': req.protocol,
        'x-forwarded-host': req.get('host')
      }
    });

    // Copy response headers
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    res.status(response.status);
    
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      res.json(data);
    } else if (contentType?.includes('text/')) {
      const text = await response.text();
      res.send(text);
    } else {
      const buffer = await response.buffer();
      res.send(buffer);
    }

    console.log(`✅ Frontend Response: ${response.status}`);
  } catch (error) {
    console.error('❌ Frontend Proxy Error:', error.message);
    res.status(502).json({ error: 'Frontend service unavailable', details: error.message });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('❌ Global Error:', err);
  res.status(500).json({ error: 'Internal proxy error' });
});

app.listen(PORT, '0.0.0.0', (err) => {
  if (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
  console.log(`✅ SmartFinance Proxy running on port ${PORT}`);
  console.log(`🌐 External access: http://34.203.238.219:${PORT}`);
  console.log(`📡 Frontend: http://localhost:3000`);
  console.log(`🔌 Backend: http://localhost:5000`);
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down...');
  process.exit(0);
});