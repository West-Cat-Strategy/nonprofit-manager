const mockQuery = jest.fn();

jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    query: (...args: unknown[]) => mockQuery(...args),
  },
}));

import * as webhookService from '../../services/webhookService';

const baseEndpointRow = {
  id: 'endpoint-1',
  user_id: 'user-1',
  url: 'https://example.org/webhook',
  description: 'Example',
  events: JSON.stringify(['contact.created']),
  is_active: true,
  last_delivery_at: null,
  last_delivery_status: null,
  created_at: new Date('2026-01-01T00:00:00.000Z').toISOString(),
  updated_at: new Date('2026-01-01T00:00:00.000Z').toISOString(),
};

describe('webhookService secret exposure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
  });

  it('returns a secret on create so it can be shown once', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          ...baseEndpointRow,
          secret: 'whsec_create_123',
        },
      ],
    });

    const endpoint = await webhookService.createWebhookEndpoint('user-1', {
      url: baseEndpointRow.url,
      events: ['contact.created'],
      description: 'Example',
    });

    expect(endpoint).toEqual(expect.objectContaining({ secret: 'whsec_create_123' }));
  });

  it('omits the secret from list responses', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          ...baseEndpointRow,
          total_deliveries: '3',
          successful_deliveries: '2',
          failed_deliveries: '1',
        },
      ],
    });

    const endpoints = await webhookService.getWebhookEndpoints('user-1');

    expect(endpoints).toHaveLength(1);
    expect(endpoints[0]).toEqual(
      expect.objectContaining({
        id: 'endpoint-1',
        totalDeliveries: 3,
        successfulDeliveries: 2,
        failedDeliveries: 1,
      })
    );
    expect(endpoints[0]).not.toHaveProperty('secret');
  });

  it('omits the secret from get responses', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [baseEndpointRow],
    });

    const endpoint = await webhookService.getWebhookEndpoint('endpoint-1', 'user-1');

    expect(String(mockQuery.mock.calls[0][0])).toContain('FROM webhook_endpoints we');
    expect(String(mockQuery.mock.calls[0][0])).toContain('WHERE we.id = $1 AND we.user_id = $2');

    expect(endpoint).toEqual(
      expect.objectContaining({
        id: 'endpoint-1',
        userId: 'user-1',
      })
    );
    expect(endpoint).not.toHaveProperty('secret');
  });

  it('omits the secret from update responses', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          ...baseEndpointRow,
          url: 'https://example.org/new-webhook',
        },
      ],
    });

    const endpoint = await webhookService.updateWebhookEndpoint('endpoint-1', 'user-1', {
      url: 'https://example.org/new-webhook',
    });

    expect(String(mockQuery.mock.calls[0][0])).toContain('UPDATE webhook_endpoints we');
    expect(String(mockQuery.mock.calls[0][0])).toContain(
      'WHERE we.id = $2 AND we.user_id = $3'
    );

    expect(endpoint).toEqual(
      expect.objectContaining({
        id: 'endpoint-1',
        url: 'https://example.org/new-webhook',
      })
    );
    expect(endpoint).not.toHaveProperty('secret');
  });
});
