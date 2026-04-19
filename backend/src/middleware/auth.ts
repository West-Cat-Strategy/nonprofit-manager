import { Request, Response, NextFunction } from 'express';
import pool from '@config/database';
import { logger } from '@config/logger';
import { forbidden, notFoundMessage, serverError, unauthorized } from '@utils/responseHelpers';
import { extractToken, AUTH_COOKIE_NAME } from '@utils/cookieHelper';
import {
  createRequestAuthorizationContext,
  resolveRolesForUser,
} from '@services/authorization';
import { guardWithRole } from '@services/authGuardService';
import { setRequestContext } from '@config/requestContext';
import { normalizeRoleSlug } from '@utils/roleSlug';
import { getAuthenticatedOrganizationId } from '@modules/auth/lib/authQueries';
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
const ORGANIZATION_RESOLUTION_FAILED = Symbol('organization-resolution-failed');

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
  req.requestedOrganizationId;

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

const extractAppSessionPayload = (req: AuthRequest, res: Response): JwtPayload | null => {
  const token = extractToken(req.cookies, req.headers.authorization, AUTH_COOKIE_NAME);

  if (!token) {
    unauthorized(res, 'No token provided');
    return null;
  }

  const decoded = verifyTokenWithOptionalIssuer<JwtPayload>(token, APP_SESSION_TOKEN_ISSUER);
  if (decoded.type && decoded.type !== 'app') {
    unauthorized(res, 'Invalid or expired token');
    return null;
  }

  return decoded;
};

const loadAuthenticatedSessionUser = async (
  decoded: JwtPayload,
  res: Response
): Promise<AuthSessionUserRow | null> => {
  const sessionResult = await pool.query<AuthSessionUserRow>(
    `SELECT id, email, role, is_active, COALESCE(auth_revision, 0) AS auth_revision
     FROM users
     WHERE id = $1`,
    [decoded.id]
  );
  const sessionUser = sessionResult.rows[0];

  if (!sessionUser || !sessionUser.is_active) {
    unauthorized(res, 'Invalid or expired token');
    return null;
  }

  if ((decoded.authRevision ?? 0) !== Number(sessionUser.auth_revision || 0)) {
    unauthorized(res, 'Invalid or expired token');
    return null;
  }

  return sessionUser;
};

const attachAuthenticatedUser = (
  req: AuthRequest,
  decoded: JwtPayload,
  sessionUser: AuthSessionUserRow
): string => {
  const normalizedRole = normalizeRoleSlug(sessionUser.role) ?? sessionUser.role;

  req.user = {
    ...decoded,
    email: sessionUser.email,
    role: normalizedRole,
  };

  return normalizedRole;
};

const resolveAuthenticatedOrganizationContext = async (
  req: AuthRequest,
  res: Response,
  sessionUser: AuthSessionUserRow,
  normalizedRole: string
): Promise<string | undefined | typeof ORGANIZATION_RESOLUTION_FAILED> => {
  const tokenOrganizationId = req.user?.organizationId || req.user?.organization_id;
  const requestedOrganizationId = getRequestedOrganizationId(req);
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
        validateAccess: usingExplicitOrganizationSwitch,
      });
      if (!isValid) {
        return ORGANIZATION_RESOLUTION_FAILED;
      }
    }

    return usingExplicitOrganizationSwitch ? requestedOrganizationId : tokenOrganizationId;
  }

  if (tokenOrganizationId && shouldValidateResolvedContext) {
    const isValid = await validateResolvedOrganization(req, res, {
      organizationId: tokenOrganizationId,
      userId: sessionUser.id,
      userRole: normalizedRole,
      source: 'token',
      validateAccess: false,
    });
    if (!isValid) {
      return ORGANIZATION_RESOLUTION_FAILED;
    }
  }

  if (tokenOrganizationId) {
    return tokenOrganizationId;
  }

  const fallbackOrganizationId = await getAuthenticatedOrganizationId(sessionUser.id);
  if (fallbackOrganizationId && shouldValidateResolvedContext) {
    const isValid = await validateResolvedOrganization(req, res, {
      organizationId: fallbackOrganizationId,
      userId: sessionUser.id,
      userRole: normalizedRole,
      source: 'token',
      validateAccess: false,
    });
    if (!isValid) {
      return ORGANIZATION_RESOLUTION_FAILED;
    }
  }

  return fallbackOrganizationId ?? undefined;
};

const hydrateAuthorizationContext = async (
  req: AuthRequest,
  sessionUser: AuthSessionUserRow,
  normalizedRole: string,
  organizationId?: string
): Promise<void> => {
  setOrganizationContext(req, organizationId, sessionUser.id);
  const resolvedRoles = await resolveRolesForUser(sessionUser.id, normalizedRole);
  req.authorizationContext = createRequestAuthorizationContext(
    sessionUser.id,
    normalizedRole,
    organizationId,
    resolvedRoles
  );
};

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  return (async () => {
    try {
      const decoded = extractAppSessionPayload(req, res);
      if (!decoded) {
        return;
      }

      const sessionUser = await loadAuthenticatedSessionUser(decoded, res);
      if (!sessionUser) {
        return;
      }

      const normalizedRole = attachAuthenticatedUser(req, decoded, sessionUser);
      const organizationId = await resolveAuthenticatedOrganizationContext(
        req,
        res,
        sessionUser,
        normalizedRole
      );
      if (organizationId === ORGANIZATION_RESOLUTION_FAILED) {
        return;
      }

      await hydrateAuthorizationContext(req, sessionUser, normalizedRole, organizationId);
      next();
    } catch {
      return unauthorized(res, 'Invalid or expired token');
    }
  })();
};

export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): Response | void => {
    if (!guardWithRole(req, res, ...allowedRoles)) {
      return;
    }

    next();
  };
};
