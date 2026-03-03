import { Request, Response, NextFunction } from 'express';
import { sendError } from '@modules/shared/http/envelope';

const API_V2_PREFIX = '/v2/';

export const legacyApiTombstoneMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const normalizedPath = req.path.startsWith('/') ? req.path : `/${req.path}`;

  if (normalizedPath.startsWith(API_V2_PREFIX)) {
    next();
    return;
  }

  const legacyPath = req.originalUrl?.split('?')[0] || `/api${normalizedPath}`;
  const v2Path = `/api/v2${normalizedPath}`;

  sendError(
    res,
    'legacy_api_removed',
    'Legacy /api/* endpoints have been removed. Use /api/v2/* endpoints.',
    410,
    {
      legacyPath,
      migrationPath: v2Path,
    },
    (req as Request & { correlationId?: string }).correlationId
  );
};

export default legacyApiTombstoneMiddleware;
