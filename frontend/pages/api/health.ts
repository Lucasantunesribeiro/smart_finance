import type { NextApiRequest, NextApiResponse } from 'next';

type HealthData = {
  status: string;
  timestamp: string;
  uptime: number;
  memory: NodeJS.MemoryUsage;
  environment: string;
  version: string;
  pid: number;
};

type ErrorData = {
  status: string;
  timestamp: string;
  error: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthData | ErrorData>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Method not allowed'
    });
  }

  try {
    const healthData: HealthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      pid: process.pid
    };

    res.status(200).json(healthData);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}