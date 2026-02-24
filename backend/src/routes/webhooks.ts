/**
 * Webhook and API Key Routes
 * Express routes for external integration management
 */

import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@middleware/domains/auth';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import * as webhookController from '@controllers/domains/engagement';
import { uuidSchema } from '@validations/shared';

const router = Router();

const isHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const webhookUrlSchema = z
  .string()
  .url('Invalid URL format')
  .refine((value) => isHttpUrl(value), 'Invalid URL format');

const idParamsSchema = z.object({
  id: uuidSchema,
});

const createWebhookEndpointSchema = z.object({
  url: webhookUrlSchema,
  description: z.string().max(500).optional(),
  events: z.array(z.string()).min(1, 'At least one event type is required'),
});

const updateWebhookEndpointSchema = z.object({
  url: webhookUrlSchema.optional(),
  description: z.string().max(500).optional(),
  events: z.array(z.string()).min(1).optional(),
  isActive: z.coerce.boolean().optional(),
});

const deliveriesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const dateStringSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid expiration date format');

const createApiKeySchema = z.object({
  name: z.string().min(1, 'API key name is required').max(100),
  scopes: z.array(z.string()).min(1, 'At least one scope is required'),
  expiresAt: dateStringSchema.optional(),
});

const updateApiKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  scopes: z.array(z.string()).min(1).optional(),
  status: z.enum(['active', 'revoked']).optional(),
});

const apiKeyUsageQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

// All routes require authentication
router.use(authenticate);

// ==================== Webhook Event Info ====================

/**
 * GET /api/webhooks/events
 * Get available webhook events
 */
router.get('/events', webhookController.getAvailableWebhookEvents);

// ==================== Webhook Endpoints ====================

/**
 * GET /api/webhooks/endpoints
 * Get all webhook endpoints for the current user
 */
router.get('/endpoints', webhookController.getWebhookEndpoints);

/**
 * POST /api/webhooks/endpoints
 * Create a new webhook endpoint
 */
router.post('/endpoints', validateBody(createWebhookEndpointSchema), webhookController.createWebhookEndpoint);

/**
 * GET /api/webhooks/endpoints/:id
 * Get a specific webhook endpoint
 */
router.get('/endpoints/:id', validateParams(idParamsSchema), webhookController.getWebhookEndpoint);

/**
 * PUT /api/webhooks/endpoints/:id
 * Update a webhook endpoint
 */
router.put(
  '/endpoints/:id',
  validateParams(idParamsSchema),
  validateBody(updateWebhookEndpointSchema),
  webhookController.updateWebhookEndpoint
);

/**
 * DELETE /api/webhooks/endpoints/:id
 * Delete a webhook endpoint
 */
router.delete('/endpoints/:id', validateParams(idParamsSchema), webhookController.deleteWebhookEndpoint);

/**
 * POST /api/webhooks/endpoints/:id/regenerate-secret
 * Regenerate the webhook secret
 */
router.post('/endpoints/:id/regenerate-secret', validateParams(idParamsSchema), webhookController.regenerateWebhookSecret);

/**
 * GET /api/webhooks/endpoints/:id/deliveries
 * Get delivery history for a webhook endpoint
 */
router.get(
  '/endpoints/:id/deliveries',
  validateParams(idParamsSchema),
  validateQuery(deliveriesQuerySchema),
  webhookController.getWebhookDeliveries
);

/**
 * POST /api/webhooks/endpoints/:id/test
 * Send a test webhook to the endpoint
 */
router.post('/endpoints/:id/test', validateParams(idParamsSchema), webhookController.testWebhookEndpoint);

// ==================== API Key Info ====================

/**
 * GET /api/webhooks/api-keys/scopes
 * Get available API key scopes
 */
router.get('/api-keys/scopes', webhookController.getAvailableScopes);

// ==================== API Keys ====================

/**
 * GET /api/webhooks/api-keys
 * Get all API keys for the current user
 */
router.get('/api-keys', webhookController.getApiKeys);

/**
 * POST /api/webhooks/api-keys
 * Create a new API key
 */
router.post('/api-keys', validateBody(createApiKeySchema), webhookController.createApiKey);

/**
 * GET /api/webhooks/api-keys/:id
 * Get a specific API key
 */
router.get('/api-keys/:id', validateParams(idParamsSchema), webhookController.getApiKey);

/**
 * PUT /api/webhooks/api-keys/:id
 * Update an API key
 */
router.put('/api-keys/:id', validateParams(idParamsSchema), validateBody(updateApiKeySchema), webhookController.updateApiKey);

/**
 * POST /api/webhooks/api-keys/:id/revoke
 * Revoke an API key
 */
router.post('/api-keys/:id/revoke', validateParams(idParamsSchema), webhookController.revokeApiKey);

/**
 * DELETE /api/webhooks/api-keys/:id
 * Delete an API key
 */
router.delete('/api-keys/:id', validateParams(idParamsSchema), webhookController.deleteApiKey);

/**
 * GET /api/webhooks/api-keys/:id/usage
 * Get usage history for an API key
 */
router.get(
  '/api-keys/:id/usage',
  validateParams(idParamsSchema),
  validateQuery(apiKeyUsageQuerySchema),
  webhookController.getApiKeyUsage
);

export default router;
