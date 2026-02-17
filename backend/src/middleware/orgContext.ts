import { Response, NextFunction } from 'express';
import pool from '@config/database';
import { logger } from '@config/logger';
import { AuthRequest } from './auth';
import { badRequest, forbidden, notFoundMessage, serverError } from '@utils/responseHelpers';

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
const shouldValidateUserAccess = () => process.env.ORG_ACCESS_VALIDATE === 'true';

export const orgContextMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  if (req.method === 'OPTIONS') {
    return next();
  }

  const path = req.path || '';
  const fullPath = req.originalUrl || req.url || path;
  const normalizedPath = fullPath.split('?')[0];
  const skipPrefixes = ['/auth', '/payments/webhook', '/admin', '/invitations'];
  if (skipPrefixes.some((prefix) => path.startsWith(prefix) || normalizedPath.startsWith(prefix))) {
    return next();
  }

  if (req.method === 'POST' && (path === '/accounts' || normalizedPath.startsWith('/accounts'))) {
    return next();
  }

  const { id, source } = getOrgContext(req);

  if (!id) {
    if (shouldRequireContext()) {
      return badRequest(res, 'Organization context is required');
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
      return notFoundMessage(res, 'Organization context not found');
    }

    // Validate user access to the organization if enabled
    if (shouldValidateUserAccess() && req.user) {
      const userId = req.user.id;
      const userRole = req.user.role;

      // Admins always have access
      if (userRole !== 'admin') {
        // Check user_organization_access table for explicit access
        const accessResult = await pool.query(
          `SELECT id FROM user_organization_access
           WHERE user_id = $1 AND organization_id = $2 AND is_active = true`,
          [userId, id]
        );

        if (accessResult.rows.length === 0) {
          logger.warn('User lacks access to organization', { userId, orgId: id, source });
          return forbidden(res, 'You do not have access to this organization');
        }
      }
    }

    return next();
  } catch (error) {
    logger.error('Failed to validate organization context', { error, orgId: id, source });
    return serverError(res, 'Failed to validate organization context');
  }
};

export default orgContextMiddleware;