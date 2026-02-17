/**
 * Webhook Controller
 * HTTP handlers for webhook and API key management
 */
import { Response } from 'express';
import type { AuthRequest } from '../middleware/auth';
/**
 * Get all webhook endpoints for the current user
 */
export declare const getWebhookEndpoints: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Create a new webhook endpoint
 */
export declare const createWebhookEndpoint: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Get a specific webhook endpoint
 */
export declare const getWebhookEndpoint: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Update a webhook endpoint
 */
export declare const updateWebhookEndpoint: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Delete a webhook endpoint
 */
export declare const deleteWebhookEndpoint: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Regenerate webhook secret
 */
export declare const regenerateWebhookSecret: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Get webhook deliveries for an endpoint
 */
export declare const getWebhookDeliveries: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Test a webhook endpoint
 */
export declare const testWebhookEndpoint: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Get available webhook events
 */
export declare const getAvailableWebhookEvents: (_req: AuthRequest, res: Response) => Promise<void>;
/**
 * Get all API keys for the current user
 */
export declare const getApiKeys: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Create a new API key
 */
export declare const createApiKey: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Get a specific API key
 */
export declare const getApiKey: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Update an API key
 */
export declare const updateApiKey: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Revoke an API key
 */
export declare const revokeApiKey: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Delete an API key
 */
export declare const deleteApiKey: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Get API key usage history
 */
export declare const getApiKeyUsage: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Get available API scopes
 */
export declare const getAvailableScopes: (_req: AuthRequest, res: Response) => Promise<void>;
declare const _default: {
    getWebhookEndpoints: (req: AuthRequest, res: Response) => Promise<void>;
    createWebhookEndpoint: (req: AuthRequest, res: Response) => Promise<void>;
    getWebhookEndpoint: (req: AuthRequest, res: Response) => Promise<void>;
    updateWebhookEndpoint: (req: AuthRequest, res: Response) => Promise<void>;
    deleteWebhookEndpoint: (req: AuthRequest, res: Response) => Promise<void>;
    regenerateWebhookSecret: (req: AuthRequest, res: Response) => Promise<void>;
    getWebhookDeliveries: (req: AuthRequest, res: Response) => Promise<void>;
    testWebhookEndpoint: (req: AuthRequest, res: Response) => Promise<void>;
    getAvailableWebhookEvents: (_req: AuthRequest, res: Response) => Promise<void>;
    getApiKeys: (req: AuthRequest, res: Response) => Promise<void>;
    createApiKey: (req: AuthRequest, res: Response) => Promise<void>;
    getApiKey: (req: AuthRequest, res: Response) => Promise<void>;
    updateApiKey: (req: AuthRequest, res: Response) => Promise<void>;
    revokeApiKey: (req: AuthRequest, res: Response) => Promise<void>;
    deleteApiKey: (req: AuthRequest, res: Response) => Promise<void>;
    getApiKeyUsage: (req: AuthRequest, res: Response) => Promise<void>;
    getAvailableScopes: (_req: AuthRequest, res: Response) => Promise<void>;
};
export default _default;
//# sourceMappingURL=webhookController.d.ts.map