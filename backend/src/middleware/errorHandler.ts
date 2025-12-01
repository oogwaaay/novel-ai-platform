import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from './auth';

interface ErrorResponse {
  message: string;
  error?: string;
  stack?: string;
  timestamp: number;
}

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
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
    timestamp: Date.now()
  });
}


