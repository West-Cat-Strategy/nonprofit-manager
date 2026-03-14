export const shouldExposeAuthTokensInResponse = (): boolean =>
  process.env.EXPOSE_AUTH_TOKENS_IN_RESPONSE === 'true';

export const buildAuthTokenResponse = (token: string): { token?: string } => {
  if (!shouldExposeAuthTokensInResponse()) {
    return {};
  }

  return { token };
};
