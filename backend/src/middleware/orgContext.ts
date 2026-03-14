import { Response, NextFunction } from 'express';
import type { AuthRequest, RequestedOrganizationSource } from './auth';

const ORG_HEADER_KEYS = ['x-organization-id', 'x-org-id', 'x-account-id', 'x-tenant-id'];
const ORG_QUERY_KEYS = ['organization_id', 'org_id', 'account_id', 'tenant_id'];
const stripVersionPrefix = (value: string): string =>
  value.replace(/^\/api\/v\d+\b/i, '').replace(/^\/v\d+\b/i, '') || '/';

const matchesPathPrefix = (value: string, prefix: string): boolean =>
  value === prefix || value.startsWith(`${prefix}/`);

const normalizeId = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const extractFromHeaders = (req: AuthRequest): string | undefined => {
  for (const key of ORG_HEADER_KEYS) {
    const value = req.headers[key] as string | undefined;
    const normalized = normalizeId(value);
    if (normalized) return normalized;
  }
  return undefined;
};

const extractFromQuery = (req: AuthRequest): string | undefined => {
  for (const key of ORG_QUERY_KEYS) {
    const value = req.query[key] as string | undefined;
    const normalized = normalizeId(value);
    if (normalized) return normalized;
  }
  return undefined;
};

const extractFromParams = (req: AuthRequest): string | undefined => {
  const value = normalizeId(req.params.accountId || req.params.account_id || req.params.orgId);
  return value;
};

const getOrgContext = (
  req: AuthRequest
): { id?: string; source?: RequestedOrganizationSource } => {
  const headerValue = extractFromHeaders(req);
  if (headerValue) return { id: headerValue, source: 'header' };

  const queryValue = extractFromQuery(req);
  if (queryValue) return { id: queryValue, source: 'query' };

  const paramValue = extractFromParams(req);
  if (paramValue) return { id: paramValue, source: 'param' };

  return {};
};

const AUTH_CONTEXT_AWARE_PREFIXES = ['/auth/bootstrap', '/auth/me', '/auth/check-access'];

export const orgContextMiddleware = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void | Response> => {
  if (req.method === 'OPTIONS') {
    return next();
  }

  const path = req.path || '';
  const fullPath = req.originalUrl || req.url || path;
  const normalizedPath = fullPath.split('?')[0];
  const versionlessPath = stripVersionPrefix(path);
  const versionlessNormalizedPath = stripVersionPrefix(normalizedPath);
  const skipPrefixes = ['/auth', '/payments/webhook', '/admin', '/invitations'];
  const shouldPreserveAuthContext =
    AUTH_CONTEXT_AWARE_PREFIXES.some(
      (prefix) =>
        matchesPathPrefix(path, prefix) ||
        matchesPathPrefix(normalizedPath, prefix) ||
        matchesPathPrefix(versionlessPath, prefix) ||
        matchesPathPrefix(versionlessNormalizedPath, prefix)
    );
  if (
    !shouldPreserveAuthContext &&
    skipPrefixes.some(
      (prefix) =>
        matchesPathPrefix(path, prefix) ||
        matchesPathPrefix(normalizedPath, prefix) ||
        matchesPathPrefix(versionlessPath, prefix) ||
        matchesPathPrefix(versionlessNormalizedPath, prefix)
    )
  ) {
    return next();
  }

  if (
    req.method === 'POST' &&
    (matchesPathPrefix(path, '/accounts') ||
      matchesPathPrefix(normalizedPath, '/accounts') ||
      matchesPathPrefix(versionlessPath, '/accounts') ||
      matchesPathPrefix(versionlessNormalizedPath, '/accounts'))
  ) {
    return next();
  }

  const { id, source } = getOrgContext(req);

  if (!id) {
    return next();
  }

  req.requestedOrganizationId = id;
  req.requestedOrganizationSource = source;
  return next();
};

export default orgContextMiddleware;
