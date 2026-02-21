import { NextFunction, Request, Response } from 'express';
import { logger } from '@config/logger';

export const v1DeprecationHeaders = (replacementPath: string) => (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.setHeader('Deprecation', 'true');
  res.setHeader('Sunset', 'Tue, 30 Jun 2026 00:00:00 GMT');
  res.setHeader('Link', `<${replacementPath}>; rel="successor-version"`);
  logger.warn('Deprecated v1 API route accessed', {
    path: req.originalUrl,
    method: req.method,
    replacementPath,
  });
  next();
};
