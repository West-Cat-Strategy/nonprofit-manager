import { Request, Response, NextFunction } from 'express';
import { logger } from '@config/logger';

interface ErrorWithStatus extends Error {
  statusCode?: number;
}

export const errorHandler = (
  err: ErrorWithStatus,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  const statusCode = err.statusCode || 500;
  const isClientError = statusCode >= 400 && statusCode < 500;
  const message = isClientError && err.message ? err.message : 'Internal Server Error';

  res.status(statusCode).json({
    error: {
      message,
      code: isClientError ? 'request_error' : 'server_error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};
