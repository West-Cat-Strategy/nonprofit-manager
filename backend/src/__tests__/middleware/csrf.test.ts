import type { NextFunction, Request, Response } from 'express';

type MockedCsrfConfig = {
  getSecret: () => string;
  getSessionIdentifier: (req: Request) => string;
};

const mockGenerateCsrfToken = jest.fn((req: Request) => {
  const config = mockState.config;
  if (!config) {
    throw new Error('csrf config was not initialized');
  }

  return `csrf:${config.getSessionIdentifier(req)}`;
});

const mockDoubleCsrfProtection = jest.fn((req: Request, _res: Response, next: NextFunction) => {
  const config = mockState.config;
  if (!config) {
    next(new Error('csrf config was not initialized'));
    return;
  }

  const expectedToken = `csrf:${config.getSessionIdentifier(req)}`;
  const actualToken = req.headers['x-csrf-token'];

  if (typeof actualToken === 'string' && actualToken === expectedToken) {
    next();
    return;
  }

  const error = new Error('invalid csrf token') as Error & { statusCode?: number };
  error.statusCode = 403;
  next(error);
});

const mockState: {
  config: MockedCsrfConfig | null;
} = {
  config: null,
};

jest.mock('csrf-csrf', () => ({
  doubleCsrf: (config: MockedCsrfConfig) => {
    mockState.config = config;
    return {
      generateCsrfToken: mockGenerateCsrfToken,
      doubleCsrfProtection: mockDoubleCsrfProtection,
    };
  },
}));

const loadCsrfModule = async (): Promise<typeof import('../../middleware/csrf')> =>
  import('../../middleware/csrf');

const createRequest = (overrides: Partial<Request> = {}): Request =>
  ({
    method: 'POST',
    path: '/api/v2/sites',
    originalUrl: '/api/v2/sites',
    cookies: {},
    ip: '203.0.113.10',
    socket: {
      remoteAddress: '203.0.113.10',
    },
    ...overrides,
    headers: {
      'user-agent': 'Mozilla/5.0',
      ...(overrides.headers || {}),
    },
  }) as Request;

const createResponse = (): Response =>
  ({
    json: jest.fn(),
    status: jest.fn(),
    setHeader: jest.fn(),
  }) as unknown as Response;

describe('csrf middleware', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    mockState.config = null;
    mockGenerateCsrfToken.mockClear();
    mockDoubleCsrfProtection.mockClear();
    jest.resetModules();
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('binds CSRF tokens to authenticated staff and portal sessions, then falls back for anonymous requests', async () => {
    const { resolveCsrfSessionIdentifier } = await loadCsrfModule();

    expect(
      resolveCsrfSessionIdentifier(
        createRequest({
          cookies: { auth_token: 'staff-token-123' },
        })
      )
    ).toBe('auth:staff-token-123');

    expect(
      resolveCsrfSessionIdentifier(
        createRequest({
          headers: {
            authorization: 'Bearer bearer-token-456',
            'user-agent': 'Mozilla/5.0',
          },
        })
      )
    ).toBe('auth:bearer-token-456');

    expect(
      resolveCsrfSessionIdentifier(
        createRequest({
          cookies: { portal_auth_token: 'portal-token-789' },
        })
      )
    ).toBe('portal:portal-token-789');

    expect(
      resolveCsrfSessionIdentifier(
        createRequest({
          cookies: {},
          headers: { 'user-agent': 'Mozilla/5.0' },
        })
      )
    ).toBe('anon:203.0.113.10-Mozilla/5.0');
  });

  it('accepts a create-then-publish flow when the same authenticated session fetches the CSRF token', async () => {
    const { getCsrfToken, csrfMiddleware } = await loadCsrfModule();

    const sessionReq = createRequest({
      cookies: { auth_token: 'staff-token-123' },
    });
    const sessionRes = createResponse();

    getCsrfToken(sessionReq, sessionRes);

    expect(sessionRes.json).toHaveBeenCalledWith({
      csrfToken: 'csrf:auth:staff-token-123',
    });

    const createReq = createRequest({
      cookies: { auth_token: 'staff-token-123' },
      headers: {
        'user-agent': 'Mozilla/5.0',
        'x-csrf-token': 'csrf:auth:staff-token-123',
      },
    });
    const publishReq = createRequest({
      cookies: { auth_token: 'staff-token-123' },
      headers: {
        'user-agent': 'Mozilla/5.0',
        'x-csrf-token': 'csrf:auth:staff-token-123',
      },
    });
    const res = createResponse();
    const next = jest.fn();

    csrfMiddleware(createReq, res, next);
    expect(next).toHaveBeenCalledWith();

    next.mockClear();

    csrfMiddleware(publishReq, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects a state-changing request without a valid CSRF token', async () => {
    const { csrfMiddleware } = await loadCsrfModule();

    const req = createRequest({
      cookies: { auth_token: 'staff-token-123' },
      headers: {
        'user-agent': 'Mozilla/5.0',
      },
    });
    const res = createResponse();
    const next = jest.fn();

    csrfMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
    expect((next.mock.calls[0][0] as Error).message).toBe('invalid csrf token');
  });
});
