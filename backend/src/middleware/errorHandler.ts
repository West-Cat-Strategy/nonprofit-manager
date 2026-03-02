import { Request, Response, NextFunction } from 'express';
import { logger } from '@config/logger';
import { sendError } from '@modules/shared/http/envelope';

interface ErrorWithStatus extends Error {
  statusCode?: number;
  code?: string;
  details?: Record<string, unknown>;
}

export const errorHandler = (
  err: ErrorWithStatus,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (res.headersSent) {
    return;
  }

  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    correlationId: req.correlationId,
  });

  const statusCode = err.statusCode || 500;
  const isClientError = statusCode >= 400 && statusCode < 500;

  const defaultCode = isClientError ? 'request_error' : 'server_error';
  const message = isClientError && err.message ? err.message : 'Internal Server Error';

  let details = err.details;

  if (process.env.NODE_ENV === 'development') {
    details = {
      ...(err.details || {}),
      ...(err.stack ? { stack: err.stack } : {}),
    };
  }

  sendError(
    res,
    err.code || defaultCode,
    message,
    statusCode,
    details,
    req.correlationId
  );
};
