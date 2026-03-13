import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { createError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username?: string;
    email?: string;
    role: string;
    [key: string]: unknown;
  };
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const rawAuthorizationHeader = typeof req.header === 'function'
    ? req.header('Authorization')
    : req.headers.authorization;
  const authorizationHeader = Array.isArray(rawAuthorizationHeader)
    ? rawAuthorizationHeader[0]
    : rawAuthorizationHeader;
  if (!authorizationHeader) {
    res.status(401).json({
      status: 'error',
      message: 'Access token is required',
    });
    return;
  }

  if (!authorizationHeader.startsWith('Bearer ')) {
    res.status(401).json({
      status: 'error',
      message: 'Invalid token format',
    });
    return;
  }

  const token = authorizationHeader.slice('Bearer '.length).trim();
  if (!token) {
    res.status(401).json({
      status: 'error',
      message: 'Invalid token format',
    });
    return;
  }

  const jwtSecret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'test-secret' : undefined);
  if (!jwtSecret) {
    next(createError('JWT_SECRET must be defined in environment variables', 500));
    return;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as AuthRequest['user'];

    req.user = decoded;
    next();
  } catch (error) {
    const errorName = error instanceof Error ? error.name : '';

    if (errorName === 'TokenExpiredError') {
      res.status(401).json({
        status: 'error',
        message: 'Token has expired',
      });
      return;
    }

    if (errorName === 'JsonWebTokenError' || error instanceof Error) {
      res.status(401).json({
        status: 'error',
        message: 'Invalid or expired token',
      });
      return;
    }

    next(error);
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
}; 
