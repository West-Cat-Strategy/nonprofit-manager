import { NextFunction, Request, Response } from 'express';

export const v1DeprecationHeaders = (replacementPath: string) => (
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.setHeader('Deprecation', 'true');
  res.setHeader('Sunset', 'Tue, 30 Jun 2026 00:00:00 GMT');
  res.setHeader('Link', `<${replacementPath}>; rel="successor-version"`);
  next();
};
