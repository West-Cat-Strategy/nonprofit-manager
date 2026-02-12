import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '@config/jwt';
import { unauthorized } from '@utils/responseHelpers';

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
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorized(res, 'No token provided');
    }

    const token = authHeader.substring(7);
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