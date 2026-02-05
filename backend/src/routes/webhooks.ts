/**
 * Webhook and API Key Routes
 * Express routes for external integration management
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import * as webhookController from '../controllers/webhookController';

const router = Router();

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
router.post(
  '/endpoints',
  [
    body('url')
      .notEmpty()
      .withMessage('URL is required')
      .isURL({ protocols: ['http', 'https'], require_protocol: true })
      .withMessage('Invalid URL format'),
    body('description')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    body('events')
      .isArray({ min: 1 })
      .withMessage('At least one event type is required'),
    body('events.*')
      .isString()
      .withMessage('Event types must be strings'),
  ],
  validateRequest,
  webhookController.createWebhookEndpoint
);

/**
 * GET /api/webhooks/endpoints/:id
 * Get a specific webhook endpoint
 */
router.get(
  '/endpoints/:id',
  [param('id').isUUID().withMessage('Invalid endpoint ID')],
  validateRequest,
  webhookController.getWebhookEndpoint
);

/**
 * PUT /api/webhooks/endpoints/:id
 * Update a webhook endpoint
 */
router.put(
  '/endpoints/:id',
  [
    param('id').isUUID().withMessage('Invalid endpoint ID'),
    body('url')
      .optional()
      .isURL({ protocols: ['http', 'https'], require_protocol: true })
      .withMessage('Invalid URL format'),
    body('description')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    body('events')
      .optional()
      .isArray({ min: 1 })
      .withMessage('At least one event type is required'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
  ],
  validateRequest,
  webhookController.updateWebhookEndpoint
);

/**
 * DELETE /api/webhooks/endpoints/:id
 * Delete a webhook endpoint
 */
router.delete(
  '/endpoints/:id',
  [param('id').isUUID().withMessage('Invalid endpoint ID')],
  validateRequest,
  webhookController.deleteWebhookEndpoint
);

/**
 * POST /api/webhooks/endpoints/:id/regenerate-secret
 * Regenerate the webhook secret
 */
router.post(
  '/endpoints/:id/regenerate-secret',
  [param('id').isUUID().withMessage('Invalid endpoint ID')],
  validateRequest,
  webhookController.regenerateWebhookSecret
);

/**
 * GET /api/webhooks/endpoints/:id/deliveries
 * Get delivery history for a webhook endpoint
 */
router.get(
  '/endpoints/:id/deliveries',
  [
    param('id').isUUID().withMessage('Invalid endpoint ID'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ],
  validateRequest,
  webhookController.getWebhookDeliveries
);

/**
 * POST /api/webhooks/endpoints/:id/test
 * Send a test webhook to the endpoint
 */
router.post(
  '/endpoints/:id/test',
  [param('id').isUUID().withMessage('Invalid endpoint ID')],
  validateRequest,
  webhookController.testWebhookEndpoint
);

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
router.post(
  '/api-keys',
  [
    body('name')
      .notEmpty()
      .withMessage('API key name is required')
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Name must be between 1 and 100 characters'),
    body('scopes')
      .isArray({ min: 1 })
      .withMessage('At least one scope is required'),
    body('scopes.*')
      .isString()
      .withMessage('Scopes must be strings'),
    body('expiresAt')
      .optional()
      .isISO8601()
      .withMessage('Invalid expiration date format'),
  ],
  validateRequest,
  webhookController.createApiKey
);

/**
 * GET /api/webhooks/api-keys/:id
 * Get a specific API key
 */
router.get(
  '/api-keys/:id',
  [param('id').isUUID().withMessage('Invalid API key ID')],
  validateRequest,
  webhookController.getApiKey
);

/**
 * PUT /api/webhooks/api-keys/:id
 * Update an API key
 */
router.put(
  '/api-keys/:id',
  [
    param('id').isUUID().withMessage('Invalid API key ID'),
    body('name')
      .optional()
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Name must be between 1 and 100 characters'),
    body('scopes')
      .optional()
      .isArray({ min: 1 })
      .withMessage('At least one scope is required'),
    body('status')
      .optional()
      .isIn(['active', 'revoked'])
      .withMessage('Invalid status'),
  ],
  validateRequest,
  webhookController.updateApiKey
);

/**
 * POST /api/webhooks/api-keys/:id/revoke
 * Revoke an API key
 */
router.post(
  '/api-keys/:id/revoke',
  [param('id').isUUID().withMessage('Invalid API key ID')],
  validateRequest,
  webhookController.revokeApiKey
);

/**
 * DELETE /api/webhooks/api-keys/:id
 * Delete an API key
 */
router.delete(
  '/api-keys/:id',
  [param('id').isUUID().withMessage('Invalid API key ID')],
  validateRequest,
  webhookController.deleteApiKey
);

/**
 * GET /api/webhooks/api-keys/:id/usage
 * Get usage history for an API key
 */
router.get(
  '/api-keys/:id/usage',
  [
    param('id').isUUID().withMessage('Invalid API key ID'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 500 })
      .withMessage('Limit must be between 1 and 500'),
  ],
  validateRequest,
  webhookController.getApiKeyUsage
);

export default router;
