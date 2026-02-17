// Mock database pool and logger before imports
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

// ─── Fixtures ────────────────────────────────────────────────────────────────

const makeApiKeyRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'key-uuid',
  user_id: 'user-1',
  name: 'My API Key',
  key_prefix: 'npm_ABCDEFGH',
  key_hash: 'hashed-value',
  scopes: JSON.stringify(['contacts:read', 'donations:read']),
  status: 'active',
  expires_at: null,
  last_used_at: null,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
  ...overrides,
});

const makeApiKey = (overrides: Partial<ApiKey> = {}): ApiKey => ({
  id: 'key-uuid',
  userId: 'user-1',
  name: 'My API Key',
  keyPrefix: 'npm_ABCDEFGH',
  scopes: ['contacts:read', 'donations:read'],
  status: 'active',
  expiresAt: null,
  lastUsedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

// ─── createApiKey ─────────────────────────────────────────────────────────────

describe('createApiKey', () => {
  beforeEach(() => mockQuery.mockReset());

  it('returns key only on creation (not stored in DB)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'key-uuid', created_at: new Date('2024-01-01') }],
    });

    const result = await apiKeyService.createApiKey('user-1', {
      name: 'Test Key',
      scopes: ['contacts:read'],
    });

    // The plaintext key is returned only on creation
    expect(result.key).toBeDefined();
    expect(result.key).toMatch(/^npm_/);
    expect(result.id).toBe('key-uuid');
    expect(result.name).toBe('Test Key');
    expect(result.scopes).toEqual(['contacts:read']);
  });

  it('generates unique keys on each call', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'key-1', created_at: new Date() }] })
      .mockResolvedValueOnce({ rows: [{ id: 'key-2', created_at: new Date() }] });

    const result1 = await apiKeyService.createApiKey('user-1', { name: 'K1', scopes: [] });
    const result2 = await apiKeyService.createApiKey('user-1', { name: 'K2', scopes: [] });

    expect(result1.key).not.toBe(result2.key);
  });

  it('stores scopes as JSON in the database', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'key-uuid', created_at: new Date() }] });

    await apiKeyService.createApiKey('user-1', {
      name: 'Key',
      scopes: ['contacts:read', 'events:write'],
    });

    const insertParams = mockQuery.mock.calls[0][1] as unknown[];
    // scopes param (index 4) should be serialised JSON
    expect(insertParams[4]).toBe(JSON.stringify(['contacts:read', 'events:write']));
  });
});

// ─── validateApiKey ──────────────────────────────────────────────────────────

describe('validateApiKey', () => {
  beforeEach(() => mockQuery.mockReset());

  it('returns null immediately for keys that do not start with npm_', async () => {
    const result = await apiKeyService.validateApiKey('sk-wrong-prefix-key');
    expect(result).toBeNull();
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('returns null when no matching active key is found in the DB', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await apiKeyService.validateApiKey('npm_' + 'a'.repeat(64));
    expect(result).toBeNull();
  });

  it('returns the mapped ApiKey and updates last_used_at when found', async () => {
    const row = makeApiKeyRow();
    mockQuery
      .mockResolvedValueOnce({ rows: [row] })   // SELECT
      .mockResolvedValueOnce({ rows: [] });      // UPDATE last_used_at

    const result = await apiKeyService.validateApiKey('npm_' + 'a'.repeat(64));
    expect(result).not.toBeNull();
    expect(result!.id).toBe('key-uuid');
    expect(result!.status).toBe('active');

    // Should have updated last_used_at
    const updateSql = mockQuery.mock.calls[1][0] as string;
    expect(updateSql).toMatch(/last_used_at = NOW\(\)/);
  });
});

// ─── hasScope ─────────────────────────────────────────────────────────────────

describe('hasScope', () => {
  it('returns true when the key has the exact scope', () => {
    const key = makeApiKey({ scopes: ['contacts:read', 'donations:read'] });
    expect(apiKeyService.hasScope(key, 'contacts:read')).toBe(true);
  });

  it('returns false when the key lacks the scope', () => {
    const key = makeApiKey({ scopes: ['contacts:read'] });
    expect(apiKeyService.hasScope(key, 'donations:write')).toBe(false);
  });

  it('returns true for any scope when the key has admin scope', () => {
    const key = makeApiKey({ scopes: ['admin'] });
    expect(apiKeyService.hasScope(key, 'contacts:read')).toBe(true);
    expect(apiKeyService.hasScope(key, 'donations:write')).toBe(true);
    expect(apiKeyService.hasScope(key, 'events:delete')).toBe(true);
  });
});

// ─── hasAnyScope ──────────────────────────────────────────────────────────────

describe('hasAnyScope', () => {
  it('returns true when the key has at least one of the required scopes', () => {
    const key = makeApiKey({ scopes: ['contacts:read'] });
    expect(apiKeyService.hasAnyScope(key, ['donations:read', 'contacts:read'])).toBe(true);
  });

  it('returns false when the key has none of the required scopes', () => {
    const key = makeApiKey({ scopes: ['events:read'] });
    expect(apiKeyService.hasAnyScope(key, ['contacts:read', 'donations:read'])).toBe(false);
  });

  it('returns true for any scope list when the key has admin', () => {
    const key = makeApiKey({ scopes: ['admin'] });
    expect(apiKeyService.hasAnyScope(key, ['contacts:write', 'donations:delete'])).toBe(true);
  });
});

// ─── getApiKeyById ────────────────────────────────────────────────────────────

describe('getApiKeyById', () => {
  beforeEach(() => mockQuery.mockReset());

  it('returns null when not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    expect(await apiKeyService.getApiKeyById('nonexistent', 'user-1')).toBeNull();
  });

  it('returns the mapped key when found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeApiKeyRow()] });
    const result = await apiKeyService.getApiKeyById('key-uuid', 'user-1');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('key-uuid');
  });

  it('scopes the query to the owning user_id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await apiKeyService.getApiKeyById('key-uuid', 'user-1');
    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params).toContain('user-1');
    expect(params).toContain('key-uuid');
  });
});

// ─── revokeApiKey ─────────────────────────────────────────────────────────────

describe('revokeApiKey', () => {
  beforeEach(() => mockQuery.mockReset());

  it('returns true when the key was successfully revoked', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    const result = await apiKeyService.revokeApiKey('key-uuid', 'user-1');
    expect(result).toBe(true);
  });

  it('returns false when no active key matched (already revoked or wrong user)', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });
    const result = await apiKeyService.revokeApiKey('key-uuid', 'wrong-user');
    expect(result).toBe(false);
  });

  it('sets status to "revoked" in the UPDATE query', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    await apiKeyService.revokeApiKey('key-uuid', 'user-1');
    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toMatch(/status = 'revoked'/);
  });
});
