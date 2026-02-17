/**
 * Webhook Service
 * Handles outgoing webhook delivery and management
 */
import type { WebhookEndpoint, WebhookDelivery, WebhookEventType, CreateWebhookEndpointRequest, UpdateWebhookEndpointRequest, WebhookEndpointWithStats, WebhookTestResponse } from '../types/webhook';
export declare function validateWebhookUrl(url: string): Promise<{
    ok: boolean;
    reason?: string;
}>;
/**
 * Create a new webhook endpoint
 */
export declare function createWebhookEndpoint(userId: string, data: CreateWebhookEndpointRequest): Promise<WebhookEndpoint>;
/**
 * Get all webhook endpoints for a user
 */
export declare function getWebhookEndpoints(userId: string): Promise<WebhookEndpointWithStats[]>;
/**
 * Get a specific webhook endpoint
 */
export declare function getWebhookEndpoint(endpointId: string, userId: string): Promise<WebhookEndpoint | null>;
/**
 * Update a webhook endpoint
 */
export declare function updateWebhookEndpoint(endpointId: string, userId: string, data: UpdateWebhookEndpointRequest): Promise<WebhookEndpoint | null>;
/**
 * Delete a webhook endpoint
 */
export declare function deleteWebhookEndpoint(endpointId: string, userId: string): Promise<boolean>;
/**
 * Regenerate webhook secret
 */
export declare function regenerateWebhookSecret(endpointId: string, userId: string): Promise<string | null>;
/**
 * Get webhook deliveries for an endpoint
 */
export declare function getWebhookDeliveries(endpointId: string, userId: string, limit?: number): Promise<WebhookDelivery[]>;
/**
 * Trigger webhooks for an event
 * This should be called when events occur in the system
 */
export declare function triggerWebhooks(eventType: WebhookEventType, data: Record<string, unknown>, previousAttributes?: Record<string, unknown>): Promise<void>;
/**
 * Process pending retries (should be called by a scheduler)
 */
export declare function processRetries(): Promise<number>;
/**
 * Test a webhook endpoint with a test payload
 */
export declare function testWebhookEndpoint(endpointId: string, userId: string): Promise<WebhookTestResponse>;
/**
 * Get available webhook events
 */
export declare function getAvailableWebhookEvents(): {
    type: string;
    name: string;
    description: string;
    category: string;
}[];
declare const _default: {
    createWebhookEndpoint: typeof createWebhookEndpoint;
    getWebhookEndpoints: typeof getWebhookEndpoints;
    getWebhookEndpoint: typeof getWebhookEndpoint;
    updateWebhookEndpoint: typeof updateWebhookEndpoint;
    deleteWebhookEndpoint: typeof deleteWebhookEndpoint;
    regenerateWebhookSecret: typeof regenerateWebhookSecret;
    getWebhookDeliveries: typeof getWebhookDeliveries;
    triggerWebhooks: typeof triggerWebhooks;
    processRetries: typeof processRetries;
    testWebhookEndpoint: typeof testWebhookEndpoint;
    getAvailableWebhookEvents: typeof getAvailableWebhookEvents;
};
export default _default;
//# sourceMappingURL=webhookService.d.ts.map