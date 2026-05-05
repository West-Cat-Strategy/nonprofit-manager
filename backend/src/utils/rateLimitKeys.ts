import crypto from 'crypto';
import type { Request } from 'express';

const normalizePart = (value: unknown): string => {
  if (value === null || value === undefined) return '_';
  const trimmed = String(value).trim();
  if (!trimmed) return '_';
  return encodeURIComponent(trimmed);
};

const buildKey = (...parts: unknown[]): string => parts.map(normalizePart).join(':');

const getIp = (req: Request): string => {
  return req.ip || req.socket?.remoteAddress || 'unknown';
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

const getParamValue = (req: Request, key: string, fallback: string): string => {
  const value = req.params?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
};

const hashIdentifier = (value: string): string =>
  crypto.createHash('sha256').update(value).digest('hex').slice(0, 24);

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

  publicEventCheckIn(req: Request): string {
    const eventId = getParamValue(req, 'id', 'unknown-event');
    return buildScopedRateLimitKey(
      'public-event-checkin',
      `${eventId}:${getIp(req)}`,
      undefined
    );
  },

  publicWebsiteForm(req: Request): string {
    const siteKey = getParamValue(req, 'siteKey', 'unknown-site');
    const formKey = getParamValue(req, 'formKey', 'unknown-form');
    return buildScopedRateLimitKey(
      'public-website-form',
      `${siteKey}:${formKey}:${getIp(req)}`,
      undefined
    );
  },

  publicWebsiteAction(req: Request): string {
    const siteKey = getParamValue(req, 'siteKey', 'unknown-site');
    const actionSlug = getParamValue(req, 'actionSlug', 'unknown-action');
    return buildScopedRateLimitKey(
      'public-website-action',
      `${siteKey}:${actionSlug}:${getIp(req)}`,
      undefined
    );
  },

  publicNewsletterConfirmation(req: Request): string {
    const token = getParamValue(req, 'token', 'unknown-token');
    return buildScopedRateLimitKey(
      'public-newsletter-confirmation',
      `${hashIdentifier(token)}:${getIp(req)}`,
      undefined
    );
  },

  publicSiteAnalytics(req: Request): string {
    const siteId = getParamValue(req, 'siteId', 'unknown-site');
    return buildScopedRateLimitKey(
      'public-site-analytics',
      `${siteId}:${getIp(req)}`,
      undefined
    );
  },
};

export default rateLimitKeys;
