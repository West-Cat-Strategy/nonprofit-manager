import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '@config/jwt';
import { unauthorized } from '@utils/responseHelpers';
import { extractToken, PORTAL_AUTH_COOKIE_NAME } from '@utils/cookieHelper';

interface PortalJwtPayload {
  id: string;
  email: string;
  contactId: string | null;
  type: 'portal';
}

export interface PortalAuthRequest
  extends Request<Record<string, string>, any, any, Record<string, string | undefined>> {
  portalUser?: PortalJwtPayload;
}

export const authenticatePortal = (
  req: PortalAuthRequest,
  res: Response,
  next: NextFunction
): Response | void => {
  try {
    // Prefer portal auth cookie, with Authorization header as fallback.
    const token = extractToken(req.cookies, req.headers.authorization, PORTAL_AUTH_COOKIE_NAME);
    if (!token) {
      return unauthorized(res, 'No token provided');
    }
    const decoded = jwt.verify(token, getJwtSecret()) as PortalJwtPayload;

    if (decoded.type !== 'portal') {
      return unauthorized(res, 'Invalid token type');
    }

    req.portalUser = decoded;
    next();
  } catch {
    return unauthorized(res, 'Invalid or expired token');
  }
};
