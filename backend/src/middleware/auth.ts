import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production');
}
const FALLBACK_JWT_SECRET = JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthRequest;
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    // In development, allow requests without token or with null/undefined token (for testing)
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (isDevelopment && (!token || token === 'null' || token === 'undefined')) {
      authReq.user = {
        id: 'dev-user',
        email: 'dev@example.com'
      };
      return next();
    }

    if (!token || token === 'null' || token === 'undefined') {
      return res.status(401).json({ message: 'No token provided' });
    }

    try {
      const decoded = jwt.verify(token, FALLBACK_JWT_SECRET) as { id: string; email: string };
      authReq.user = {
        id: decoded.id,
        email: decoded.email
      };
      next();
    } catch (jwtError: unknown) {
      // In development, allow invalid tokens (for testing)
      if (isDevelopment) {
        authReq.user = {
          id: 'dev-user',
          email: 'dev@example.com'
        };
        return next();
      }
      res.status(401).json({ message: 'Invalid token' });
    }
  } catch (error: unknown) {
    // In development, allow any error (for testing)
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (isDevelopment) {
      authReq.user = {
        id: 'dev-user',
        email: 'dev@example.com'
      };
      return next();
    }
    res.status(401).json({ message: 'Authentication failed' });
  }
}
