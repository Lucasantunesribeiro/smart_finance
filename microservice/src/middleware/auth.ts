import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { createError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
  };
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      throw createError('Access denied. No token provided.', 401);
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw createError('JWT_SECRET must be defined in environment variables', 500);
    }
    const decoded = jwt.verify(token, jwtSecret) as {
      id: string;
      username: string;
      role: string;
    };

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw createError('Invalid token', 401);
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw createError('Token expired', 401);
    }
    next(error);
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw createError('Access denied. Authentication required.', 401);
    }

    if (!roles.includes(req.user.role)) {
      throw createError('Access denied. Insufficient permissions.', 403);
    }

    next();
  };
}; 