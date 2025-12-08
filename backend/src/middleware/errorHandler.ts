import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from './auth';

interface ErrorResponse {
  message: string;
  error?: string;
  stack?: string;
  timestamp: number;
  code?: string;
}

// Custom error class for consistent error handling
export class ApiError extends Error {
  statusCode: number;
  code: string;
  
  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_SERVER_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'ApiError';
    
    // Capture stack trace if available
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}

// Helper function to handle errors in async controllers
export function asyncHandler<T extends (...args: any[]) => Promise<any>>(fn: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  // Handle ApiError instances differently
  if (err instanceof ApiError) {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    
    // Log error details
    console.error('[API Error]', {
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
      stack: err.stack,
      path: req.path,
      method: req.method,
      userId,
      timestamp: new Date().toISOString()
    });
    
    // In production, don't expose stack traces
    const response: ErrorResponse = {
      message: err.message,
      code: err.code,
      timestamp: Date.now()
    };
    
    if (process.env.NODE_ENV !== 'production') {
      response.error = err.message;
      response.stack = err.stack;
    }
    
    return res.status(err.statusCode).json(response);
  }
  
  // Handle all other errors
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;

  // Log error details
  console.error('[Error]', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId,
    timestamp: new Date().toISOString()
  });

  // In production, don't expose stack traces
  const response: ErrorResponse = {
    message: err.message || 'Internal server error',
    timestamp: Date.now()
  };

  if (process.env.NODE_ENV !== 'production') {
    response.error = err.message;
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    message: `Route ${req.method} ${req.path} not found`,
    code: 'NOT_FOUND',
    timestamp: Date.now()
  });
}

// Validation error handler for express-validator
export function validationErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err && err.array) {
    const errors = err.array();
    const message = errors.map((e: any) => e.msg).join(', ');
    
    return res.status(400).json({
      message,
      code: 'VALIDATION_ERROR',
      timestamp: Date.now()
    });
  }
  
  next(err);
}


