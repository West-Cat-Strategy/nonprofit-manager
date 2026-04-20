import { Request, Response, NextFunction } from 'express';
import { unauthorized } from '@utils/responseHelpers';
import { extractToken, PORTAL_AUTH_COOKIE_NAME } from '@utils/cookieHelper';
import * as portalAuthService from '@services/portalAuthService';
import { setRequestContext } from '@config/requestContext';
import {
  PORTAL_SESSION_TOKEN_ISSUER,
  verifyTokenWithOptionalIssuer,
  type PortalSessionTokenPayload,
} from '@utils/sessionTokens';

interface PortalJwtPayload extends PortalSessionTokenPayload {
  id: string;
  email: string;
  contactId: string | null;
  type: 'portal';
}

export interface PortalAuthRequest
  extends Request<Record<string, string>, any, any, Record<string, string | undefined>> {
  portalUser?: PortalJwtPayload;
}

export const authenticatePortal = async (
  req: PortalAuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    // Prefer portal auth cookie, with Authorization header as fallback.
    const token = extractToken(req.cookies, req.headers.authorization, PORTAL_AUTH_COOKIE_NAME);
    if (!token) {
      return unauthorized(res, 'No token provided');
    }
    const decoded = verifyTokenWithOptionalIssuer<PortalJwtPayload>(
      token,
      PORTAL_SESSION_TOKEN_ISSUER
    );

    if (decoded.type !== 'portal') {
      return unauthorized(res, 'Invalid token type');
    }

    const profile = await portalAuthService.getPortalUserProfileById(decoded.id);
    if (!profile || profile.status !== 'active' || !profile.is_verified) {
      return unauthorized(res, 'Invalid or expired token');
    }

    req.portalUser = {
      ...decoded,
      id: profile.id,
      email: profile.email,
      contactId: profile.contact_id,
    };
    setRequestContext({
      portalUserId: profile.id,
      portalContactId: profile.contact_id,
    });
    next();
  } catch {
    return unauthorized(res, 'Invalid or expired token');
  }
};
