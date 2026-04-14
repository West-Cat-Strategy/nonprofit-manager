import type { Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import {
  createWebhookEndpoint,
  updateWebhookEndpoint,
  regenerateWebhookSecret,
  getWebhookDeliveries,
} from '../webhookController';
import { badRequest, notFoundMessage, unauthorized } from '@utils/responseHelpers';
import { sendSuccess } from '@modules/shared/http/envelope';

type MockWebhookService = {
  validateWebhookUrl: jest.Mock;
  getWebhookEndpoints: jest.Mock;
  createWebhookEndpoint: jest.Mock;
  getWebhookEndpoint: jest.Mock;
  updateWebhookEndpoint: jest.Mock;
  deleteWebhookEndpoint: jest.Mock;
  regenerateWebhookSecret: jest.Mock;
  getWebhookDeliveries: jest.Mock;
  testWebhookEndpoint: jest.Mock;
  getAvailableWebhookEvents: jest.Mock;
};

const mockUnauthorized = unauthorized as jest.MockedFunction<typeof unauthorized>;
const mockBadRequest = badRequest as jest.MockedFunction<typeof badRequest>;
const mockNotFoundMessage = notFoundMessage as jest.MockedFunction<typeof notFoundMessage>;
const mockSendSuccess = sendSuccess as jest.MockedFunction<typeof sendSuccess>;

jest.mock('../../services/webhookService', () => ({
  __esModule: true,
  webhookService: {
    validateWebhookUrl: jest.fn(),
    getWebhookEndpoints: jest.fn(),
    createWebhookEndpoint: jest.fn(),
    getWebhookEndpoint: jest.fn(),
    updateWebhookEndpoint: jest.fn(),
    deleteWebhookEndpoint: jest.fn(),
    regenerateWebhookSecret: jest.fn(),
    getWebhookDeliveries: jest.fn(),
    testWebhookEndpoint: jest.fn(),
    getAvailableWebhookEvents: jest.fn(),
  },
  default: {
    validateWebhookUrl: jest.fn(),
    getWebhookEndpoints: jest.fn(),
    createWebhookEndpoint: jest.fn(),
    getWebhookEndpoint: jest.fn(),
    updateWebhookEndpoint: jest.fn(),
    deleteWebhookEndpoint: jest.fn(),
    regenerateWebhookSecret: jest.fn(),
    getWebhookDeliveries: jest.fn(),
    testWebhookEndpoint: jest.fn(),
    getAvailableWebhookEvents: jest.fn(),
  },
}));

jest.mock('../../services/apiKeyService', () => ({
  __esModule: true,
  apiKeyService: {
    getApiKeys: jest.fn(),
    createApiKey: jest.fn(),
    getApiKeyById: jest.fn(),
    updateApiKey: jest.fn(),
    revokeApiKey: jest.fn(),
    deleteApiKey: jest.fn(),
    getApiKeyUsage: jest.fn(),
    getAvailableScopes: jest.fn(),
  },
  default: {
    getApiKeys: jest.fn(),
    createApiKey: jest.fn(),
    getApiKeyById: jest.fn(),
    updateApiKey: jest.fn(),
    revokeApiKey: jest.fn(),
    deleteApiKey: jest.fn(),
    getApiKeyUsage: jest.fn(),
    getAvailableScopes: jest.fn(),
  },
}));

jest.mock('@utils/responseHelpers', () => ({
  __esModule: true,
  badRequest: jest.fn(),
  noContent: jest.fn(),
  notFoundMessage: jest.fn(),
  serverError: jest.fn(),
  unauthorized: jest.fn(),
}));

jest.mock('@modules/shared/http/envelope', () => ({
  __esModule: true,
  sendSuccess: jest.fn(),
}));

jest.mock('@config/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

const mockWebhookService = jest.requireMock('../../services/webhookService')
  .webhookService as MockWebhookService;

const createResponse = (): Response => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis(),
} as unknown as Response);

const createRequest = (overrides: Partial<AuthRequest> = {}): AuthRequest =>
  ({
    user: { id: 'user-1' },
    params: { id: 'endpoint-1' },
    body: {},
    query: {},
    validatedQuery: {},
    ...overrides,
  } as AuthRequest);

describe('webhookController', () => {
  const res = createResponse();

  beforeEach(() => {
    jest.clearAllMocks();

    mockWebhookService.validateWebhookUrl.mockResolvedValue({ ok: true });
    mockWebhookService.createWebhookEndpoint.mockResolvedValue({
      id: 'endpoint-1',
      url: 'https://hooks.example.com/new',
    });
    mockWebhookService.updateWebhookEndpoint.mockResolvedValue({
      id: 'endpoint-1',
      url: 'https://hooks.example.com/updated',
    });
    mockWebhookService.regenerateWebhookSecret.mockResolvedValue('secret-123');
    mockWebhookService.getWebhookDeliveries.mockResolvedValue([
      { id: 'delivery-1', status: 'delivered' },
    ]);
  });

  it('rejects unauthenticated webhook endpoint creation', async () => {
    const req = createRequest({
      user: undefined,
      body: {
        url: 'https://hooks.example.com/new',
        events: ['invoice.created'],
      },
    });

    await createWebhookEndpoint(req, res);

    expect(mockUnauthorized).toHaveBeenCalledWith(res, 'User not authenticated');
    expect(mockWebhookService.validateWebhookUrl).not.toHaveBeenCalled();
    expect(mockWebhookService.createWebhookEndpoint).not.toHaveBeenCalled();
  });

  it('maps webhook URL validation failures to a bad request response', async () => {
    mockWebhookService.validateWebhookUrl.mockResolvedValueOnce({
      ok: false,
      reason: 'Host is not allowed',
    });

    const req = createRequest({
      body: {
        url: 'https://blocked.example.com/hooks',
        description: 'Blocked endpoint',
        events: ['invoice.created'],
      },
    });

    await createWebhookEndpoint(req, res);

    expect(mockBadRequest).toHaveBeenCalledWith(res, 'Host is not allowed');
    expect(mockWebhookService.createWebhookEndpoint).not.toHaveBeenCalled();
  });

  it('creates a webhook endpoint after validation passes', async () => {
    const req = createRequest({
      body: {
        url: 'https://hooks.example.com/new',
        description: 'Accounting feed',
        events: ['invoice.created', 'invoice.updated'],
      },
    });

    await createWebhookEndpoint(req, res);

    expect(mockWebhookService.validateWebhookUrl).toHaveBeenCalledWith('https://hooks.example.com/new');
    expect(mockWebhookService.createWebhookEndpoint).toHaveBeenCalledWith('user-1', {
      url: 'https://hooks.example.com/new',
      description: 'Accounting feed',
      events: ['invoice.created', 'invoice.updated'],
    });
    expect(mockSendSuccess).toHaveBeenCalledWith(
      res,
      {
        id: 'endpoint-1',
        url: 'https://hooks.example.com/new',
      },
      201
    );
  });

  it('updates a webhook endpoint when the payload is valid', async () => {
    const req = createRequest({
      params: { id: 'endpoint-2' },
      body: {
        url: 'https://hooks.example.com/updated',
        description: 'Updated description',
        isActive: false,
      },
    });

    await updateWebhookEndpoint(req, res);

    expect(mockWebhookService.validateWebhookUrl).toHaveBeenCalledWith(
      'https://hooks.example.com/updated'
    );
    expect(mockWebhookService.updateWebhookEndpoint).toHaveBeenCalledWith(
      'endpoint-2',
      'user-1',
      {
        url: 'https://hooks.example.com/updated',
        description: 'Updated description',
        isActive: false,
      }
    );
    expect(mockSendSuccess).toHaveBeenCalledWith(res, {
      id: 'endpoint-1',
      url: 'https://hooks.example.com/updated',
    });
  });

  it('regenerates a webhook secret and returns the new value', async () => {
    const req = createRequest({
      params: { id: 'endpoint-3' },
    });

    await regenerateWebhookSecret(req, res);

    expect(mockWebhookService.regenerateWebhookSecret).toHaveBeenCalledWith('endpoint-3', 'user-1');
    expect(mockSendSuccess).toHaveBeenCalledWith(res, { secret: 'secret-123' });
  });

  it('uses validated query limits when fetching webhook deliveries', async () => {
    const req = createRequest({
      params: { id: 'endpoint-4' },
      validatedQuery: { limit: '25' },
      query: { limit: '99' },
    });

    await getWebhookDeliveries(req, res);

    expect(mockWebhookService.getWebhookDeliveries).toHaveBeenCalledWith('endpoint-4', 'user-1', 25);
    expect(mockSendSuccess).toHaveBeenCalledWith(res, [
      { id: 'delivery-1', status: 'delivered' },
    ]);
  });

  it('maps a missing webhook endpoint to a not found response on regeneration', async () => {
    mockWebhookService.regenerateWebhookSecret.mockResolvedValueOnce(null);

    const req = createRequest({
      params: { id: 'missing-endpoint' },
    });

    await regenerateWebhookSecret(req, res);

    expect(mockNotFoundMessage).toHaveBeenCalledWith(res, 'Webhook endpoint not found');
    expect(mockSendSuccess).not.toHaveBeenCalled();
  });
});
