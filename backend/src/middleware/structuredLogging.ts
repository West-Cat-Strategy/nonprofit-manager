/**
 * Structured Request Logging Middleware
 * 
 * Logs all HTTP requests and responses with structured format
 * suitable for log aggregation services (ELK, Loki, Datadog, etc.).
 * 
 * Captures:
 * - Request method, path, query parameters
 * - Response status code, size, response time
 * - User information if authenticated
 * - Error details for failed requests
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';
import { decryptPII } from '../utils/piiEncryption';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  requestId?: string;
  startTime?: number;
}

/**
 * Request logging middleware
 * Logs incoming request details with unique request ID
 */
export function requestLogger(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // Generate unique request ID for tracing
  req.requestId = req.get('x-request-id') || uuidv4();
  req.startTime = Date.now();

  // Log request
  logger.info('Incoming request', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    userId: req.user?.id,
    userRole: req.user?.role,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
  });

  // Hook into response to log response details
  const originalSend = res.send.bind(res);

  res.send = function (data: any) {
    const duration = Date.now() - (req.startTime || Date.now());
    const statusCode = res.statusCode;

    // Log response
    logger.info('Outgoing response', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id,
      userRole: req.user?.role,
      responseSize: Buffer.byteLength(JSON.stringify(data)),
      timestamp: new Date().toISOString(),
    });

    return originalSend(data);
  };

  next();
}

/**
 * Error logging middleware
 * Logs errors with full context for debugging via log aggregation
 */
export function errorLogger(err: Error, req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const duration = Date.now() - (req.startTime || Date.now());

  logger.error('Request error', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
    userId: req.user?.id,
    userRole: req.user?.role,
    ip: req.ip || req.connection.remoteAddress,
    timestamp: new Date().toISOString(),
  });

  next(err);
}

/**
 * Database query logging middleware
 * Can be used to log slow queries or important database operations
 */
export function logDatabaseQuery(queryName: string, duration: number, error?: Error): void {
  if (duration > 1000) {
    // Log slow queries (>1 second)
    logger.warn('Slow database query', {
      queryName,
      duration: `${duration}ms`,
      error: error ? { message: error.message } : undefined,
    });
  } else if (process.env.LOG_LEVEL === 'debug') {
    // Log all queries in debug mode
    logger.debug('Database query', {
      queryName,
      duration: `${duration}ms`,
    });
  }
}

/**
 * API key usage logging - logs every API key authentication
 * Useful for tracking API usage and detecting abuse
 */
export function logApiKeyUsage(
  apiKeyId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  duration: number,
  requestId?: string
): void {
  logger.info('API key usage', {
    apiKeyId,
    endpoint,
    method,
    statusCode,
    duration: `${duration}ms`,
    requestId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Security event logging - logs security-relevant events
 * such as failed login attempts, unauthorized access attempts, etc.
 */
export function logSecurityEvent(
  eventType: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  details: Record<string, any>,
  userId?: string
): void {
  logger.warn('Security event', {
    eventType,
    severity,
    userId,
    ...details,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Audit logging - logs business-critical operations
 * such as data changes, permission changes, etc.
 */
export function logAuditEvent(
  eventType: string,
  resourceType: string,
  resourceId: string,
  changes: Record<string, { old: any; new: any }>,
  userId: string
): void {
  logger.info('Audit event', {
    eventType,
    resourceType,
    resourceId,
    changes,
    userId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Health check logging - minimal logging for health check endpoints
 * to avoid log spam
 */
export function shouldLogRequest(req: Request): boolean {
  // Skip logging for health checks and metrics endpoints
  const skipPaths = ['/health', '/metrics', '/status', '/ping'];
  return !skipPaths.some((path) => req.path.startsWith(path));
}

/**
 * Request ID middleware - ensures all requests have a unique ID
 * useful for tracing requests through log aggregation system
 */
export function requestIdMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  req.requestId = req.get('x-request-id') || uuidv4();
  res.setHeader('x-request-id', req.requestId);
  next();
}

export default {
  requestLogger,
  errorLogger,
  requestIdMiddleware,
  logDatabaseQuery,
  logApiKeyUsage,
  logSecurityEvent,
  logAuditEvent,
  shouldLogRequest,
};
