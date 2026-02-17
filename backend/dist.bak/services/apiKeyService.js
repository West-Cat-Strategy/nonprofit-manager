"use strict";
/**
 * API Key Service
 * Handles API key generation, validation, and management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApiKey = createApiKey;
exports.getApiKeys = getApiKeys;
exports.getApiKeyById = getApiKeyById;
exports.validateApiKey = validateApiKey;
exports.hasScope = hasScope;
exports.hasAnyScope = hasAnyScope;
exports.updateApiKey = updateApiKey;
exports.revokeApiKey = revokeApiKey;
exports.deleteApiKey = deleteApiKey;
exports.logApiKeyUsage = logApiKeyUsage;
exports.getApiKeyUsage = getApiKeyUsage;
exports.getAvailableScopes = getAvailableScopes;
exports.cleanupExpiredKeys = cleanupExpiredKeys;
const crypto_1 = __importDefault(require("crypto"));
const database_1 = __importDefault(require("../config/database"));
const logger_1 = require("../config/logger");
const API_KEY_PREFIX = 'npm_'; // nonprofit-manager prefix
const KEY_LENGTH = 32;
/**
 * Generate a secure API key
 */
function generateApiKey() {
    const randomBytes = crypto_1.default.randomBytes(KEY_LENGTH);
    const key = `${API_KEY_PREFIX}${randomBytes.toString('hex')}`;
    const keyPrefix = key.substring(0, 12); // npm_XXXXXXXX
    const keyHash = crypto_1.default.createHash('sha256').update(key).digest('hex');
    return { key, keyPrefix, keyHash };
}
/**
 * Hash an API key for comparison
 */
function hashApiKey(key) {
    return crypto_1.default.createHash('sha256').update(key).digest('hex');
}
/**
 * Create a new API key
 */
async function createApiKey(userId, data) {
    const { key, keyPrefix, keyHash } = generateApiKey();
    const result = await database_1.default.query(`INSERT INTO api_keys (user_id, name, key_prefix, key_hash, scopes, status, expires_at)
     VALUES ($1, $2, $3, $4, $5, 'active', $6)
     RETURNING id, created_at`, [
        userId,
        data.name,
        keyPrefix,
        keyHash,
        JSON.stringify(data.scopes),
        data.expiresAt || null,
    ]);
    const row = result.rows[0];
    return {
        id: row.id,
        name: data.name,
        key, // Only returned on creation
        keyPrefix,
        scopes: data.scopes,
        expiresAt: data.expiresAt,
        createdAt: new Date(row.created_at),
    };
}
/**
 * Get all API keys for a user (without the actual key)
 */
async function getApiKeys(userId) {
    const result = await database_1.default.query(`SELECT
       ak.*,
       COUNT(aku.id) as total_requests,
       COUNT(CASE WHEN aku.created_at > NOW() - INTERVAL '30 days' THEN 1 END) as requests_this_month,
       AVG(aku.response_time) as average_response_time
     FROM api_keys ak
     LEFT JOIN api_key_usage aku ON ak.id = aku.api_key_id
     WHERE ak.user_id = $1
     GROUP BY ak.id
     ORDER BY ak.created_at DESC`, [userId]);
    return result.rows.map(mapRowToApiKeyWithStats);
}
/**
 * Get a specific API key by ID
 */
async function getApiKeyById(keyId, userId) {
    const result = await database_1.default.query('SELECT * FROM api_keys WHERE id = $1 AND user_id = $2', [keyId, userId]);
    if (result.rows.length === 0) {
        return null;
    }
    return mapRowToApiKey(result.rows[0]);
}
/**
 * Validate an API key and return the key record if valid
 */
async function validateApiKey(key) {
    if (!key.startsWith(API_KEY_PREFIX)) {
        return null;
    }
    const keyHash = hashApiKey(key);
    const result = await database_1.default.query(`SELECT * FROM api_keys
     WHERE key_hash = $1
     AND status = 'active'
     AND (expires_at IS NULL OR expires_at > NOW())`, [keyHash]);
    if (result.rows.length === 0) {
        return null;
    }
    // Update last used timestamp
    await database_1.default.query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [result.rows[0].id]);
    return mapRowToApiKey(result.rows[0]);
}
/**
 * Check if an API key has the required scope
 */
function hasScope(apiKey, requiredScope) {
    // Admin scope has access to everything
    if (apiKey.scopes.includes('admin')) {
        return true;
    }
    return apiKey.scopes.includes(requiredScope);
}
/**
 * Check if an API key has any of the required scopes
 */
function hasAnyScope(apiKey, requiredScopes) {
    if (apiKey.scopes.includes('admin')) {
        return true;
    }
    return requiredScopes.some((scope) => apiKey.scopes.includes(scope));
}
/**
 * Update an API key
 */
async function updateApiKey(keyId, userId, data) {
    const updates = [];
    const values = [];
    let paramIndex = 1;
    if (data.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(data.name);
    }
    if (data.scopes !== undefined) {
        updates.push(`scopes = $${paramIndex++}`);
        values.push(JSON.stringify(data.scopes));
    }
    if (data.status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        values.push(data.status);
    }
    if (updates.length === 0) {
        return getApiKeyById(keyId, userId);
    }
    updates.push(`updated_at = NOW()`);
    values.push(keyId, userId);
    const result = await database_1.default.query(`UPDATE api_keys
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
     RETURNING *`, values);
    if (result.rows.length === 0) {
        return null;
    }
    return mapRowToApiKey(result.rows[0]);
}
/**
 * Revoke an API key
 */
async function revokeApiKey(keyId, userId) {
    const result = await database_1.default.query(`UPDATE api_keys
     SET status = 'revoked', updated_at = NOW()
     WHERE id = $1 AND user_id = $2 AND status = 'active'
     RETURNING id`, [keyId, userId]);
    return (result.rowCount ?? 0) > 0;
}
/**
 * Delete an API key
 */
async function deleteApiKey(keyId, userId) {
    // First delete usage records
    await database_1.default.query('DELETE FROM api_key_usage WHERE api_key_id = $1', [keyId]);
    const result = await database_1.default.query('DELETE FROM api_keys WHERE id = $1 AND user_id = $2', [keyId, userId]);
    return (result.rowCount ?? 0) > 0;
}
/**
 * Log API key usage
 */
async function logApiKeyUsage(apiKeyId, endpoint, method, statusCode, responseTime, ipAddress, userAgent) {
    try {
        await database_1.default.query(`INSERT INTO api_key_usage (api_key_id, endpoint, method, status_code, response_time, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`, [apiKeyId, endpoint, method, statusCode, responseTime, ipAddress || null, userAgent || null]);
    }
    catch (error) {
        // Don't let logging failures affect the request
        logger_1.logger.error('Failed to log API key usage', { apiKeyId, error });
    }
}
/**
 * Get API key usage history
 */
async function getApiKeyUsage(keyId, userId, limit = 100) {
    // First verify the key belongs to the user
    const key = await getApiKeyById(keyId, userId);
    if (!key) {
        return [];
    }
    const result = await database_1.default.query(`SELECT * FROM api_key_usage
     WHERE api_key_id = $1
     ORDER BY created_at DESC
     LIMIT $2`, [keyId, limit]);
    return result.rows.map((row) => ({
        id: row.id,
        apiKeyId: row.api_key_id,
        endpoint: row.endpoint,
        method: row.method,
        statusCode: row.status_code,
        responseTime: row.response_time,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        createdAt: new Date(row.created_at),
    }));
}
/**
 * Get available API scopes
 */
function getAvailableScopes() {
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
        { scope: 'admin', name: 'Full Access', description: 'Complete API access (use with caution)' },
    ];
}
/**
 * Clean up expired API keys
 */
async function cleanupExpiredKeys() {
    const result = await database_1.default.query(`UPDATE api_keys
     SET status = 'expired', updated_at = NOW()
     WHERE status = 'active'
     AND expires_at IS NOT NULL
     AND expires_at < NOW()`);
    return result.rowCount ?? 0;
}
/**
 * Map database row to ApiKey
 */
function mapRowToApiKey(row) {
    return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        keyPrefix: row.key_prefix,
        keyHash: row.key_hash,
        scopes: (typeof row.scopes === 'string' ? JSON.parse(row.scopes) : row.scopes),
        status: row.status,
        expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
        lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}
/**
 * Map database row to ApiKeyWithStats (excludes keyHash)
 */
function mapRowToApiKeyWithStats(row) {
    return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        keyPrefix: row.key_prefix,
        scopes: (typeof row.scopes === 'string' ? JSON.parse(row.scopes) : row.scopes),
        status: row.status,
        expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
        lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        totalRequests: parseInt(row.total_requests) || 0,
        requestsThisMonth: parseInt(row.requests_this_month) || 0,
        averageResponseTime: parseFloat(row.average_response_time) || 0,
    };
}
exports.default = {
    createApiKey,
    getApiKeys,
    getApiKeyById,
    validateApiKey,
    hasScope,
    hasAnyScope,
    updateApiKey,
    revokeApiKey,
    deleteApiKey,
    logApiKeyUsage,
    getApiKeyUsage,
    getAvailableScopes,
    cleanupExpiredKeys,
};
//# sourceMappingURL=apiKeyService.js.map