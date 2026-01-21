const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// MIME types mapping
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.json': 'application/json'
};

// Serve static files
function serveStatic(req, res, filePath) {
  const extname = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    
    res.writeHead(200, { 
      'Content-Type': contentType,
      'Cache-Control': extname === '.html' ? 'no-cache' : 'public, max-age=31536000'
    });
    res.end(data);
  });
}

// Map routes to static files
function getStaticFile(url) {
  // Remove query parameters
  const cleanUrl = url.split('?')[0];
  
  // Static assets
  if (cleanUrl.startsWith('/_next/static/')) {
    return path.join(__dirname, '.next/static', cleanUrl.replace('/_next/static/', ''));
  }
  
  if (cleanUrl === '/favicon.ico') {
    return path.join(__dirname, 'public/favicon.ico');
  }
  
  // App routes
  if (cleanUrl === '/' || cleanUrl === '') {
    return path.join(__dirname, '.next/server/app/index.html');
  }
  
  if (cleanUrl === '/login') {
    return path.join(__dirname, '.next/server/app/login.html');
  }
  
  if (cleanUrl === '/dashboard') {
    return path.join(__dirname, '.next/server/app/dashboard.html');
  }
  
  if (cleanUrl.startsWith('/dashboard/')) {
    const page = cleanUrl.replace('/dashboard/', '');
    return path.join(__dirname, '.next/server/app/dashboard', page + '.html');
  }
  
  // Default to 404
  return path.join(__dirname, '.next/server/pages/404.html');
}

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  const filePath = getStaticFile(req.url);
  serveStatic(req, res, filePath);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🎉 SmartFinance Production Server (Node.js v16 Compatible)`);
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 External access: http://34.203.238.219:${PORT}`);
  console.log(`✅ Serving Next.js static build with React components`);
  console.log(`🎨 Original black/white design with sidebar navigation`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});