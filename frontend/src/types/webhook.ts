/**
 * Webhook and API Key Types for Frontend
 * Type definitions for external integrations UI
 */

/**
 * Supported webhook event types
 */
export type WebhookEventType =
  | 'contact.created'
  | 'contact.updated'
  | 'contact.deleted'
  | 'donation.created'
  | 'donation.updated'
  | 'donation.deleted'
  | 'event.created'
  | 'event.updated'
  | 'event.deleted'
  | 'event.registration.created'
  | 'event.registration.canceled'
  | 'volunteer.created'
  | 'volunteer.updated'
  | 'volunteer.hours_logged'
  | 'task.created'
  | 'task.completed'
  | 'task.overdue'
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
 * API key scope
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
 * Webhook endpoint
 */
export interface WebhookEndpoint {
  id: string;
  url: string;
  description?: string;
  secret: string;
  events: WebhookEventType[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastDeliveryAt?: string;
  lastDeliveryStatus?: WebhookDeliveryStatus;
  totalDeliveries?: number;
  successfulDeliveries?: number;
  failedDeliveries?: number;
  successRate?: number;
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
  nextRetryAt?: string;
  createdAt: string;
  deliveredAt?: string;
}

/**
 * API key
 */
export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: ApiKeyScope[];
  status: ApiKeyStatus;
  expiresAt?: string;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
  totalRequests?: number;
  requestsThisMonth?: number;
  averageResponseTime?: number;
}

/**
 * Create API key request
 */
export interface CreateApiKeyRequest {
  name: string;
  scopes: ApiKeyScope[];
  expiresAt?: string;
}

/**
 * Create API key response (includes plain key)
 */
export interface CreateApiKeyResponse extends ApiKey {
  key: string;
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
  createdAt: string;
}

/**
 * Webhook event info
 */
export interface WebhookEventInfo {
  type: WebhookEventType;
  name: string;
  description: string;
  category: string;
}

/**
 * API scope info
 */
export interface ApiScopeInfo {
  scope: ApiKeyScope;
  name: string;
  description: string;
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

/**
 * Webhook state for Redux
 */
export interface WebhookState {
  endpoints: WebhookEndpoint[];
  selectedEndpoint: WebhookEndpoint | null;
  deliveries: WebhookDelivery[];
  availableEvents: WebhookEventInfo[];
  apiKeys: ApiKey[];
  selectedApiKey: ApiKey | null;
  apiKeyUsage: ApiKeyUsage[];
  availableScopes: ApiScopeInfo[];
  newApiKey: CreateApiKeyResponse | null;
  testResult: WebhookTestResponse | null;
  isLoading: boolean;
  isTesting: boolean;
  error: string | null;
}
