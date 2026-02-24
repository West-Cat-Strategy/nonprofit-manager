import type { WebhookEventType } from '../../types/webhook';

jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockQuery = jest.fn();

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    query: (...args: unknown[]) => mockQuery(...args),
  },
}));

import { webhookService } from '@services';

describe('webhookService delivery behavior', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    (global as any).fetch = jest.fn();
  });

  it('marks delivery failed when webhook URL is blocked', async () => {
    const endpointRow = {
      id: 'endpoint-1',
      user_id: 'user-1',
      url: 'HTTP://localhost/webhook',
      secret: 'whsec_test',
      events: ['contact.created'],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockQuery
      .mockResolvedValueOnce({ rows: [endpointRow] }) // SELECT endpoints
      .mockResolvedValueOnce({ rows: [{ id: 'delivery-1' }] }) // INSERT delivery
      .mockResolvedValueOnce({ rows: [] }) // UPDATE delivery status
      .mockResolvedValueOnce({ rows: [] }); // UPDATE endpoint status

    await webhookService.triggerWebhooks('contact.created' as WebhookEventType, { id: 'contact-1' });

    const updateDeliveryCall = mockQuery.mock.calls.find((call) =>
      String(call[0]).includes('UPDATE webhook_deliveries')
    );
    expect(updateDeliveryCall).toBeTruthy();
    expect((global as any).fetch).not.toHaveBeenCalled();
  });

  it('processes retries on existing rows without creating a new delivery row', async () => {
    const claimedRetryRow = {
      id: 'delivery-retry-1',
      webhook_endpoint_id: 'endpoint-1',
      event_type: 'contact.created',
      payload: {
        id: 'evt-1',
        type: 'contact.created',
        createdAt: new Date().toISOString(),
        data: { object: { id: 'contact-1' } },
      },
      attempts: 1,
      next_retry_at: new Date().toISOString(),
      user_id: 'user-1',
      url: 'HTTP://localhost/retry',
      secret: 'whsec_test',
    };

    mockQuery
      .mockResolvedValueOnce({ rows: [claimedRetryRow] }) // claim retry rows
      .mockResolvedValueOnce({ rows: [] }) // UPDATE delivery status
      .mockResolvedValueOnce({ rows: [] }); // UPDATE endpoint status

    const processed = await webhookService.processRetries(10);

    expect(processed).toBe(1);

    const insertCalls = mockQuery.mock.calls.filter((call) =>
      String(call[0]).includes('INSERT INTO webhook_deliveries')
    );
    expect(insertCalls).toHaveLength(0);

    const updateDeliveryCall = mockQuery.mock.calls.find((call) =>
      String(call[0]).includes('UPDATE webhook_deliveries')
    );
    expect(updateDeliveryCall).toBeTruthy();
    expect((global as any).fetch).not.toHaveBeenCalled();
  });
});
