import { NextFunction, Response } from 'express';
import type { AuthRequest, RequestedOrganizationSource } from './auth';

const ORG_HEADER_KEYS = ['x-organization-id', 'x-org-id', 'x-account-id', 'x-tenant-id'];
const ORG_QUERY_KEYS = ['organization_id', 'org_id', 'tenant_id'];

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

const applyRequestedOrganizationContext = (req: AuthRequest): void => {
  const { id, source } = getOrgContext(req);
  if (!id) {
    return;
  }

  req.requestedOrganizationId = id;
  req.requestedOrganizationSource = source;
};

export const captureRequestedOrganizationContext = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  if (req.method === 'OPTIONS') {
    next();
    return;
  }

  applyRequestedOrganizationContext(req);
  next();
};

export const orgContextMiddleware = captureRequestedOrganizationContext;
export default orgContextMiddleware;
