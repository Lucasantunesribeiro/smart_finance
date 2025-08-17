import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../../src/middleware/errorHandler';

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      url: '/test',
      ip: '127.0.0.1',
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  it('should handle generic errors with 500 status', () => {
    const error = new Error('Something went wrong');

    errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Something went wrong',
      timestamp: expect.any(String),
      path: '/test',
    });
  });

  it('should handle errors with custom status codes', () => {
    const error = new Error('Not found') as any;
    error.statusCode = 404;

    errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Not found',
      timestamp: expect.any(String),
      path: '/test',
    });
  });

  it('should handle validation errors with 400 status', () => {
    const error = new Error('Validation failed') as any;
    error.name = 'ValidationError';
    error.errors = {
      field1: { message: 'Field is required' },
      field2: { message: 'Invalid format' },
    };

    errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Validation failed',
      errors: ['Field is required', 'Invalid format'],
      timestamp: expect.any(String),
      path: '/test',
    });
  });

  it('should handle MongoDB duplicate key errors', () => {
    const error = new Error('Duplicate key error') as any;
    error.name = 'MongoError';
    error.code = 11000;
    error.keyValue = { email: 'test@example.com' };

    errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(409);
    expect(mockResponse.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Duplicate value for field: email',
      timestamp: expect.any(String),
      path: '/test',
    });
  });

  it('should handle JWT token errors', () => {
    const error = new Error('Invalid token') as any;
    error.name = 'JsonWebTokenError';

    errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Invalid authentication token',
      timestamp: expect.any(String),
      path: '/test',
    });
  });

  it('should handle JWT expired token errors', () => {
    const error = new Error('Token expired') as any;
    error.name = 'TokenExpiredError';

    errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Authentication token has expired',
      timestamp: expect.any(String),
      path: '/test',
    });
  });

  it('should handle cast errors (invalid ObjectId)', () => {
    const error = new Error('Cast error') as any;
    error.name = 'CastError';
    error.path = '_id';
    error.value = 'invalid-id';

    errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Invalid ID format',
      timestamp: expect.any(String),
      path: '/test',
    });
  });

  it('should include stack trace in development environment', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const error = new Error('Test error');
    error.stack = 'Error stack trace';

    errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        stack: 'Error stack trace',
      })
    );

    process.env.NODE_ENV = originalEnv;
  });

  it('should not include stack trace in production environment', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const error = new Error('Test error');
    error.stack = 'Error stack trace';

    errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.not.objectContaining({
        stack: expect.any(String),
      })
    );

    process.env.NODE_ENV = originalEnv;
  });

  it('should handle errors without message', () => {
    const error = new Error();

    errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Internal server error',
      timestamp: expect.any(String),
      path: '/test',
    });
  });
});