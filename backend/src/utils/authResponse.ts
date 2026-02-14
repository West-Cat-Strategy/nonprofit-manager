export const shouldExposeAuthTokensInResponse = (): boolean =>
  process.env.EXPOSE_AUTH_TOKENS_IN_RESPONSE === 'true';

export const buildAuthTokenResponse = (
  token: string,
  refreshToken?: string
): { token?: string; refreshToken?: string } => {
  if (!shouldExposeAuthTokensInResponse()) {
    return {};
  }

  if (refreshToken) {
    return { token, refreshToken };
  }

  return { token };
};
