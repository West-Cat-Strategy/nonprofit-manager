import { buildAuthTokenResponse, shouldExposeAuthTokensInResponse } from '@utils/authResponse';

describe('authResponse token exposure defaults', () => {
  const originalEnv = {
    EXPOSE_AUTH_TOKENS_IN_RESPONSE: process.env.EXPOSE_AUTH_TOKENS_IN_RESPONSE,
  };

  const restoreEnv = (): void => {
    if (originalEnv.EXPOSE_AUTH_TOKENS_IN_RESPONSE === undefined) {
      delete process.env.EXPOSE_AUTH_TOKENS_IN_RESPONSE;
    } else {
      process.env.EXPOSE_AUTH_TOKENS_IN_RESPONSE = originalEnv.EXPOSE_AUTH_TOKENS_IN_RESPONSE;
    }
  };

  beforeEach(() => {
    restoreEnv();
    delete process.env.EXPOSE_AUTH_TOKENS_IN_RESPONSE;
  });

  afterEach(() => {
    restoreEnv();
  });

  it('hides auth tokens by default', () => {
    expect(shouldExposeAuthTokensInResponse()).toBe(false);
    expect(buildAuthTokenResponse('jwt-test-token')).toEqual({});
  });

  it('can expose auth tokens only when explicitly enabled', () => {
    process.env.EXPOSE_AUTH_TOKENS_IN_RESPONSE = 'true';

    expect(shouldExposeAuthTokensInResponse()).toBe(true);
    expect(buildAuthTokenResponse('jwt-test-token')).toEqual({ token: 'jwt-test-token' });
  });
});
