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

  it('enqueues delivery records and does not perform network delivery during trigger', async () => {
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
      .mockResolvedValueOnce({ rows: [{ id: 'delivery-1' }] }); // INSERT delivery

    await webhookService.triggerWebhooks('contact.created' as WebhookEventType, { id: 'contact-1' });

    const insertDeliveryCall = mockQuery.mock.calls.find((call) =>
      String(call[0]).includes('INSERT INTO webhook_deliveries')
    );
    const updateDeliveryCall = mockQuery.mock.calls.find((call) =>
      String(call[0]).includes('UPDATE webhook_deliveries')
    );
    expect(insertDeliveryCall).toBeTruthy();
    expect(String(insertDeliveryCall?.[0])).toContain('queued');
    expect(updateDeliveryCall).toBeUndefined();
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

  it('transitions queued delivery rows through running to success', async () => {
    const claimedRow = {
      id: 'delivery-success-1',
      webhook_endpoint_id: 'endpoint-1',
      event_type: 'contact.created',
      payload: {
        id: 'evt-success-1',
        type: 'contact.created',
        createdAt: new Date().toISOString(),
        data: { object: { id: 'contact-1' } },
      },
      attempts: 0,
      next_retry_at: new Date().toISOString(),
      user_id: 'user-1',
      url: 'https://8.8.8.8/webhook',
      secret: 'whsec_test',
    };

    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue('ok'),
    });

    mockQuery
      .mockResolvedValueOnce({ rows: [claimedRow] }) // claim
      .mockResolvedValueOnce({ rows: [] }) // UPDATE webhook_deliveries success
      .mockResolvedValueOnce({ rows: [] }); // UPDATE webhook_endpoints success

    const processed = await webhookService.processRetries(10);

    expect(processed).toBe(1);
    const claimCall = mockQuery.mock.calls[0];
    expect(String(claimCall[0])).toContain("SET status = 'running'");
    expect(String(claimCall[0])).toContain("wd.status IN ('queued', 'retrying')");

    const deliveryUpdate = mockQuery.mock.calls.find((call) =>
      String(call[0]).includes('response_status = COALESCE')
    );
    expect(deliveryUpdate?.[1][0]).toBe('success');
    expect(deliveryUpdate?.[1][4]).toBe(1); // attempts
    expect(deliveryUpdate?.[1][5]).toBeNull(); // next_retry_at
  });

  it('schedules retries with incremented attempts when delivery fails before max attempts', async () => {
    const claimedRow = {
      id: 'delivery-retryable-1',
      webhook_endpoint_id: 'endpoint-1',
      event_type: 'contact.created',
      payload: {
        id: 'evt-retry-1',
        type: 'contact.created',
        createdAt: new Date().toISOString(),
        data: { object: { id: 'contact-1' } },
      },
      attempts: 1,
      next_retry_at: new Date().toISOString(),
      user_id: 'user-1',
      url: 'https://8.8.8.8/webhook',
      secret: 'whsec_test',
    };

    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue('upstream-error'),
    });

    mockQuery
      .mockResolvedValueOnce({ rows: [claimedRow] }) // claim
      .mockResolvedValueOnce({ rows: [] }); // UPDATE webhook_deliveries retrying

    const processed = await webhookService.processRetries(10);
    expect(processed).toBe(1);

    const deliveryUpdate = mockQuery.mock.calls.find((call) =>
      String(call[0]).includes('response_status = COALESCE')
    );
    expect(deliveryUpdate?.[1][0]).toBe('retrying');
    expect(deliveryUpdate?.[1][4]).toBe(2); // attempts incremented
    expect(deliveryUpdate?.[1][5]).toEqual(expect.any(Date)); // next_retry_at set
  });

  it('marks deliveries as dead_letter after max attempts and updates endpoint status', async () => {
    const claimedRow = {
      id: 'delivery-dead-letter-1',
      webhook_endpoint_id: 'endpoint-1',
      event_type: 'contact.created',
      payload: {
        id: 'evt-dead-letter-1',
        type: 'contact.created',
        createdAt: new Date().toISOString(),
        data: { object: { id: 'contact-1' } },
      },
      attempts: 4,
      next_retry_at: new Date().toISOString(),
      user_id: 'user-1',
      url: 'https://8.8.8.8/webhook',
      secret: 'whsec_test',
    };

    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue('terminal-error'),
    });

    mockQuery
      .mockResolvedValueOnce({ rows: [claimedRow] }) // claim
      .mockResolvedValueOnce({ rows: [] }) // UPDATE webhook_deliveries dead_letter
      .mockResolvedValueOnce({ rows: [] }); // UPDATE webhook_endpoints dead_letter

    const processed = await webhookService.processRetries(10);
    expect(processed).toBe(1);

    const deliveryUpdate = mockQuery.mock.calls.find((call) =>
      String(call[0]).includes('response_status = COALESCE')
    );
    expect(deliveryUpdate?.[1][0]).toBe('dead_letter');
    expect(deliveryUpdate?.[1][4]).toBe(5);
    expect(deliveryUpdate?.[1][5]).toBeNull();

    const endpointUpdate = mockQuery.mock.calls.find((call) =>
      String(call[0]).includes('UPDATE webhook_endpoints')
    );
    expect(endpointUpdate?.[1][1]).toBe('dead_letter');
  });

  it('reclaims stale running rows during claim query', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const processed = await webhookService.processRetries(1);
    expect(processed).toBe(0);

    const claimCall = mockQuery.mock.calls[0];
    expect(String(claimCall[0])).toContain("wd.status = 'running'");
    expect(String(claimCall[0])).toContain('processing_started_at < NOW()');
    expect(claimCall[1][1]).toBe(10); // stale timeout minutes
  });
});
