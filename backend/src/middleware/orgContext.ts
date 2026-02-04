import { Response, NextFunction } from 'express';
import pool from '../config/database';
import { logger } from '../config/logger';
import { AuthRequest } from './auth';

type OrgContextSource = 'header' | 'query' | 'param';

const ORG_HEADER_KEYS = ['x-organization-id', 'x-org-id', 'x-account-id', 'x-tenant-id'];
const ORG_QUERY_KEYS = ['organization_id', 'org_id', 'account_id', 'tenant_id'];

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

const getOrgContext = (req: AuthRequest): { id?: string; source?: OrgContextSource } => {
  const headerValue = extractFromHeaders(req);
  if (headerValue) return { id: headerValue, source: 'header' };

  const queryValue = extractFromQuery(req);
  if (queryValue) return { id: queryValue, source: 'query' };

  const paramValue = extractFromParams(req);
  if (paramValue) return { id: paramValue, source: 'param' };

  return {};
};

const shouldValidateContext = () => process.env.ORG_CONTEXT_VALIDATE === 'true';
const shouldRequireContext = () => process.env.ORG_CONTEXT_REQUIRE === 'true';

export const orgContextMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  const { id, source } = getOrgContext(req);

  if (!id) {
    if (shouldRequireContext()) {
      return res.status(400).json({ error: 'Organization context is required' });
    }
    return next();
  }

  req.organizationId = id;
  req.accountId = id;
  req.tenantId = id;

  if (!shouldValidateContext()) {
    return next();
  }

  try {
    const result = await pool.query('SELECT id FROM accounts WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      logger.warn('Organization context not found', { orgId: id, source });
      return res.status(404).json({ error: 'Organization context not found' });
    }
    return next();
  } catch (error) {
    logger.error('Failed to validate organization context', { error, orgId: id, source });
    return res.status(500).json({ error: 'Failed to validate organization context' });
  }
};

export default orgContextMiddleware;
