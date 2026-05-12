const loadSentryConfig = async () => {
  jest.resetModules();
  const logger = {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  };
  const sentry = {
    init: jest.fn(),
    captureException: jest.fn(),
    captureMessage: jest.fn(),
    httpIntegration: jest.fn(() => ({ name: 'http' })),
    nodeContextIntegration: jest.fn(() => ({ name: 'nodeContext' })),
    setUser: jest.fn(),
    setupExpressErrorHandler: jest.fn(),
    startSpan: jest.fn((_options, callback) => callback({})),
  };

  jest.doMock('@config/logger', () => ({ logger }));
  jest.doMock('@sentry/node', () => sentry);

  const config = await import('@config/sentry');
  return { config, logger, sentry };
};

describe('Sentry-compatible error tracking config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('does not initialize without a DSN', async () => {
    delete process.env.SENTRY_DSN;
    const { config, logger, sentry } = await loadSentryConfig();

    config.initializeSentry();

    expect(sentry.init).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      'Sentry-compatible error tracking is not configured (SENTRY_DSN not set)'
    );
  });

  it('initializes a Sentry-compatible DSN without logging the DSN', async () => {
    process.env.SENTRY_DSN = 'https://key@glitchtip.example.org/1';
    process.env.NODE_ENV = 'production';
    const { config, logger, sentry } = await loadSentryConfig();

    config.initializeSentry();

    expect(sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://key@glitchtip.example.org/1',
        tracesSampleRate: 0.1,
      })
    );
    expect(logger.info).toHaveBeenCalledWith(
      'Sentry-compatible error tracking initialized',
      expect.objectContaining({ hasDsn: true, environment: 'production' })
    );
    expect(logger.info.mock.calls[0][1]).not.toHaveProperty('dsn');
  });

  it('scrubs PII before provider ingestion', async () => {
    process.env.SENTRY_DSN = 'https://key@glitchtip.example.org/1';
    const { config, sentry } = await loadSentryConfig();

    config.initializeSentry();
    const initOptions = sentry.init.mock.calls[0][0];
    const event = initOptions.beforeSend({
      request: {
        data: {
          email: 'person@example.org',
          nested: { apiKey: 'secret-value' },
        },
      },
      extra: {
        token: 'raw-token',
      },
    });

    expect(event.request.data.email).toBe('[REDACTED]');
    expect(event.request.data.nested.apiKey).toBe('[REDACTED]');
    expect(event.extra.token).toBe('[REDACTED]');
  });

  it('sets user context with user id only', async () => {
    process.env.SENTRY_DSN = 'https://key@glitchtip.example.org/1';
    const { config, sentry } = await loadSentryConfig();

    config.initializeSentry();
    config.setUserContext('user-1', 'person@example.org');

    expect(sentry.setUser).toHaveBeenCalledWith({ id: 'user-1' });
  });
});
