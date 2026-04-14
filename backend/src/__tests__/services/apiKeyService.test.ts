const mockQuery = jest.fn();

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: { query: mockQuery },
}));

jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import * as apiKeyService from '../../services/apiKeyService';
import type { ApiKey } from '../../types/webhook';

const makeApiKeyRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'key-uuid',
  organization_id: 'org-1',
  created_by: 'user-1',
  name: 'My API Key',
  description: 'Primary integration key',
  key_prefix: 'npm_ABCDEFGH',
  key_hash: 'hashed-value',
  scopes: ['read:contacts', 'read:reports'],
  rate_limit_requests: 1000,
  rate_limit_interval_ms: 3600000,
  is_active: true,
  expires_at: null,
  last_used_at: null,
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  updated_at: new Date('2026-01-02T00:00:00.000Z'),
  ...overrides,
});

const makeApiKey = (overrides: Partial<ApiKey> = {}): ApiKey => ({
  id: 'key-uuid',
  organizationId: 'org-1',
  createdBy: 'user-1',
  userId: 'user-1',
  name: 'My API Key',
  description: 'Primary integration key',
  keyPrefix: 'npm_ABCDEFGH',
  keyHash: 'hashed-value',
  scopes: ['read:contacts', 'read:reports'],
  isActive: true,
  status: 'active',
  rateLimitRequests: 1000,
  rateLimitIntervalMs: 3600000,
  expiresAt: undefined,
  lastUsedAt: undefined,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  ...overrides,
});

describe('apiKeyService', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  describe('createApiKey', () => {
    it('creates an organization-scoped key and returns a UI-safe payload', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'key-uuid', created_at: new Date('2026-01-01T00:00:00.000Z') }],
      });

      const result = await apiKeyService.createApiKey('org-1', 'user-1', {
        name: 'Automation Key',
        scopes: ['read:contacts'],
      });

      expect(result).toEqual(
        expect.objectContaining({
          id: 'key-uuid',
          organizationId: 'org-1',
          createdBy: 'user-1',
          userId: 'user-1',
          name: 'Automation Key',
          keyPrefix: expect.stringMatching(/^npm_/),
          key: expect.stringMatching(/^npm_/),
          scopes: ['read:contacts'],
          isActive: true,
          status: 'active',
          rateLimitRequests: 1000,
          rateLimitIntervalMs: 3600000,
        })
      );

      expect(String(mockQuery.mock.calls[0][0])).toContain('organization_id');
      expect(String(mockQuery.mock.calls[0][0])).toContain('created_by');
      expect(mockQuery.mock.calls[0][1]).toEqual([
        'org-1',
        'user-1',
        'Automation Key',
        null,
        result.keyPrefix,
        expect.any(String),
        ['read:contacts'],
        null,
      ]);
    });

    it('generates unique plaintext keys on each call', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 'key-1', created_at: new Date() }] })
        .mockResolvedValueOnce({ rows: [{ id: 'key-2', created_at: new Date() }] });

      const result1 = await apiKeyService.createApiKey('org-1', 'user-1', {
        name: 'K1',
        scopes: ['read:contacts'],
      });
      const result2 = await apiKeyService.createApiKey('org-1', 'user-1', {
        name: 'K2',
        scopes: ['read:contacts'],
      });

      expect(result1.key).not.toBe(result2.key);
    });
  });

  describe('validateApiKey', () => {
    it('returns null immediately for keys with the wrong prefix', async () => {
      const result = await apiKeyService.validateApiKey('sk_wrong_prefix');

      expect(result).toBeNull();
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('returns null when no matching active key exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await apiKeyService.validateApiKey(`npm_${'a'.repeat(64)}`);

      expect(result).toBeNull();
    });

    it('returns the mapped ApiKey and updates last_used_at when found', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [makeApiKeyRow()] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await apiKeyService.validateApiKey(`npm_${'a'.repeat(64)}`);

      expect(result).toEqual(
        expect.objectContaining({
          id: 'key-uuid',
          organizationId: 'org-1',
          createdBy: 'user-1',
          status: 'active',
          isActive: true,
        })
      );
      expect(String(mockQuery.mock.calls[1][0])).toMatch(/last_used_at = NOW\(\)/);
    });
  });

  describe('incrementRateLimit', () => {
    it('upserts into the org-scoped rate limit state table', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await apiKeyService.incrementRateLimit('key-uuid');

      expect(String(mockQuery.mock.calls[0][0])).toContain('api_key_rate_limit_state');
      expect(String(mockQuery.mock.calls[0][0])).toContain('ON CONFLICT (api_key_id)');
      expect(mockQuery.mock.calls[0][1]).toEqual(['key-uuid']);
    });
  });

  describe('hasScope', () => {
    it('returns true when the key has the exact scope', () => {
      expect(apiKeyService.hasScope(makeApiKey(), 'read:contacts')).toBe(true);
    });

    it('returns false when the key lacks the scope', () => {
      expect(apiKeyService.hasScope(makeApiKey({ scopes: ['read:contacts'] }), 'write:donations')).toBe(false);
    });

    it('treats admin and wildcard scopes as full access', () => {
      expect(apiKeyService.hasScope(makeApiKey({ scopes: ['admin'] }), 'write:donations')).toBe(true);
      expect(apiKeyService.hasScope(makeApiKey({ scopes: ['*'] }), 'write:donations')).toBe(true);
    });
  });

  describe('hasAnyScope', () => {
    it('returns true when the key has at least one required scope', () => {
      expect(
        apiKeyService.hasAnyScope(makeApiKey({ scopes: ['read:contacts'] }), [
          'read:reports',
          'read:contacts',
        ])
      ).toBe(true);
    });

    it('returns false when the key has none of the required scopes', () => {
      expect(
        apiKeyService.hasAnyScope(makeApiKey({ scopes: ['read:events'] }), [
          'read:contacts',
          'read:reports',
        ])
      ).toBe(false);
    });
  });

  describe('getApiKeyById', () => {
    it('returns null when the key is not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(apiKeyService.getApiKeyById('missing', 'org-1')).resolves.toBeNull();
    });

    it('scopes lookups to organization_id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [makeApiKeyRow()] });

      const result = await apiKeyService.getApiKeyById('key-uuid', 'org-1');

      expect(result).toEqual(expect.objectContaining({ organizationId: 'org-1' }));
      expect(String(mockQuery.mock.calls[0][0])).toContain('organization_id = $2');
      expect(mockQuery.mock.calls[0][1]).toEqual(['key-uuid', 'org-1']);
    });
  });

  describe('updateApiKey', () => {
    it('maps status changes to is_active updates', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [makeApiKeyRow({ is_active: false, updated_at: new Date('2026-01-03T00:00:00.000Z') })],
      });

      const result = await apiKeyService.updateApiKey('key-uuid', 'org-1', {
        status: 'revoked',
      });

      expect(result).toEqual(expect.objectContaining({ status: 'revoked', isActive: false }));
      expect(String(mockQuery.mock.calls[0][0])).toContain('organization_id = $3');
      expect(mockQuery.mock.calls[0][1]).toEqual([false, 'key-uuid', 'org-1']);
    });
  });

  describe('revokeApiKey', () => {
    it('soft-revokes active keys through is_active', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      await expect(apiKeyService.revokeApiKey('key-uuid', 'org-1')).resolves.toBe(true);
      expect(String(mockQuery.mock.calls[0][0])).toContain('SET is_active = FALSE');
      expect(String(mockQuery.mock.calls[0][0])).toContain('organization_id = $2');
    });
  });

  describe('logApiKeyUsage', () => {
    it('writes usage rows to api_key_usage_log using response_time_ms', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await apiKeyService.logApiKeyUsage(
        'key-uuid',
        '/api/v2/webhooks/api-keys',
        'GET',
        200,
        42,
        '127.0.0.1',
        'jest-agent'
      );

      expect(String(mockQuery.mock.calls[0][0])).toContain('api_key_usage_log');
      expect(String(mockQuery.mock.calls[0][0])).toContain('response_time_ms');
      expect(mockQuery.mock.calls[0][1]).toEqual([
        'key-uuid',
        '/api/v2/webhooks/api-keys',
        'GET',
        200,
        42,
        '127.0.0.1',
        'jest-agent',
      ]);
    });
  });

  describe('getApiKeyUsage', () => {
    it('returns mapped usage rows with response_time_ms', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [makeApiKeyRow()] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'usage-1',
              api_key_id: 'key-uuid',
              endpoint: '/api/v2/webhooks/api-keys',
              method: 'GET',
              status_code: 200,
              response_time_ms: 15,
              ip_address: '127.0.0.1',
              user_agent: 'jest-agent',
              created_at: new Date('2026-01-04T00:00:00.000Z'),
            },
          ],
        });

      const result = await apiKeyService.getApiKeyUsage('key-uuid', 'org-1', 25);

      expect(result).toEqual([
        expect.objectContaining({
          id: 'usage-1',
          apiKeyId: 'key-uuid',
          responseTime: 15,
        }),
      ]);
      expect(String(mockQuery.mock.calls[1][0])).toContain('api_key_usage_log');
    });
  });
});
