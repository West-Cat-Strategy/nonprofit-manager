/**
 * Webhook and API Key Types
 * Type definitions for external integrations and API access
 */

/**
 * Supported webhook event types
 */
export type WebhookEventType =
  // Contact events
  | 'contact.created'
  | 'contact.updated'
  | 'contact.deleted'
  // Donation events
  | 'donation.created'
  | 'donation.updated'
  | 'donation.deleted'
  // Event events
  | 'event.created'
  | 'event.updated'
  | 'event.deleted'
  | 'event.registration.created'
  | 'event.registration.canceled'
  // Volunteer events
  | 'volunteer.created'
  | 'volunteer.updated'
  | 'volunteer.hours_logged'
  // Task events
  | 'task.created'
  | 'task.completed'
  | 'task.overdue'
  // Payment events
  | 'payment.succeeded'
  | 'payment.failed'
  | 'payment.refunded';

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
export type ApiKeyScope =
  | 'read:contacts'
  | 'write:contacts'
  | 'read:donations'
  | 'write:donations'
  | 'read:events'
  | 'write:events'
  | 'read:volunteers'
  | 'write:volunteers'
  | 'read:tasks'
  | 'write:tasks'
  | 'read:reports'
  | 'read:analytics'
  | 'admin';

/**
 * Webhook endpoint configuration
 */
export interface WebhookEndpoint {
  id: string;
  userId: string;
  url: string;
  description?: string;
  secret: string; // Used to sign webhook payloads
  events: WebhookEventType[]; // Events this endpoint subscribes to
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
  id: string; // Unique event ID
  type: WebhookEventType;
  createdAt: string; // ISO timestamp
  data: {
    object: Record<string, unknown>;
    previousAttributes?: Record<string, unknown>; // For update events
  };
}

/**
 * API key record
 */
export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  keyPrefix: string; // First 8 chars of the key for identification
  keyHash: string; // Hashed key for verification
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
  expiresAt?: Date; // Optional expiration
}

/**
 * Create API key response (includes the plain key - only shown once)
 */
export interface CreateApiKeyResponse {
  id: string;
  name: string;
  key: string; // The actual API key - only returned on creation
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
  responseTime: number; // in ms
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
