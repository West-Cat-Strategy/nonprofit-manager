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

const getOrganizationId = (req: Request): string | undefined => {
  const withOrg = req as Request & {
    organizationId?: string;
    accountId?: string;
    tenantId?: string;
  };

  const scopedId =
    withOrg.organizationId ||
    withOrg.accountId ||
    withOrg.tenantId ||
    (typeof req.headers['x-organization-id'] === 'string'
      ? req.headers['x-organization-id']
      : undefined) ||
    (typeof req.headers['x-account-id'] === 'string' ? req.headers['x-account-id'] : undefined) ||
    (typeof req.headers['x-tenant-id'] === 'string' ? req.headers['x-tenant-id'] : undefined);

  return scopedId || undefined;
};

const getBodyValue = (req: Request, key: string): string | undefined => {
  const body = req.body as Record<string, unknown> | undefined;
  const value = body?.[key];
  return typeof value === 'string' ? value : undefined;
};

const buildScopedRateLimitKey = (
  scope: string,
  identifier: string,
  organizationId?: string
): string => {
  if (organizationId) {
    return buildKey('rate-limit', 'org', organizationId, scope, identifier);
  }
  return buildKey('rate-limit', 'global', scope, identifier);
};

export const rateLimitKeys = {
  api(req: Request): string {
    return buildScopedRateLimitKey(
      'api',
      getUserId(req) || getIp(req),
      getOrganizationId(req)
    );
  },

  auth(req: Request): string {
    const email = getBodyValue(req, 'email');
    const identifier = `${email || '_'}:${getIp(req)}`;
    return buildScopedRateLimitKey('auth', identifier, getOrganizationId(req));
  },

  passwordReset(req: Request): string {
    const email = getBodyValue(req, 'email');
    return buildScopedRateLimitKey(
      'password-reset',
      email || getIp(req),
      getOrganizationId(req)
    );
  },

  registration(req: Request): string {
    return buildScopedRateLimitKey('registration', getIp(req), getOrganizationId(req));
  },
};

export default rateLimitKeys;
