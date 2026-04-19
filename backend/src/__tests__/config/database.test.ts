const mockPool = {
  query: jest.fn(),
  on: jest.fn(),
  connect: jest.fn(),
};

jest.mock('pg', () => ({
  Pool: jest.fn(() => mockPool),
}));

jest.mock('@config/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('database config', () => {
  const originalEnv = {
    NODE_ENV: process.env.NODE_ENV,
    DB_AT_REST_ENCRYPTION_MODE: process.env.DB_AT_REST_ENCRYPTION_MODE,
    DB_SSL_ENABLED: process.env.DB_SSL_ENABLED,
    DB_SSL_REJECT_UNAUTHORIZED: process.env.DB_SSL_REJECT_UNAUTHORIZED,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
  };
  const restoreEnv = (): void => {
    (Object.keys(originalEnv) as Array<keyof typeof originalEnv>).forEach((key) => {
      const value = originalEnv[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  };

  beforeEach(() => {
    restoreEnv();
    jest.clearAllMocks();
    jest.resetModules();
  });

  afterEach(() => {
    restoreEnv();
  });

  const loadDatabaseModule = async () => import('@config/database');
  const getMockedPoolCtor = (): jest.Mock => (jest.requireMock('pg') as { Pool: jest.Mock }).Pool;

  it('creates an ssl-enabled pool for managed production databases', async () => {
    process.env.NODE_ENV = 'production';
    process.env.DB_AT_REST_ENCRYPTION_MODE = 'managed';
    process.env.DB_SSL_ENABLED = 'true';
    process.env.DB_SSL_REJECT_UNAUTHORIZED = 'true';

    await loadDatabaseModule();

    const mockedPoolCtor = getMockedPoolCtor();
    expect(mockedPoolCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        ssl: {
          rejectUnauthorized: true,
        },
      })
    );
  });

  it('disables ssl for luks production databases', async () => {
    process.env.NODE_ENV = 'production';
    process.env.DB_AT_REST_ENCRYPTION_MODE = 'luks';
    process.env.DB_SSL_ENABLED = 'true';
    process.env.DB_SSL_REJECT_UNAUTHORIZED = 'true';

    await loadDatabaseModule();

    const mockedPoolCtor = getMockedPoolCtor();
    expect(mockedPoolCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        ssl: false,
      })
    );
  });

  it('disables ssl for self-hosted production databases', async () => {
    process.env.NODE_ENV = 'production';
    process.env.DB_AT_REST_ENCRYPTION_MODE = 'self_hosted';
    process.env.DB_SSL_ENABLED = 'true';
    process.env.DB_SSL_REJECT_UNAUTHORIZED = 'true';

    await loadDatabaseModule();

    const mockedPoolCtor = getMockedPoolCtor();
    expect(mockedPoolCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        ssl: false,
      })
    );
  });

  it('defaults non-production runtime connections to the local app role', async () => {
    delete process.env.NODE_ENV;
    delete process.env.DB_USER;
    delete process.env.DB_PASSWORD;

    await loadDatabaseModule();

    const mockedPoolCtor = getMockedPoolCtor();
    expect(mockedPoolCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        user: 'nonprofit_app_user',
        password: 'nonprofit_app_password',
      })
    );
  });
});
