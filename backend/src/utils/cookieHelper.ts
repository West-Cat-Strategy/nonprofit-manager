import { Response } from 'express';

const isProduction = process.env.NODE_ENV === 'production';

// Cookie names
export const AUTH_COOKIE_NAME = 'auth_token';
export const REFRESH_COOKIE_NAME = 'refresh_token';
export const PORTAL_AUTH_COOKIE_NAME = 'portal_auth_token';

// Cookie options
const baseCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? ('strict' as const) : ('lax' as const),
  path: '/',
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
