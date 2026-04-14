import { authenticateApiKey, auditApiKeyUsage, validateApiKeyScope } from '@middleware/apiKeyAuth';
import * as apiKeyService from '@services/apiKeyService';
import { logger } from '@config/logger';
import { forbidden, unauthorized } from '@utils/responseHelpers';

jest.mock('@services/apiKeyService', () => ({
  validateApiKey: jest.fn(),
  incrementRateLimit: jest.fn(),
  logApiKeyUsage: jest.fn(),
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
  }) as any;

describe('apiKeyAuth middleware', () => {
  const validateApiKeyMock = apiKeyService.validateApiKey as jest.Mock;
  const incrementRateLimitMock = (apiKeyService as any).incrementRateLimit as jest.Mock;
  const logApiKeyUsageMock = (apiKeyService as any).logApiKeyUsage as jest.Mock;
  const unauthorizedMock = unauthorized as jest.Mock;
  const forbiddenMock = forbidden as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    unauthorizedMock.mockReturnValue(undefined);
    forbiddenMock.mockReturnValue(undefined);
    incrementRateLimitMock.mockResolvedValue(undefined);
    logApiKeyUsageMock.mockResolvedValue(undefined);
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

  it('logs usage failures without failing the response flow', async () => {
    validateApiKeyMock.mockResolvedValue({
      id: 'key-2',
      organizationId: 'org-2',
      scopes: ['*'],
    });
    logApiKeyUsageMock.mockRejectedValueOnce(new Error('usage logging failed'));

    const req = createRequest({
      query: { api_key: 'npm_from_query' },
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

  it('enforces API key scopes and allows wildcard scopes', () => {
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
  });

  it('auditApiKeyUsage logs when request is authenticated with an API key', async () => {
    const reqWithKey = createRequest({
      query: { api_key: 'npm_key' },
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
