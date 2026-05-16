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

jest.mock('dotenv', () => ({
  __esModule: true,
  default: {
    config: jest.fn(() => ({ parsed: {} })),
  },
}));

describe('database config', () => {
  const originalEnv = {
    NODE_ENV: process.env.NODE_ENV,
    DB_AT_REST_ENCRYPTION_MODE: process.env.DB_AT_REST_ENCRYPTION_MODE,
    DB_SSL_ENABLED: process.env.DB_SSL_ENABLED,
    DB_SSL_REJECT_UNAUTHORIZED: process.env.DB_SSL_REJECT_UNAUTHORIZED,
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_NAME: process.env.DB_NAME,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_POOL_MAX_CONNECTIONS: process.env.DB_POOL_MAX_CONNECTIONS,
    DB_POOL_IDLE_TIMEOUT_MS: process.env.DB_POOL_IDLE_TIMEOUT_MS,
    DB_POOL_CONNECTION_TIMEOUT_MS: process.env.DB_POOL_CONNECTION_TIMEOUT_MS,
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
  const loadRequestContextModule = async () => import('@config/requestContext');
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

  it('defaults Jest test runtime connections to TEST_DATABASE_DEFAULTS when DB env is absent', async () => {
    delete process.env.NODE_ENV;
    delete process.env.DB_HOST;
    delete process.env.DB_PORT;
    delete process.env.DB_NAME;
    delete process.env.DB_USER;
    delete process.env.DB_PASSWORD;

    const { TEST_DATABASE_DEFAULTS } = await loadDatabaseModule();

    const mockedPoolCtor = getMockedPoolCtor();
    expect(mockedPoolCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        host: TEST_DATABASE_DEFAULTS.DB_HOST,
        port: Number.parseInt(TEST_DATABASE_DEFAULTS.DB_PORT, 10),
        database: TEST_DATABASE_DEFAULTS.DB_NAME,
        user: TEST_DATABASE_DEFAULTS.DB_USER,
        password: TEST_DATABASE_DEFAULTS.DB_PASSWORD,
        allowExitOnIdle: true,
      })
    );
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('applies explicit database pool env overrides', async () => {
    process.env.NODE_ENV = 'production';
    process.env.DB_POOL_MAX_CONNECTIONS = '4';
    process.env.DB_POOL_IDLE_TIMEOUT_MS = '5000';
    process.env.DB_POOL_CONNECTION_TIMEOUT_MS = '750';

    await loadDatabaseModule();

    const mockedPoolCtor = getMockedPoolCtor();
    expect(mockedPoolCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        max: 4,
        idleTimeoutMillis: 5000,
        connectionTimeoutMillis: 750,
      })
    );
  });

  it('binds full request context around pool queries when any request context exists', async () => {
    process.env.NODE_ENV = 'test';
    const client = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn(),
    };
    mockPool.connect.mockResolvedValue(client);

    const { default: pool } = await loadDatabaseModule();
    const { runWithRequestContext } = await loadRequestContextModule();

    await runWithRequestContext(
      {
        correlationId: 'corr-request-123',
        ipAddress: '203.0.113.10',
        userAgent: 'database-test/1.0',
      },
      () => pool.query('SELECT 1')
    );

    expect(client.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("set_config('app.current_user_id'"),
      ['', 'corr-request-123', '203.0.113.10', 'database-test/1.0', 'test']
    );
    expect(client.query).toHaveBeenNthCalledWith(2, 'SELECT 1');
    expect(client.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('RESET app.request_id')
    );
    expect(client.release).toHaveBeenCalledTimes(1);
    expect(mockPool.query).not.toHaveBeenCalled();
  });

  it('uses raw pool queries when no request context exists', async () => {
    const { default: pool } = await loadDatabaseModule();
    mockPool.query.mockResolvedValue({ rows: [{ value: 1 }] });

    await expect(pool.query('SELECT 1')).resolves.toEqual({ rows: [{ value: 1 }] });

    expect(mockPool.query).toHaveBeenCalledWith('SELECT 1');
    expect(mockPool.connect).not.toHaveBeenCalled();
  });

  it('binds request context locally inside request-scoped transactions', async () => {
    process.env.NODE_ENV = 'test';
    const client = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn(),
    };
    mockPool.connect.mockResolvedValue(client);

    const { withRequestContextTransaction } = await loadDatabaseModule();
    const { runWithRequestContext } = await loadRequestContextModule();

    await runWithRequestContext(
      {
        correlationId: 'corr-transaction-123',
        ipAddress: '198.51.100.15',
        userAgent: 'transaction-test/1.0',
        userId: '11111111-1111-4111-8111-111111111111',
      },
      () =>
        withRequestContextTransaction(async (transactionClient) => {
          await transactionClient.query('SELECT scoped');
        })
    );

    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("set_config('app.current_user_id'"),
      [
        '11111111-1111-4111-8111-111111111111',
        'corr-transaction-123',
        '198.51.100.15',
        'transaction-test/1.0',
        'test',
      ]
    );
    expect(client.query).toHaveBeenNthCalledWith(3, 'SELECT scoped');
    expect(client.query).toHaveBeenNthCalledWith(4, 'COMMIT');
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});
