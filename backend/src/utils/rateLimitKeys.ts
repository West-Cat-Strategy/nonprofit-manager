import type { Request } from 'express';

const normalizePart = (value: unknown): string => {
  if (value === null || value === undefined) return '_';
  const trimmed = String(value).trim();
  if (!trimmed) return '_';
  return encodeURIComponent(trimmed);
};

const buildKey = (...parts: unknown[]): string => parts.map(normalizePart).join(':');

const getIp = (req: Request): string => {
  return req.ip || req.connection.remoteAddress || 'unknown';
};

const getUserId = (req: Request): string | undefined => {
  const user = (req as Request & { user?: { id?: string } }).user;
  return user?.id;
};

const getBodyValue = (req: Request, key: string): string | undefined => {
  const body = req.body as Record<string, unknown> | undefined;
  const value = body?.[key];
  return typeof value === 'string' ? value : undefined;
};

export const rateLimitKeys = {
  api(req: Request): string {
    return buildKey('rate-limit', 'api', getUserId(req) || getIp(req));
  },

  auth(req: Request): string {
    const email = getBodyValue(req, 'email');
    return buildKey('rate-limit', 'auth', email || '_', getIp(req));
  },

  passwordReset(req: Request): string {
    const email = getBodyValue(req, 'email');
    return buildKey('rate-limit', 'password-reset', email || getIp(req));
  },

  registration(req: Request): string {
    return buildKey('rate-limit', 'registration', getIp(req));
  },
};

export default rateLimitKeys;
