import React from 'react';
import type { GetServerSideProps } from 'next';

export default function ProxyPage() {
  return React.createElement('div', null, 'Proxy Handler');
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { req, res, query } = context;
  
  // Only allow specific methods
  if (!['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'].includes(req.method || '')) {
    res.statusCode = 405;
    return { props: { error: 'Method not allowed' } };
  }

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return { props: {} };
  }

  try {
    const { url, ...queryParams } = query;
    
    if (!url || Array.isArray(url)) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Invalid URL parameter' }));
      return { props: {} };
    }

    // Build the backend URL
    const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
    const backendBase = process.env.BACKEND_URL || 'http://localhost:5000';
    const backendUrl = `${backendBase}/${cleanUrl}`;
    const queryString = new URLSearchParams(queryParams as Record<string, string>).toString();
    const fullUrl = queryString ? `${backendUrl}?${queryString}` : backendUrl;

    console.log(`🔗 SSR Proxy: ${req.method} ${fullUrl}`);

    // Get request body for POST/PUT
    let body: string | undefined;
    if (req.method === 'POST' || req.method === 'PUT') {
      body = JSON.stringify(req.body);
    }

    // Make request to backend
    const response = await fetch(fullUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization && { 'Authorization': req.headers.authorization }),
        ...(req.headers.cookie && { cookie: req.headers.cookie }),
        ...(req.headers['x-csrf-token'] && { 'X-CSRF-Token': String(req.headers['x-csrf-token']) }),
      },
      body,
    });

    // Set response status
    res.statusCode = response.status;

    // Copy relevant headers
    const contentType = response.headers.get('content-type') || 'application/json';
    res.setHeader('Content-Type', contentType);

    if (contentType.includes('application/json')) {
      const data = await response.json();
      res.end(JSON.stringify(data));
    } else {
      const text = await response.text();
      res.end(text);
    }

    console.log(`✅ SSR Proxy Response: ${response.status}`);
    return { props: {} };

  } catch (error) {
    console.error('❌ SSR Proxy Error:', error);
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ 
      error: 'Backend service unavailable', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }));
    return { props: {} };
  }
};
