import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from './auth';

interface AuditLogEntry {
  timestamp: number;
  method: string;
  path: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  statusCode?: number;
  error?: string;
}

const auditLogs: AuditLogEntry[] = [];
const MAX_LOG_ENTRIES = 10000; // Keep last 10k entries in memory

export function auditLog(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]) : req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];

  // Log response when it finishes
  res.on('finish', () => {
    const entry: AuditLogEntry = {
      timestamp: startTime,
      method: req.method,
      path: req.path,
      userId,
      ip: ip || undefined,
      userAgent: userAgent || undefined,
      statusCode: res.statusCode
    };

    // Only log errors or important operations
    if (res.statusCode >= 400 || req.method !== 'GET') {
      auditLogs.push(entry);
      
      // Trim if too many entries
      if (auditLogs.length > MAX_LOG_ENTRIES) {
        auditLogs.shift();
      }

      // Log to console in development
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Audit]', JSON.stringify(entry));
      }
    }
  });

  next();
}

export function getAuditLogs(userId?: string, limit = 100): AuditLogEntry[] {
  let logs = auditLogs;
  
  if (userId) {
    logs = logs.filter((entry) => entry.userId === userId);
  }

  return logs.slice(-limit).reverse(); // Most recent first
}

export function clearAuditLogs(): void {
  auditLogs.length = 0;
}


