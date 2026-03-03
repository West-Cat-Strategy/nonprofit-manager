import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { logger } from '@config/logger';

type AliasUsageTelemetryOptions = {
  route: string;
  aliasFields: string[];
};

const readUserAgent = (req: Request): string => {
  const header = req.headers['user-agent'];
  if (Array.isArray(header)) {
    return header[0] || 'Unknown';
  }
  return header || 'Unknown';
};

export const aliasUsageTelemetry = ({
  route,
  aliasFields,
}: AliasUsageTelemetryOptions): RequestHandler => {
  const middleware: RequestHandler & { __aliasUsageTelemetry?: boolean } = (
    req: Request,
    _res: Response,
    next: NextFunction
  ) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const usedAliases = aliasFields.filter((field) => body[field] !== undefined);

    if (usedAliases.length > 0) {
      const request = req as Request & { correlationId?: string };
      logger.info('auth.alias_input_used', {
        event: 'auth.alias_input_used',
        route,
        aliasFields: usedAliases,
        correlationId: request.correlationId || 'unknown',
        userAgent: readUserAgent(req),
        timestamp: new Date().toISOString(),
      });
    }

    next();
  };

  middleware.__aliasUsageTelemetry = true;
  return middleware;
};
