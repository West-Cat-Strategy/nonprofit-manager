import { Request, Response, NextFunction } from 'express';
import pool from '@config/database';
import { logger } from '@config/logger';
import { forbidden, notFoundMessage, serverError, unauthorized } from '@utils/responseHelpers';
import { extractToken, AUTH_COOKIE_NAME } from '@utils/cookieHelper';
import {
  createRequestAuthorizationContext,
  hasRoleAccess,
  resolveRolesForUser,
} from '@services/authorization';
import { setRequestContext } from '@config/requestContext';
import { normalizeRoleSlug } from '@utils/roleSlug';
import {
  APP_SESSION_TOKEN_ISSUER,
  verifyTokenWithOptionalIssuer,
  type AppSessionTokenPayload,
} from '@utils/sessionTokens';

interface JwtPayload extends AppSessionTokenPayload {
  id: string;
  email: string;
  role: string;
  organizationId?: string;
  organization_id?: string;
  type?: 'app' | 'portal' | 'mfa';
  authRevision?: number;
}

export type RequestedOrganizationSource = 'header' | 'query' | 'param';

type ResolvedOrganizationSource = RequestedOrganizationSource | 'token';

interface AccountContextRow {
  id: string;
  is_active: boolean;
}

interface AuthSessionUserRow {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  auth_revision: number;
}

export interface AuthRequest
  extends Request<Record<string, string>, any, any, Record<string, string | undefined>> {
  user?: JwtPayload;
  organizationId?: string;
  accountId?: string;
  tenantId?: string;
  requestedOrganizationId?: string;
  requestedOrganizationSource?: RequestedOrganizationSource;
  organizationContextValidated?: {
    organizationId: string;
    isActive: boolean;
    accessValidated: boolean;
  };
  dataScope?: {
    resource: string;
    scopeId?: string;
    filter?: Record<string, unknown>;
  };
}

const shouldValidateOrganizationContext = () => process.env.ORG_CONTEXT_VALIDATE !== 'false';

const clearOrganizationContext = (req: AuthRequest, userId?: string): void => {
  delete req.organizationId;
  delete req.accountId;
  delete req.tenantId;
  delete req.organizationContextValidated;
  setRequestContext({
    userId,
  });
};

const setOrganizationContext = (
  req: AuthRequest,
  organizationId: string | undefined,
  userId: string
): void => {
  if (!organizationId) {
    clearOrganizationContext(req, userId);
    return;
  }

  req.organizationId = organizationId;
  req.accountId = organizationId;
  req.tenantId = organizationId;
  setRequestContext({
    userId,
    organizationId,
    accountId: organizationId,
    tenantId: organizationId,
  });
};

const getRequestedOrganizationId = (req: AuthRequest): string | undefined =>
  req.requestedOrganizationId || req.organizationId || req.accountId || req.tenantId;

const validateResolvedOrganization = async (
  req: AuthRequest,
  res: Response,
  input: {
    organizationId: string;
    userId: string;
    userRole: string;
    source: ResolvedOrganizationSource;
    validateAccess?: boolean;
  }
): Promise<boolean> => {
  try {
    const accountResult = await pool.query<AccountContextRow>(
      `SELECT id, COALESCE(is_active, true) AS is_active
       FROM accounts
       WHERE id = $1`,
      [input.organizationId]
    );

    if (accountResult.rows.length === 0) {
      logger.warn('Organization context not found', {
        orgId: input.organizationId,
        userId: input.userId,
        source: input.source,
      });
      notFoundMessage(res, 'Organization context not found');
      return false;
    }

    if (!accountResult.rows[0].is_active) {
      logger.warn('Organization context inactive', {
        orgId: input.organizationId,
        userId: input.userId,
        source: input.source,
      });
      forbidden(res, 'Organization is inactive');
      return false;
    }

    const shouldValidateAccess = input.validateAccess === true;
    if (shouldValidateAccess && input.userRole !== 'admin') {
      const accessResult = await pool.query(
        `SELECT id
         FROM user_account_access
         WHERE user_id = $1
           AND account_id = $2
           AND is_active = true
         LIMIT 1`,
        [input.userId, input.organizationId]
      );

      if (accessResult.rows.length === 0) {
        logger.warn('User lacks access to requested organization context', {
          orgId: input.organizationId,
          userId: input.userId,
          source: input.source,
        });
        forbidden(res, 'You do not have access to this organization');
        return false;
      }
    }

    req.organizationContextValidated = {
      organizationId: input.organizationId,
      isActive: true,
      accessValidated: input.userRole === 'admin' || shouldValidateAccess,
    };

    return true;
  } catch (error) {
    logger.error('Failed to validate resolved organization context', {
      error,
      orgId: input.organizationId,
      userId: input.userId,
      source: input.source,
    });
    serverError(res, 'Failed to validate organization context');
    return false;
  }
};

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  return (async () => {
    try {
      // Extract token from cookies first (preferred), then Authorization header (backward compatible)
      const token = extractToken(req.cookies, req.headers.authorization, AUTH_COOKIE_NAME);

      if (!token) {
        return unauthorized(res, 'No token provided');
      }

      const decoded = verifyTokenWithOptionalIssuer<JwtPayload>(token, APP_SESSION_TOKEN_ISSUER);
      if (decoded.type && decoded.type !== 'app') {
        return unauthorized(res, 'Invalid or expired token');
      }

      const sessionResult = await pool.query<AuthSessionUserRow>(
        `SELECT id, email, role, is_active, COALESCE(auth_revision, 0) AS auth_revision
         FROM users
         WHERE id = $1`,
        [decoded.id]
      );
      const sessionUser = sessionResult.rows[0];
      if (!sessionUser || !sessionUser.is_active) {
        return unauthorized(res, 'Invalid or expired token');
      }

      if ((decoded.authRevision ?? 0) !== Number(sessionUser.auth_revision || 0)) {
        return unauthorized(res, 'Invalid or expired token');
      }

      const normalizedRole = normalizeRoleSlug(sessionUser.role) ?? sessionUser.role;
      const tokenOrganizationId = decoded.organizationId || decoded.organization_id;
      const requestedOrganizationId = getRequestedOrganizationId(req);

      req.user = {
        ...decoded,
        email: sessionUser.email,
        role: normalizedRole,
      };

      let organizationId = tokenOrganizationId;
      const shouldValidateResolvedContext = shouldValidateOrganizationContext();

      if (requestedOrganizationId) {
        const usingExplicitOrganizationSwitch =
          !tokenOrganizationId || requestedOrganizationId !== tokenOrganizationId;

        if (usingExplicitOrganizationSwitch || shouldValidateResolvedContext) {
          const isValid = await validateResolvedOrganization(req, res, {
            organizationId: requestedOrganizationId,
            userId: sessionUser.id,
            userRole: normalizedRole,
            source: usingExplicitOrganizationSwitch
              ? req.requestedOrganizationSource || 'header'
              : 'token',
            validateAccess: usingExplicitOrganizationSwitch || shouldValidateResolvedContext,
          });
          if (!isValid) {
            return;
          }
        }

        organizationId = usingExplicitOrganizationSwitch
          ? requestedOrganizationId
          : tokenOrganizationId;
      } else if (tokenOrganizationId && shouldValidateResolvedContext) {
        const isValid = await validateResolvedOrganization(req, res, {
          organizationId: tokenOrganizationId,
          userId: sessionUser.id,
          userRole: normalizedRole,
          source: 'token',
          validateAccess: true,
        });
        if (!isValid) {
          return;
        }
      }

      setOrganizationContext(req, organizationId, sessionUser.id);
      const resolvedRoles = await resolveRolesForUser(sessionUser.id, normalizedRole);
      req.authorizationContext = createRequestAuthorizationContext(
        sessionUser.id,
        normalizedRole,
        organizationId,
        resolvedRoles
      );
      next();
    } catch {
      return unauthorized(res, 'Invalid or expired token');
    }
  })();
};

export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): Response | void => {
    if (!req.user) {
      return unauthorized(res, 'Unauthorized');
    }

    if (!hasRoleAccess(req.user.role, allowedRoles, req.authorizationContext?.roles)) {
      return forbidden(res, 'Forbidden: Insufficient permissions');
    }

    next();
  };
};
