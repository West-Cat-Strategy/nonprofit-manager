/**
 * API Key Service
 * Handles API key generation, validation, and management
 */

import crypto from 'crypto';
import pool from '@config/database';
import { logger } from '@config/logger';
import { API_KEY_MANAGED_SCOPES } from '@app-types/webhook';
import type {
  ApiKey,
  ApiKeyManagedScope,
  ApiKeyScope,
  ApiKeyStatus,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  UpdateApiKeyRequest,
  ApiKeyWithStats,
  ApiKeyUsage,
} from '@app-types/webhook';

const API_KEY_PREFIX = 'npm_'; // nonprofit-manager prefix
const KEY_LENGTH = 32;
const MANAGED_SCOPE_SET = new Set<string>(API_KEY_MANAGED_SCOPES);

export class InvalidApiKeyScopesError extends Error {
  constructor(scopes: readonly string[], message?: string) {
    super(message || `Invalid API key scopes: ${scopes.join(', ')}`);
    this.name = 'InvalidApiKeyScopesError';
    Object.setPrototypeOf(this, InvalidApiKeyScopesError.prototype);
  }
}

const deriveApiKeyStatus = (row: Record<string, unknown>): ApiKeyStatus => {
  const expiresAtValue = row.expires_at ? new Date(String(row.expires_at)) : null;
  if (
    expiresAtValue &&
    !Number.isNaN(expiresAtValue.getTime()) &&
    expiresAtValue.getTime() <= Date.now()
  ) {
    return 'expired';
  }

  return row.is_active === false ? 'revoked' : 'active';
};

/**
 * Generate a secure API key
 */
function generateApiKey(): { key: string; keyPrefix: string; keyHash: string } {
  const randomBytes = crypto.randomBytes(KEY_LENGTH);
  const key = `${API_KEY_PREFIX}${randomBytes.toString('hex')}`;
  const keyPrefix = key.substring(0, 10); // npm_XXXXXX
  const keyHash = crypto.createHash('sha256').update(key).digest('hex');

  return { key, keyPrefix, keyHash };
}

/**
 * Hash an API key for comparison
 */
function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function normalizeManagedScopes(scopes: readonly string[]): ApiKeyManagedScope[] {
  if (scopes.length === 0) {
    throw new InvalidApiKeyScopesError(scopes, 'At least one API key scope is required');
  }

  const invalidScopes = scopes.filter((scope) => !MANAGED_SCOPE_SET.has(scope));
  if (invalidScopes.length > 0) {
    throw new InvalidApiKeyScopesError(invalidScopes);
  }

  return Array.from(new Set(scopes)) as ApiKeyManagedScope[];
}

/**
 * Create a new API key
 */
export async function createApiKey(
  organizationId: string,
  createdByUserId: string,
  data: CreateApiKeyRequest
): Promise<CreateApiKeyResponse> {
  const scopes = normalizeManagedScopes(data.scopes);
  const { key, keyPrefix, keyHash } = generateApiKey();

  const result = await pool.query(
    `INSERT INTO api_keys (
       organization_id,
       created_by,
       name,
       description,
       key_prefix,
       key_hash,
       scopes,
       is_active,
       expires_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8)
     RETURNING id, created_at`,
    [
      organizationId,
      createdByUserId,
      data.name,
      null,
      keyPrefix,
      keyHash,
      scopes,
      data.expiresAt || null,
    ]
  );

  const row = result.rows[0];

  return {
    id: row.id,
    organizationId,
    createdBy: createdByUserId,
    name: data.name,
    description: null,
    key, // Only returned on creation
    keyPrefix,
    scopes,
    isActive: true,
    status: data.expiresAt && data.expiresAt.getTime() <= Date.now() ? 'expired' : 'active',
    rateLimitRequests: 1000,
    rateLimitIntervalMs: 3600000,
    expiresAt: data.expiresAt,
    lastUsedAt: undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.created_at),
    userId: createdByUserId,
  };
}

/**
 * Get all API keys for an organization (without the actual key)
 */
export async function getApiKeys(organizationId: string): Promise<ApiKeyWithStats[]> {
  const result = await pool.query(
    `SELECT
       ak.*,
       COUNT(akul.id) as total_requests,
       COUNT(*) FILTER (WHERE akul.created_at > NOW() - INTERVAL '30 days') as requests_this_month,
       COALESCE(AVG(akul.response_time_ms), 0) as average_response_time
     FROM api_keys ak
     LEFT JOIN api_key_usage_log akul ON ak.id = akul.api_key_id
     WHERE ak.organization_id = $1
     GROUP BY ak.id
     ORDER BY ak.created_at DESC`,
    [organizationId]
  );

  return result.rows.map(mapRowToApiKeyWithStats);
}

/**
 * Get a specific API key by ID
 */
export async function getApiKeyById(
  keyId: string,
  organizationId: string
): Promise<ApiKey | null> {
  const result = await pool.query(
    'SELECT * FROM api_keys WHERE id = $1 AND organization_id = $2',
    [keyId, organizationId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToApiKey(result.rows[0]);
}

/**
 * Validate an API key and return the key record if valid
 */
export async function validateApiKey(key: string): Promise<ApiKey | null> {
  if (!key.startsWith(API_KEY_PREFIX)) {
    return null;
  }

  const keyHash = hashApiKey(key);

  const result = await pool.query(
    `SELECT *
     FROM api_keys
     WHERE key_hash = $1
       AND is_active = true
       AND (expires_at IS NULL OR expires_at > NOW())`,
    [keyHash]
  );

  if (result.rows.length === 0) {
    return null;
  }

  // Update last used timestamp
  await pool.query(
    'UPDATE api_keys SET last_used_at = NOW() WHERE id = $1',
    [result.rows[0].id]
  );

  return mapRowToApiKey(result.rows[0]);
}

/**
 * Track API key requests in the org-scoped rate limit table.
 * Enforcement remains outside this remediation slice.
 */
export async function incrementRateLimit(apiKeyId: string): Promise<void> {
  await pool.query(
    `INSERT INTO api_key_rate_limit_state (api_key_id, request_count, window_start_at, updated_at)
     VALUES ($1, 1, NOW(), NOW())
     ON CONFLICT (api_key_id)
     DO UPDATE SET
       request_count = api_key_rate_limit_state.request_count + 1,
       updated_at = NOW()`,
    [apiKeyId]
  );
}

/**
 * Check if an API key has the required scope
 */
export function hasScope(apiKey: ApiKey, requiredScope: ApiKeyScope): boolean {
  // Admin scope has access to everything
  if (apiKey.scopes.includes('admin') || apiKey.scopes.includes('*')) {
    return true;
  }

  return apiKey.scopes.includes(requiredScope);
}

/**
 * Check if an API key has any of the required scopes
 */
export function hasAnyScope(apiKey: ApiKey, requiredScopes: ApiKeyScope[]): boolean {
  if (apiKey.scopes.includes('admin') || apiKey.scopes.includes('*')) {
    return true;
  }

  return requiredScopes.some((scope) => apiKey.scopes.includes(scope));
}

/**
 * Update an API key
 */
export async function updateApiKey(
  keyId: string,
  organizationId: string,
  data: UpdateApiKeyRequest
): Promise<ApiKey | null> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.scopes !== undefined) {
    const scopes = normalizeManagedScopes(data.scopes);
    updates.push(`scopes = $${paramIndex++}`);
    values.push(scopes);
  }
  if (data.status !== undefined) {
    updates.push(`is_active = $${paramIndex++}`);
    values.push(data.status === 'active');
  }

  if (updates.length === 0) {
    return getApiKeyById(keyId, organizationId);
  }

  updates.push(`updated_at = NOW()`);
  values.push(keyId, organizationId);

  const result = await pool.query(
    `UPDATE api_keys
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex++} AND organization_id = $${paramIndex}
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToApiKey(result.rows[0]);
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(
  keyId: string,
  organizationId: string
): Promise<boolean> {
  const result = await pool.query(
    `UPDATE api_keys
     SET is_active = FALSE, updated_at = NOW()
     WHERE id = $1 AND organization_id = $2 AND is_active = TRUE
     RETURNING id`,
    [keyId, organizationId]
  );

  return (result.rowCount ?? 0) > 0;
}

/**
 * Delete an API key
 */
export async function deleteApiKey(
  keyId: string,
  organizationId: string
): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM api_keys WHERE id = $1 AND organization_id = $2',
    [keyId, organizationId]
  );

  return (result.rowCount ?? 0) > 0;
}

/**
 * Log API key usage
 */
export async function logApiKeyUsage(
  apiKeyId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTime: number,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO api_key_usage_log (api_key_id, endpoint, method, status_code, response_time_ms, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [apiKeyId, endpoint, method, statusCode, responseTime, ipAddress || null, userAgent || null]
    );
  } catch (error) {
    // Don't let logging failures affect the request
    logger.error('Failed to log API key usage', { apiKeyId, error });
  }
}

/**
 * Get API key usage history
 */
export async function getApiKeyUsage(
  keyId: string,
  organizationId: string,
  limit = 100
): Promise<ApiKeyUsage[]> {
  // First verify the key belongs to the organization.
  const key = await getApiKeyById(keyId, organizationId);
  if (!key) {
    return [];
  }

  const result = await pool.query(
    `SELECT *
     FROM api_key_usage_log
     WHERE api_key_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [keyId, limit]
  );

  return result.rows.map((row) => ({
    id: row.id,
    apiKeyId: row.api_key_id,
    endpoint: row.endpoint,
    method: row.method,
    statusCode: row.status_code,
    responseTime: Number(row.response_time_ms) || 0,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: new Date(row.created_at),
  }));
}

/**
 * Get available API scopes
 */
export function getAvailableScopes() {
  return [
    { scope: 'read:contacts', name: 'Read Contacts', description: 'View contact information' },
    { scope: 'write:contacts', name: 'Write Contacts', description: 'Create and update contacts' },
    { scope: 'read:donations', name: 'Read Donations', description: 'View donation records' },
    { scope: 'write:donations', name: 'Write Donations', description: 'Create and update donations' },
    { scope: 'read:events', name: 'Read Events', description: 'View event information' },
    { scope: 'write:events', name: 'Write Events', description: 'Create and update events' },
    { scope: 'read:volunteers', name: 'Read Volunteers', description: 'View volunteer information' },
    { scope: 'write:volunteers', name: 'Write Volunteers', description: 'Create and update volunteers' },
    { scope: 'read:tasks', name: 'Read Tasks', description: 'View task information' },
    { scope: 'write:tasks', name: 'Write Tasks', description: 'Create and update tasks' },
    { scope: 'read:reports', name: 'Read Reports', description: 'View and run reports' },
    { scope: 'read:analytics', name: 'Read Analytics', description: 'View analytics data' },
  ];
}

/**
 * Clean up expired API keys
 */
export async function cleanupExpiredKeys(): Promise<number> {
  const result = await pool.query(
    `UPDATE api_keys
     SET is_active = false, updated_at = NOW()
     WHERE is_active = true
     AND expires_at IS NOT NULL
     AND expires_at < NOW()`
  );

  return result.rowCount ?? 0;
}

/**
 * Map database row to ApiKey
 */
function mapRowToApiKey(row: Record<string, unknown>): ApiKey {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    createdBy: (row.created_by as string | null) ?? '',
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    keyPrefix: row.key_prefix as string,
    keyHash: row.key_hash as string,
    scopes: (typeof row.scopes === 'string' ? JSON.parse(row.scopes) : row.scopes) as ApiKeyScope[],
    isActive: row.is_active as boolean,
    status: deriveApiKeyStatus(row),
    rateLimitRequests: Number(row.rate_limit_requests) || 0,
    rateLimitIntervalMs: Number(row.rate_limit_interval_ms) || 0,
    expiresAt: row.expires_at ? new Date(row.expires_at as string) : undefined,
    lastUsedAt: row.last_used_at ? new Date(row.last_used_at as string) : undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    userId: (row.created_by as string | null) ?? undefined,
  };
}

/**
 * Map database row to ApiKeyWithStats (excludes keyHash)
 */
function mapRowToApiKeyWithStats(row: Record<string, unknown>): ApiKeyWithStats {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    createdBy: (row.created_by as string | null) ?? '',
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    keyPrefix: row.key_prefix as string,
    scopes: (typeof row.scopes === 'string' ? JSON.parse(row.scopes) : row.scopes) as ApiKeyScope[],
    isActive: row.is_active as boolean,
    status: deriveApiKeyStatus(row),
    rateLimitRequests: Number(row.rate_limit_requests) || 0,
    rateLimitIntervalMs: Number(row.rate_limit_interval_ms) || 0,
    expiresAt: row.expires_at ? new Date(row.expires_at as string) : undefined,
    lastUsedAt: row.last_used_at ? new Date(row.last_used_at as string) : undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    totalRequests: parseInt(row.total_requests as string) || 0,
    requestsThisMonth: parseInt(row.requests_this_month as string) || 0,
    averageResponseTime: parseFloat(row.average_response_time as string) || 0,
    userId: (row.created_by as string | null) ?? undefined,
  };
}

export default {
  createApiKey,
  getApiKeys,
  getApiKeyById,
  validateApiKey,
  incrementRateLimit,
  hasScope,
  hasAnyScope,
  updateApiKey,
  revokeApiKey,
  deleteApiKey,
  logApiKeyUsage,
  getApiKeyUsage,
  getAvailableScopes,
  cleanupExpiredKeys,
  InvalidApiKeyScopesError,
};
