/**
 * Webhook Service Tests
 * Unit tests for webhook management
 */

// Mock pool before importing service
jest.mock('../../config/database', () => ({
  query: jest.fn(),
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock fetch for webhook delivery
global.fetch = jest.fn();

import pool from '../../config/database';
import * as webhookService from '../../services/webhookService';

const mockPool = pool as any;
const mockFetch = global.fetch as jest.Mock;

describe('WebhookService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createWebhookEndpoint', () => {
    it('should create a new webhook endpoint', async () => {
      const mockEndpoint = {
        id: 'endpoint_123',
        user_id: 'user_123',
        url: 'https://example.com/webhook',
        description: 'Test webhook',
        secret: 'whsec_testsecret',
        events: JSON.stringify(['contact.created']),
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockPool.query.mockResolvedValue({ rows: [mockEndpoint] });

      const result = await webhookService.createWebhookEndpoint('user_123', {
        url: 'https://example.com/webhook',
        description: 'Test webhook',
        events: ['contact.created'],
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO webhook_endpoints'),
        expect.arrayContaining(['user_123', 'https://example.com/webhook'])
      );
      expect(result.url).toBe('https://example.com/webhook');
      expect(result.isActive).toBe(true);
    });
  });

  describe('getWebhookEndpoints', () => {
    it('should return all endpoints for a user with stats', async () => {
      const mockEndpoints = [
        {
          id: 'endpoint_1',
          user_id: 'user_123',
          url: 'https://example1.com/webhook',
          secret: 'whsec_secret1',
          events: JSON.stringify(['contact.created']),
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          total_deliveries: '10',
          successful_deliveries: '8',
          failed_deliveries: '2',
        },
        {
          id: 'endpoint_2',
          user_id: 'user_123',
          url: 'https://example2.com/webhook',
          secret: 'whsec_secret2',
          events: JSON.stringify(['donation.created']),
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          total_deliveries: '5',
          successful_deliveries: '5',
          failed_deliveries: '0',
        },
      ];

      mockPool.query.mockResolvedValue({ rows: mockEndpoints });

      const result = await webhookService.getWebhookEndpoints('user_123');

      expect(result).toHaveLength(2);
      expect(result[0].totalDeliveries).toBe(10);
      expect(result[0].successRate).toBe(80);
      expect(result[1].successRate).toBe(100);
    });
  });

  describe('getWebhookEndpoint', () => {
    it('should return a specific endpoint', async () => {
      const mockEndpoint = {
        id: 'endpoint_123',
        user_id: 'user_123',
        url: 'https://example.com/webhook',
        secret: 'whsec_testsecret',
        events: JSON.stringify(['contact.created', 'contact.updated']),
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockPool.query.mockResolvedValue({ rows: [mockEndpoint] });

      const result = await webhookService.getWebhookEndpoint('endpoint_123', 'user_123');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('endpoint_123');
      expect(result!.events).toContain('contact.created');
    });

    it('should return null for non-existent endpoint', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await webhookService.getWebhookEndpoint('invalid', 'user_123');

      expect(result).toBeNull();
    });
  });

  describe('updateWebhookEndpoint', () => {
    it('should update an endpoint', async () => {
      const mockEndpoint = {
        id: 'endpoint_123',
        user_id: 'user_123',
        url: 'https://updated.com/webhook',
        secret: 'whsec_testsecret',
        events: JSON.stringify(['contact.created']),
        is_active: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockPool.query.mockResolvedValue({ rows: [mockEndpoint] });

      const result = await webhookService.updateWebhookEndpoint('endpoint_123', 'user_123', {
        url: 'https://updated.com/webhook',
        isActive: false,
      });

      expect(result).not.toBeNull();
      expect(result!.url).toBe('https://updated.com/webhook');
      expect(result!.isActive).toBe(false);
    });

    it('should return null for non-existent endpoint', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await webhookService.updateWebhookEndpoint('invalid', 'user_123', {
        url: 'https://test.com',
      });

      expect(result).toBeNull();
    });
  });

  describe('deleteWebhookEndpoint', () => {
    it('should delete an endpoint', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 1 });

      const result = await webhookService.deleteWebhookEndpoint('endpoint_123', 'user_123');

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM webhook_endpoints WHERE id = $1 AND user_id = $2',
        ['endpoint_123', 'user_123']
      );
    });

    it('should return false for non-existent endpoint', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 0 });

      const result = await webhookService.deleteWebhookEndpoint('invalid', 'user_123');

      expect(result).toBe(false);
    });
  });

  describe('regenerateWebhookSecret', () => {
    it('should regenerate the webhook secret', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ secret: 'whsec_newsecret' }],
      });

      const result = await webhookService.regenerateWebhookSecret('endpoint_123', 'user_123');

      expect(result).not.toBeNull();
      expect(result).toMatch(/^whsec_/);
    });

    it('should return null for non-existent endpoint', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await webhookService.regenerateWebhookSecret('invalid', 'user_123');

      expect(result).toBeNull();
    });
  });

  describe('testWebhookEndpoint', () => {
    it('should return success for successful test', async () => {
      const mockEndpoint = {
        id: 'endpoint_123',
        user_id: 'user_123',
        url: 'https://example.com/webhook',
        secret: 'whsec_testsecret',
        events: JSON.stringify(['contact.created']),
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockPool.query.mockResolvedValue({ rows: [mockEndpoint] });
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve('OK'),
      });

      const result = await webhookService.testWebhookEndpoint('endpoint_123', 'user_123');

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.responseTime).toBeDefined();
    });

    it('should return failure for failed test', async () => {
      const mockEndpoint = {
        id: 'endpoint_123',
        user_id: 'user_123',
        url: 'https://example.com/webhook',
        secret: 'whsec_testsecret',
        events: JSON.stringify(['contact.created']),
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockPool.query.mockResolvedValue({ rows: [mockEndpoint] });
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });

      const result = await webhookService.testWebhookEndpoint('endpoint_123', 'user_123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('500');
    });

    it('should return error for non-existent endpoint', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await webhookService.testWebhookEndpoint('invalid', 'user_123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Webhook endpoint not found');
    });
  });

  describe('getAvailableWebhookEvents', () => {
    it('should return all available events', () => {
      const events = webhookService.getAvailableWebhookEvents();

      expect(events.length).toBeGreaterThan(0);
      expect(events.some((e) => e.type === 'contact.created')).toBe(true);
      expect(events.some((e) => e.type === 'donation.created')).toBe(true);
      expect(events.every((e) => e.name && e.description && e.category)).toBe(true);
    });
  });

  describe('triggerWebhooks', () => {
    it('should trigger webhooks for matching endpoints', async () => {
      const mockEndpoints = [
        {
          id: 'endpoint_1',
          user_id: 'user_123',
          url: 'https://example.com/webhook',
          secret: 'whsec_testsecret',
          events: JSON.stringify(['contact.created']),
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      // Mock finding endpoints
      mockPool.query.mockResolvedValueOnce({ rows: mockEndpoints });

      // Mock creating delivery record
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'delivery_123' }] });

      // Mock successful delivery
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve('OK'),
      });

      // Mock update delivery status
      mockPool.query.mockResolvedValue({ rows: [] });

      await webhookService.triggerWebhooks('contact.created', {
        id: 'contact_123',
        first_name: 'John',
        last_name: 'Doe',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Webhook-Event': 'contact.created',
          }),
        })
      );
    });
  });

  describe('getWebhookDeliveries', () => {
    it('should return deliveries for an endpoint', async () => {
      // Mock endpoint verification
      const mockEndpoint = {
        id: 'endpoint_123',
        user_id: 'user_123',
        url: 'https://example.com/webhook',
        secret: 'whsec_testsecret',
        events: JSON.stringify(['contact.created']),
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockEndpoint] });

      const mockDeliveries = [
        {
          id: 'delivery_1',
          webhook_endpoint_id: 'endpoint_123',
          event_type: 'contact.created',
          payload: { id: 'test' },
          status: 'success',
          response_status: 200,
          attempts: 1,
          created_at: new Date().toISOString(),
        },
        {
          id: 'delivery_2',
          webhook_endpoint_id: 'endpoint_123',
          event_type: 'contact.updated',
          payload: { id: 'test2' },
          status: 'failed',
          response_status: 500,
          attempts: 3,
          created_at: new Date().toISOString(),
        },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockDeliveries });

      const result = await webhookService.getWebhookDeliveries('endpoint_123', 'user_123');

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('success');
      expect(result[1].status).toBe('failed');
    });

    it('should return empty array for non-existent endpoint', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await webhookService.getWebhookDeliveries('invalid', 'user_123');

      expect(result).toEqual([]);
    });
  });
});
