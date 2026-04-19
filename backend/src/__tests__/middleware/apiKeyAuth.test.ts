import { authenticateApiKey, auditApiKeyUsage, validateApiKeyScope } from '@middleware/apiKeyAuth';
import pool from '@config/database';
import * as apiKeyService from '@services/apiKeyService';
import { logger } from '@config/logger';
import { forbidden, unauthorized } from '@utils/responseHelpers';

jest.mock('@config/database', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

jest.mock('@services/apiKeyService', () => ({
  validateApiKey: jest.fn(),
  incrementRateLimit: jest.fn(),
  logApiKeyUsage: jest.fn(),
  hasScope: jest.fn(),
}));

jest.mock('@config/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@utils/responseHelpers', () => ({
  unauthorized: jest.fn(),
  forbidden: jest.fn(),
}));

const flushAsync = () => new Promise<void>((resolve) => setImmediate(resolve));

const createRequest = (overrides: Record<string, unknown> = {}) =>
  ({
    headers: {},
    query: {},
    path: '/api/reports',
    method: 'GET',
    ip: '127.0.0.1',
    get: jest.fn().mockReturnValue('test-agent'),
    ...overrides,
  }) as any;

const createResponse = () =>
  ({
    statusCode: 200,
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    getHeader: jest.fn().mockReturnValue(undefined),
    setHeader: jest.fn().mockReturnValue(undefined),
  }) as any;

describe('apiKeyAuth middleware', () => {
  const poolQueryMock = pool.query as jest.Mock;
  const validateApiKeyMock = apiKeyService.validateApiKey as jest.Mock;
  const incrementRateLimitMock = (apiKeyService as any).incrementRateLimit as jest.Mock;
  const logApiKeyUsageMock = (apiKeyService as any).logApiKeyUsage as jest.Mock;
  const hasScopeMock = (apiKeyService as any).hasScope as jest.Mock;
  const unauthorizedMock = unauthorized as jest.Mock;
  const forbiddenMock = forbidden as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    unauthorizedMock.mockReturnValue(undefined);
    forbiddenMock.mockReturnValue(undefined);
    incrementRateLimitMock.mockResolvedValue(undefined);
    logApiKeyUsageMock.mockResolvedValue(undefined);
    poolQueryMock.mockReset();
    hasScopeMock.mockImplementation((apiKey: { scopes: string[] }, requiredScope: string) =>
      apiKey.scopes.includes(requiredScope) || apiKey.scopes.includes('admin') || apiKey.scopes.includes('*')
    );
  });

  it('returns unauthorized when the request has no API key', async () => {
    const req = createRequest();
    const res = createResponse();
    const next = jest.fn();

    await authenticateApiKey(req, res, next);

    expect(unauthorizedMock).toHaveBeenCalledWith(res, 'Missing API key');
    expect(next).not.toHaveBeenCalled();
  });

  it('returns unauthorized when API key validation fails', async () => {
    validateApiKeyMock.mockResolvedValue(null);
    const req = createRequest({
      headers: { authorization: 'Bearer npm_invalid' },
    });
    const res = createResponse();
    const next = jest.fn();

    await authenticateApiKey(req, res, next);

    expect(validateApiKeyMock).toHaveBeenCalledWith('npm_invalid');
    expect(logger.warn).toHaveBeenCalledWith(
      'API key validation failed',
      expect.objectContaining({ ip: '127.0.0.1' })
    );
    expect(unauthorizedMock).toHaveBeenCalledWith(res, 'Invalid API key');
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches API key context and logs usage on successful authentication', async () => {
    validateApiKeyMock.mockResolvedValue({
      id: 'key-1',
      organizationId: 'org-1',
      scopes: ['read:reports'],
    });
    poolQueryMock.mockResolvedValueOnce({
      rows: [
        {
          request_count: 2,
          window_start_at: new Date(Date.now() - 1000),
        },
      ],
    });
    const req = createRequest({
      headers: { authorization: 'Bearer npm_valid' },
      path: '/api/v2/reports',
      method: 'POST',
    });
    const res = createResponse();
    const next = jest.fn();

    await authenticateApiKey(req, res, next);

    expect(incrementRateLimitMock).toHaveBeenCalledWith('key-1');
    expect(req.apiKey).toEqual({
      id: 'key-1',
      organizationId: 'org-1',
      scopes: ['read:reports'],
    });
    expect(next).toHaveBeenCalled();

    res.statusCode = 201;
    res.json({ ok: true });
    await flushAsync();

    expect(logApiKeyUsageMock).toHaveBeenCalledWith(
      'key-1',
      '/api/v2/reports',
      'POST',
      201,
      expect.any(Number),
      '127.0.0.1',
      'test-agent'
    );
  });

  it('rejects API keys supplied in query strings', async () => {
    const req = createRequest({
      query: { api_key: 'npm_from_query' },
    });
    const res = createResponse();
    const next = jest.fn();

    await authenticateApiKey(req, res, next);

    expect(unauthorizedMock).toHaveBeenCalledWith(
      res,
      'API keys must be sent in the Authorization header'
    );
    expect(validateApiKeyMock).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('returns rate_limit_exceeded when the key has already consumed its quota', async () => {
    validateApiKeyMock.mockResolvedValue({
      id: 'key-9',
      organizationId: 'org-9',
      scopes: ['read:reports'],
      rateLimitRequests: 2,
      rateLimitIntervalMs: 60000,
    });
    poolQueryMock.mockResolvedValueOnce({
      rows: [
        {
          request_count: 2,
          window_start_at: new Date(),
        },
      ],
    });

    const req = createRequest({
      headers: { authorization: 'Bearer npm_limited' },
    });
    const res = createResponse();
    const next = jest.fn();

    await authenticateApiKey(req, res, next);

    expect(incrementRateLimitMock).not.toHaveBeenCalled();
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(429);
    expect((res.json as jest.Mock)).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'rate_limit_exceeded',
          message: 'API key rate limit exceeded',
        }),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('logs usage failures without failing the response flow', async () => {
    validateApiKeyMock.mockResolvedValue({
      id: 'key-2',
      organizationId: 'org-2',
      scopes: ['*'],
    });
    poolQueryMock.mockResolvedValueOnce({
      rows: [
        {
          request_count: 1,
          window_start_at: new Date(Date.now() - 1000),
        },
      ],
    });
    logApiKeyUsageMock.mockRejectedValueOnce(new Error('usage logging failed'));

    const req = createRequest({
      headers: { authorization: 'Bearer npm_from_header' },
    });
    const res = createResponse();
    const next = jest.fn();

    await authenticateApiKey(req, res, next);
    res.json({ done: true });
    await flushAsync();

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to log API key usage',
      expect.objectContaining({ err: expect.any(Error) })
    );
  });

  it('returns unauthorized when validation throws unexpectedly', async () => {
    validateApiKeyMock.mockRejectedValueOnce(new Error('validation crashed'));
    const req = createRequest({
      headers: { authorization: 'Bearer npm_crash' },
    });
    const res = createResponse();
    const next = jest.fn();

    await authenticateApiKey(req, res, next);

    expect(logger.error).toHaveBeenCalledWith(
      'API key authentication error',
      expect.objectContaining({ error: expect.any(Error) })
    );
    expect(unauthorizedMock).toHaveBeenCalledWith(res, 'Authentication failed');
    expect(next).not.toHaveBeenCalled();
  });

  it('enforces API key scopes and allows wildcard or admin scopes', () => {
    const noKeyReq = createRequest();
    const noKeyRes = createResponse();
    const noKeyNext = jest.fn();
    validateApiKeyScope('read:contacts')(noKeyReq, noKeyRes, noKeyNext);
    expect(forbiddenMock).toHaveBeenCalledWith(noKeyRes, 'API key authentication required');
    expect(noKeyNext).not.toHaveBeenCalled();

    const insufficientReq = createRequest({
      apiKey: { id: 'key-3', organizationId: 'org-3', scopes: ['write:contacts'] },
    });
    const insufficientRes = createResponse();
    const insufficientNext = jest.fn();
    validateApiKeyScope('read:contacts')(insufficientReq, insufficientRes, insufficientNext);
    expect(logger.warn).toHaveBeenCalledWith(
      'API key lacks required scope',
      expect.objectContaining({ apiKeyId: 'key-3', requiredScope: 'read:contacts' })
    );
    expect(forbiddenMock).toHaveBeenCalledWith(
      insufficientRes,
      'This API key does not have the "read:contacts" scope'
    );
    expect(insufficientNext).not.toHaveBeenCalled();

    const wildcardReq = createRequest({
      apiKey: { id: 'key-4', organizationId: 'org-4', scopes: ['*'] },
    });
    const wildcardRes = createResponse();
    const wildcardNext = jest.fn();
    validateApiKeyScope('read:contacts')(wildcardReq, wildcardRes, wildcardNext);
    expect(wildcardNext).toHaveBeenCalled();

    const adminReq = createRequest({
      apiKey: { id: 'key-5', organizationId: 'org-5', scopes: ['admin'] },
    });
    const adminRes = createResponse();
    const adminNext = jest.fn();
    validateApiKeyScope('read:contacts')(adminReq, adminRes, adminNext);
    expect(adminNext).toHaveBeenCalled();
  });

  it('auditApiKeyUsage logs when request is authenticated with an API key', async () => {
    const reqWithKey = createRequest({
      headers: { authorization: 'Bearer npm_key' },
      apiKey: { id: 'key-5', organizationId: 'org-5', scopes: ['read:reports'] },
      method: 'PATCH',
      path: '/api/v2/resource',
    });
    const res = createResponse();
    const next = jest.fn();

    await auditApiKeyUsage(reqWithKey, res, next);

    expect(logger.debug).toHaveBeenCalledWith(
      'API key request',
      expect.objectContaining({
        apiKeyId: 'key-5',
        organizationId: 'org-5',
        method: 'PATCH',
        path: '/api/v2/resource',
      })
    );
    expect(next).toHaveBeenCalled();

    jest.clearAllMocks();
    const reqWithoutKey = createRequest();
    await auditApiKeyUsage(reqWithoutKey, res, next);
    expect(logger.debug).not.toHaveBeenCalled();
  });
});
