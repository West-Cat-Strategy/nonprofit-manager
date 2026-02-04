/**
 * Webhook and API Key Types
 * Type definitions for external integrations and API access
 */
/**
 * Supported webhook event types
 */
export type WebhookEventType = 'contact.created' | 'contact.updated' | 'contact.deleted' | 'donation.created' | 'donation.updated' | 'donation.deleted' | 'event.created' | 'event.updated' | 'event.deleted' | 'event.registration.created' | 'event.registration.canceled' | 'volunteer.created' | 'volunteer.updated' | 'volunteer.hours_logged' | 'task.created' | 'task.completed' | 'task.overdue' | 'payment.succeeded' | 'payment.failed' | 'payment.refunded';
/**
 * Webhook delivery status
 */
export type WebhookDeliveryStatus = 'pending' | 'success' | 'failed' | 'retrying';
/**
 * API key status
 */
export type ApiKeyStatus = 'active' | 'revoked' | 'expired';
/**
 * API key scope/permissions
 */
export type ApiKeyScope = 'read:contacts' | 'write:contacts' | 'read:donations' | 'write:donations' | 'read:events' | 'write:events' | 'read:volunteers' | 'write:volunteers' | 'read:tasks' | 'write:tasks' | 'read:reports' | 'read:analytics' | 'admin';
/**
 * Webhook endpoint configuration
 */
export interface WebhookEndpoint {
    id: string;
    userId: string;
    url: string;
    description?: string;
    secret: string;
    events: WebhookEventType[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    lastDeliveryAt?: Date;
    lastDeliveryStatus?: WebhookDeliveryStatus;
}
/**
 * Create webhook endpoint request
 */
export interface CreateWebhookEndpointRequest {
    url: string;
    description?: string;
    events: WebhookEventType[];
}
/**
 * Update webhook endpoint request
 */
export interface UpdateWebhookEndpointRequest {
    url?: string;
    description?: string;
    events?: WebhookEventType[];
    isActive?: boolean;
}
/**
 * Webhook delivery record
 */
export interface WebhookDelivery {
    id: string;
    webhookEndpointId: string;
    eventType: WebhookEventType;
    payload: Record<string, unknown>;
    responseStatus?: number;
    responseBody?: string;
    status: WebhookDeliveryStatus;
    attempts: number;
    nextRetryAt?: Date;
    createdAt: Date;
    deliveredAt?: Date;
}
/**
 * Webhook payload structure
 */
export interface WebhookPayload {
    id: string;
    type: WebhookEventType;
    createdAt: string;
    data: {
        object: Record<string, unknown>;
        previousAttributes?: Record<string, unknown>;
    };
}
/**
 * API key record
 */
export interface ApiKey {
    id: string;
    userId: string;
    name: string;
    keyPrefix: string;
    keyHash: string;
    scopes: ApiKeyScope[];
    status: ApiKeyStatus;
    expiresAt?: Date;
    lastUsedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Create API key request
 */
export interface CreateApiKeyRequest {
    name: string;
    scopes: ApiKeyScope[];
    expiresAt?: Date;
}
/**
 * Create API key response (includes the plain key - only shown once)
 */
export interface CreateApiKeyResponse {
    id: string;
    name: string;
    key: string;
    keyPrefix: string;
    scopes: ApiKeyScope[];
    expiresAt?: Date;
    createdAt: Date;
}
/**
 * Update API key request
 */
export interface UpdateApiKeyRequest {
    name?: string;
    scopes?: ApiKeyScope[];
    status?: ApiKeyStatus;
}
/**
 * API key usage record
 */
export interface ApiKeyUsage {
    id: string;
    apiKeyId: string;
    endpoint: string;
    method: string;
    statusCode: number;
    responseTime: number;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
}
/**
 * Webhook endpoint with delivery stats
 */
export interface WebhookEndpointWithStats extends WebhookEndpoint {
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    successRate: number;
}
/**
 * API key with usage stats
 */
export interface ApiKeyWithStats extends Omit<ApiKey, 'keyHash'> {
    totalRequests: number;
    requestsThisMonth: number;
    averageResponseTime: number;
}
/**
 * Available webhook events for UI
 */
export interface WebhookEventInfo {
    type: WebhookEventType;
    name: string;
    description: string;
    category: 'contact' | 'donation' | 'event' | 'volunteer' | 'task' | 'payment';
}
/**
 * Webhook test request
 */
export interface WebhookTestRequest {
    webhookEndpointId: string;
}
/**
 * Webhook test response
 */
export interface WebhookTestResponse {
    success: boolean;
    statusCode?: number;
    responseTime?: number;
    error?: string;
}
//# sourceMappingURL=webhook.d.ts.map