/**
 * Correlation ID Middleware
 * Adds unique correlation IDs to requests for distributed tracing
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { runWithRequestContext } from '@config/requestContext';

export const CORRELATION_ID_HEADER = 'x-correlation-id';
const VALID_CORRELATION_ID = /^[A-Za-z0-9._:-]{8,128}$/;

const readHeaderValue = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

export const isValidCorrelationId = (value: string | undefined): boolean => {
  if (!value) return false;
  return VALID_CORRELATION_ID.test(value);
};

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
  const inboundCorrelationId = readHeaderValue(req.headers[CORRELATION_ID_HEADER]);
  const correlationId = isValidCorrelationId(inboundCorrelationId)
    ? inboundCorrelationId!
    : randomUUID();

  // Attach to request for use in handlers and logging
  req.correlationId = correlationId;
  req.headers[CORRELATION_ID_HEADER] = correlationId;
  res.locals.correlationId = correlationId;

  // Add to response headers for client-side tracing
  res.setHeader(CORRELATION_ID_HEADER, correlationId);

  runWithRequestContext({ correlationId }, () => next());
};

/**
 * Helper to get correlation ID from request
 */
export const getCorrelationId = (req: Request): string => {
  return req.correlationId || 'unknown';
};

export default correlationIdMiddleware;
