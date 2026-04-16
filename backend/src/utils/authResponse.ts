import type { Response } from 'express';
import { generateCsrfToken } from '@middleware/domains/security';
import type { AuthRequest } from '@middleware/auth';

export const shouldExposeAuthTokensInResponse = (): boolean =>
  process.env.EXPOSE_AUTH_TOKENS_IN_RESPONSE === 'true';

export const buildAuthTokenResponse = (token: string): { token?: string } => {
  if (!shouldExposeAuthTokensInResponse()) {
    return {};
  }

  return { token };
};

export const generateAuthSessionCsrfToken = (
  req: AuthRequest,
  res: Response,
  token: string
): string => {
  req.headers = {
    ...(req.headers || {}),
    authorization: `Bearer ${token}`,
  };

  return generateCsrfToken(req, res);
};
