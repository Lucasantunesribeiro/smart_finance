import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow specific methods
  if (!['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'].includes(req.method || '')) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { url, ...query } = req.query;
    
    if (!url || Array.isArray(url)) {
      return res.status(400).json({ error: 'Invalid URL parameter' });
    }

    // Build the backend URL - ensure proper path construction
    const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
    const backendBase = process.env.BACKEND_URL || 'http://localhost:5000';
    const backendUrl = `${backendBase}/${cleanUrl}`;
    const queryString = new URLSearchParams(query as Record<string, string>).toString();
    const fullUrl = queryString ? `${backendUrl}?${queryString}` : backendUrl;

    console.log(`🔗 Backend Proxy: ${req.method} ${fullUrl}`);

    // Make request to backend
    const response = await fetch(fullUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization && { 'Authorization': req.headers.authorization }),
        ...(req.headers.cookie && { cookie: req.headers.cookie }),
        ...(req.headers['x-csrf-token'] && { 'X-CSRF-Token': String(req.headers['x-csrf-token']) }),
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? 
        JSON.stringify(req.body) : undefined,
    });

    // Copy response headers
    response.headers.forEach((value, key) => {
      if (key !== 'transfer-encoding') {
        res.setHeader(key, value);
      }
    });

    res.status(response.status);

    if (response.headers.get('content-type')?.includes('application/json')) {
      const data = await response.json();
      res.json(data);
    } else {
      const text = await response.text();
      res.send(text);
    }

    console.log(`✅ Backend Proxy Response: ${response.status}`);
  } catch (error) {
    console.error('❌ Backend Proxy Error:', error);
    res.status(502).json({ 
      error: 'Backend service unavailable', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    responseLimit: false,
  },
}
