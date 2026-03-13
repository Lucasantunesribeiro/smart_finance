/** @type {import('next').NextConfig} */
const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  output: 'standalone',
  async headers() {
    const scriptSrc = ["'self'", "'unsafe-inline'"];
    if (!isProd) {
      scriptSrc.push("'unsafe-eval'");
    }

    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "img-src 'self' data:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      `script-src ${scriptSrc.join(' ')}`,
      (() => {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
        const signalrUrl = process.env.NEXT_PUBLIC_SIGNALR_URL || '';
        let origin = '';
        let signalrOrigin = '';
        if (apiUrl) {
          try { origin = new URL(apiUrl).origin; } catch { origin = apiUrl; }
        }
        if (signalrUrl) {
          try { signalrOrigin = new URL(signalrUrl).origin; } catch { signalrOrigin = signalrUrl; }
        }
        return `connect-src 'self' ws: wss:${origin ? ' ' + origin : ''}${signalrOrigin ? ' ' + signalrOrigin : ''}`;
      })(),
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/financehub',
        destination: `${backendUrl}/financehub`,
      },
      {
        source: '/financehub/:path*',
        destination: `${backendUrl}/financehub/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
