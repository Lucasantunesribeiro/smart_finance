import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.status(200).json({
    success: true,
    message: 'Direct connection to Next.js working!',
    timestamp: new Date().toISOString(),
    pid: process.pid
  });
}