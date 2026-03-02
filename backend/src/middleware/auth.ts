import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '@config/jwt';
import { forbidden, unauthorized } from '@utils/responseHelpers';
import { extractToken, AUTH_COOKIE_NAME } from '@utils/cookieHelper';
import { createRequestAuthorizationContext, hasRoleAccess } from '@services/authorization';
import { setRequestContext } from '@config/requestContext';

interface JwtPayload {
  id: string;
  email: string;
  role: string;
  organizationId?: string;
  organization_id?: string;
}

export interface AuthRequest
  extends Request<Record<string, string>, any, any, Record<string, string | undefined>> {
  user?: JwtPayload;
  organizationId?: string;
  accountId?: string;
  tenantId?: string;
  dataScope?: {
    resource: string;
    scopeId?: string;
    filter?: Record<string, unknown>;
  };
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Response | void => {
  try {
    // Extract token from cookies first (preferred), then Authorization header (backward compatible)
    const token = extractToken(req.cookies, req.headers.authorization, AUTH_COOKIE_NAME);

    if (!token) {
      return unauthorized(res, 'No token provided');
    }

    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;

    const organizationId =
      req.organizationId ||
      req.accountId ||
      req.tenantId ||
      decoded.organizationId ||
      decoded.organization_id;

    req.user = decoded;
    if (organizationId) {
      req.organizationId = organizationId;
      req.accountId = organizationId;
      req.tenantId = organizationId;
    }

    setRequestContext({
      userId: decoded.id,
      organizationId,
      accountId: organizationId,
      tenantId: organizationId,
    });
    req.authorizationContext = createRequestAuthorizationContext(
      decoded.id,
      decoded.role,
      organizationId
    );
    next();
  } catch {
    return unauthorized(res, 'Invalid or expired token');
  }
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
