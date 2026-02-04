/**
 * API Key Service
 * Handles API key generation, validation, and management
 */
import type { ApiKey, ApiKeyScope, CreateApiKeyRequest, CreateApiKeyResponse, UpdateApiKeyRequest, ApiKeyWithStats, ApiKeyUsage } from '../types/webhook';
/**
 * Create a new API key
 */
export declare function createApiKey(userId: string, data: CreateApiKeyRequest): Promise<CreateApiKeyResponse>;
/**
 * Get all API keys for a user (without the actual key)
 */
export declare function getApiKeys(userId: string): Promise<ApiKeyWithStats[]>;
/**
 * Get a specific API key by ID
 */
export declare function getApiKeyById(keyId: string, userId: string): Promise<ApiKey | null>;
/**
 * Validate an API key and return the key record if valid
 */
export declare function validateApiKey(key: string): Promise<ApiKey | null>;
/**
 * Check if an API key has the required scope
 */
export declare function hasScope(apiKey: ApiKey, requiredScope: ApiKeyScope): boolean;
/**
 * Check if an API key has any of the required scopes
 */
export declare function hasAnyScope(apiKey: ApiKey, requiredScopes: ApiKeyScope[]): boolean;
/**
 * Update an API key
 */
export declare function updateApiKey(keyId: string, userId: string, data: UpdateApiKeyRequest): Promise<ApiKey | null>;
/**
 * Revoke an API key
 */
export declare function revokeApiKey(keyId: string, userId: string): Promise<boolean>;
/**
 * Delete an API key
 */
export declare function deleteApiKey(keyId: string, userId: string): Promise<boolean>;
/**
 * Log API key usage
 */
export declare function logApiKeyUsage(apiKeyId: string, endpoint: string, method: string, statusCode: number, responseTime: number, ipAddress?: string, userAgent?: string): Promise<void>;
/**
 * Get API key usage history
 */
export declare function getApiKeyUsage(keyId: string, userId: string, limit?: number): Promise<ApiKeyUsage[]>;
/**
 * Get available API scopes
 */
export declare function getAvailableScopes(): {
    scope: string;
    name: string;
    description: string;
}[];
/**
 * Clean up expired API keys
 */
export declare function cleanupExpiredKeys(): Promise<number>;
declare const _default: {
    createApiKey: typeof createApiKey;
    getApiKeys: typeof getApiKeys;
    getApiKeyById: typeof getApiKeyById;
    validateApiKey: typeof validateApiKey;
    hasScope: typeof hasScope;
    hasAnyScope: typeof hasAnyScope;
    updateApiKey: typeof updateApiKey;
    revokeApiKey: typeof revokeApiKey;
    deleteApiKey: typeof deleteApiKey;
    logApiKeyUsage: typeof logApiKeyUsage;
    getApiKeyUsage: typeof getApiKeyUsage;
    getAvailableScopes: typeof getAvailableScopes;
    cleanupExpiredKeys: typeof cleanupExpiredKeys;
};
export default _default;
//# sourceMappingURL=apiKeyService.d.ts.map