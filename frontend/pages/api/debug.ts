import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const debug = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    headers: req.headers,
    query: req.query,
    body: req.body,
    environment: process.env.NODE_ENV,
    pid: process.pid,
    uptime: process.uptime(),
    backendTest: 'Testing backend connection...'
  };

  res.status(200).json(debug);
}