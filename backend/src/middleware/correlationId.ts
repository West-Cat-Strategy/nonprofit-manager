/**
 * Correlation ID Middleware
 * Adds unique correlation IDs to requests for distributed tracing
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { logger } from '@config/logger';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

/**
 * Middleware that adds a correlation ID to each request
 * - Uses existing header if provided (for distributed tracing)
 * - Generates a new UUID if not provided
 * - Adds correlation ID to response headers
 * - Attaches to request object for logging
 */
export const correlationIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Use existing correlation ID from header or generate new one
  const correlationId =
    (req.headers[CORRELATION_ID_HEADER] as string) || randomUUID();

  // Attach to request for use in handlers and logging
  req.correlationId = correlationId;

  // Add to response headers for client-side tracing
  res.setHeader(CORRELATION_ID_HEADER, correlationId);

  // Add correlation ID to logger context for this request
  logger.defaultMeta = {
    ...logger.defaultMeta,
    correlationId,
  };

  next();
};

/**
 * Helper to get correlation ID from request
 */
export const getCorrelationId = (req: Request): string => {
  return req.correlationId || 'unknown';
};

export default correlationIdMiddleware;
