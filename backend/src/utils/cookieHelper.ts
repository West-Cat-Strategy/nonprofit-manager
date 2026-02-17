import { Response, type CookieOptions } from 'express';
import { logger } from '@config/logger';

const isProduction = process.env.NODE_ENV === 'production';
const enforceHttps = process.env.ENFORCE_HTTPS_COOKIES === 'true' || isProduction;
const cookieDomain = process.env.COOKIE_DOMAIN?.trim() || undefined;

const resolveSameSite = (): CookieOptions['sameSite'] => {
  const raw = (process.env.COOKIE_SAME_SITE || '').trim().toLowerCase();

  if (raw === 'strict' || raw === 'lax' || raw === 'none') {
    return raw;
  }

  return enforceHttps ? 'strict' : 'lax';
};

const cookieSameSite = resolveSameSite();

// Cookie names
export const AUTH_COOKIE_NAME = 'auth_token';
export const REFRESH_COOKIE_NAME = 'refresh_token';
export const PORTAL_AUTH_COOKIE_NAME = 'portal_auth_token';

// Validate secure cookie configuration in production
if (isProduction && !enforceHttps) {
  logger.warn('HTTPS cookies are not enforced in production - this is a security risk');
}

if (cookieSameSite === 'none' && !enforceHttps) {
  logger.warn('COOKIE_SAME_SITE=none requires secure cookies in modern browsers; set ENFORCE_HTTPS_COOKIES=true');
}

// Cookie options
const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: enforceHttps,
  sameSite: cookieSameSite,
  path: '/',
  ...(cookieDomain ? { domain: cookieDomain } : {}),
};

/**
 * Set the auth token cookie
 */
export const setAuthCookie = (res: Response, token: string, maxAge?: number): void => {
  res.cookie(AUTH_COOKIE_NAME, token, {
    ...baseCookieOptions,
    maxAge: maxAge ?? 24 * 60 * 60 * 1000, // 24 hours default
  });
};

/**
 * Set the refresh token cookie
 */
export const setRefreshCookie = (res: Response, token: string, maxAge?: number): void => {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    ...baseCookieOptions,
    maxAge: maxAge ?? 7 * 24 * 60 * 60 * 1000, // 7 days default
  });
};

/**
 * Set the portal auth token cookie (for client portal)
 */
export const setPortalAuthCookie = (res: Response, token: string, maxAge?: number): void => {
  res.cookie(PORTAL_AUTH_COOKIE_NAME, token, {
    ...baseCookieOptions,
    maxAge: maxAge ?? 24 * 60 * 60 * 1000, // 24 hours default
  });
};

/**
 * Clear all auth cookies on logout
 */
export const clearAuthCookies = (res: Response): void => {
  const clearOptions = {
    ...baseCookieOptions,
    maxAge: 0,
  };

  res.cookie(AUTH_COOKIE_NAME, '', clearOptions);
  res.cookie(REFRESH_COOKIE_NAME, '', clearOptions);
  res.cookie(PORTAL_AUTH_COOKIE_NAME, '', clearOptions);
};

/**
 * Extract token from cookies or Authorization header (backward compatible)
 */
export const extractToken = (
  cookies: Record<string, string> | undefined,
  authHeader: string | undefined,
  cookieName: string = AUTH_COOKIE_NAME
): string | null => {
  // First check cookies (preferred)
  if (cookies && cookies[cookieName]) {
    return cookies[cookieName];
  }

  // Fall back to Authorization header for backward compatibility
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
};
