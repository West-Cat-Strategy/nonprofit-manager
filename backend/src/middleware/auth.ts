import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/jwt';
import { forbidden, unauthorized } from '../utils/responseHelpers';

interface JwtPayload {
  id: string;
  email: string;
  role: string;
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
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorized(res, 'No token provided');
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;

    req.user = decoded;
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

    if (!allowedRoles.includes(req.user.role)) {
      return forbidden(res, 'Forbidden: Insufficient permissions');
    }

    next();
  };
};