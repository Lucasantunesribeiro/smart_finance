const http = require('http');
const httpProxy = require('http-proxy');

// Create a proxy server
const proxy = httpProxy.createProxyServer({});

// Create HTTP server that redirects to Next.js on port 3003
const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - Redirecting: ${req.method} ${req.url}`);
  
  // Proxy all requests to Next.js on port 3003
  proxy.web(req, res, {
    target: 'http://localhost:3003',
    changeOrigin: true,
    timeout: 30000
  });
});

// Handle proxy errors
proxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err);
  if (!res.headersSent) {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Next.js server unavailable');
  }
});

// Start server on port 3000
server.listen(3000, '0.0.0.0', () => {
  console.log('🔄 Port redirect server running on port 3000');
  console.log('➡️  Redirecting all traffic to Next.js on port 3003');
  console.log('🌐 External access: http://34.203.238.219:3000');
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Redirect server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Redirect server closed');
    process.exit(0);
  });
});