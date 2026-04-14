import jwt from 'jsonwebtoken';
import { JWT, TIME } from '@config/constants';
import { getJwtSecret } from '@config/jwt';

export const APP_SESSION_TOKEN_ISSUER = 'nonprofit-manager-app';
export const PORTAL_SESSION_TOKEN_ISSUER = 'nonprofit-manager-portal';
export const MFA_TOKEN_ISSUER = 'nonprofit-manager-mfa';

export interface AppSessionTokenPayload {
  id: string;
  email: string;
  role: string;
  organizationId?: string;
  organization_id?: string;
  type?: 'app' | 'portal' | 'mfa';
  authRevision?: number;
  iss?: string;
  method?: string;
}

export interface PortalSessionTokenPayload {
  id: string;
  email: string;
  contactId: string | null;
  type?: 'portal';
  iss?: string;
}

export interface MfaSessionTokenPayload {
  id: string;
  email: string;
  role: string;
  type?: 'mfa';
  method?: 'totp';
  authRevision?: number;
  iss?: string;
}

const decodeToken = (token: string): jwt.JwtPayload | string | null => {
  return jwt.decode(token, { json: true });
};

export const verifyTokenWithOptionalIssuer = <T>(token: string, issuer: string): T => {
  const decoded = decodeToken(token);
  if (decoded && typeof decoded === 'object' && typeof decoded.iss === 'string') {
    return jwt.verify(token, getJwtSecret(), { issuer }) as T;
  }

  return jwt.verify(token, getJwtSecret()) as T;
};

export const issueAppSessionToken = (input: {
  id: string;
  email: string;
  role: string;
  organizationId?: string | null;
  authRevision?: number;
}): string =>
  jwt.sign(
    {
      id: input.id,
      email: input.email,
      role: input.role,
      type: 'app' as const,
      authRevision: input.authRevision ?? 0,
      ...(input.organizationId ? { organizationId: input.organizationId } : {}),
    },
    getJwtSecret(),
    {
      expiresIn: JWT.ACCESS_TOKEN_EXPIRY,
      issuer: APP_SESSION_TOKEN_ISSUER,
    }
  );

export const issuePortalSessionToken = (input: {
  id: string;
  email: string;
  contactId: string | null;
}): string =>
  jwt.sign(
    {
      id: input.id,
      email: input.email,
      contactId: input.contactId,
      type: 'portal' as const,
    },
    getJwtSecret(),
    {
      expiresIn: JWT.ACCESS_TOKEN_EXPIRY,
      issuer: PORTAL_SESSION_TOKEN_ISSUER,
    }
  );

export const issueTotpMfaToken = (input: {
  id: string;
  email: string;
  role: string;
  authRevision?: number;
}): string =>
  jwt.sign(
    {
      id: input.id,
      email: input.email,
      role: input.role,
      type: 'mfa' as const,
      method: 'totp' as const,
      authRevision: input.authRevision ?? 0,
    },
    getJwtSecret(),
    {
      expiresIn: Math.floor(TIME.FIVE_MINUTES / 1000),
      issuer: MFA_TOKEN_ISSUER,
    }
  );
