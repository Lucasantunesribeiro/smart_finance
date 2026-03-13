import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { AuthRequest } from './auth';
import { httpRequestDurationSeconds, httpRequestsTotal } from '../observability/metrics';
import { logger } from '../utils/logger';

const correlationIdHeader = 'x-correlation-id';

export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const correlationId = req.header(correlationIdHeader) || randomUUID();

  req.correlationId = correlationId;
  res.locals.correlationId = correlationId;
  res.setHeader(correlationIdHeader, correlationId);

  next();
};

export const httpObservabilityMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const route = req.route?.path ? `${req.baseUrl}${req.route.path}` : req.path;
    const labels = {
      method: req.method,
      route: route || 'unknown',
      status_code: String(res.statusCode),
    };

    httpRequestsTotal.inc(labels);
    httpRequestDurationSeconds.observe(labels, durationMs / 1000);

    logger.info('HTTP request completed', {
      correlationId: req.correlationId,
      durationMs: Number(durationMs.toFixed(2)),
      method: req.method,
      route: labels.route,
      statusCode: res.statusCode,
      userId: (req as AuthRequest).user?.id ?? null,
    });
  });

  next();
};
