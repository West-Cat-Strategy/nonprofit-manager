"use strict";
/**
 * Webhook and API Key Routes
 * Express routes for external integration management
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const validation_1 = require("../middleware/validation");
const auth_1 = require("../middleware/auth");
const webhookController = __importStar(require("../controllers/webhookController"));
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
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
router.post('/endpoints', [
    (0, express_validator_1.body)('url')
        .notEmpty()
        .withMessage('URL is required')
        .isURL({ protocols: ['http', 'https'], require_protocol: true })
        .withMessage('Invalid URL format'),
    (0, express_validator_1.body)('description')
        .optional()
        .isString()
        .isLength({ max: 500 })
        .withMessage('Description must be less than 500 characters'),
    (0, express_validator_1.body)('events')
        .isArray({ min: 1 })
        .withMessage('At least one event type is required'),
    (0, express_validator_1.body)('events.*')
        .isString()
        .withMessage('Event types must be strings'),
], validation_1.handleValidationErrors, webhookController.createWebhookEndpoint);
/**
 * GET /api/webhooks/endpoints/:id
 * Get a specific webhook endpoint
 */
router.get('/endpoints/:id', [(0, express_validator_1.param)('id').isUUID().withMessage('Invalid endpoint ID')], validation_1.handleValidationErrors, webhookController.getWebhookEndpoint);
/**
 * PUT /api/webhooks/endpoints/:id
 * Update a webhook endpoint
 */
router.put('/endpoints/:id', [
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid endpoint ID'),
    (0, express_validator_1.body)('url')
        .optional()
        .isURL({ protocols: ['http', 'https'], require_protocol: true })
        .withMessage('Invalid URL format'),
    (0, express_validator_1.body)('description')
        .optional()
        .isString()
        .isLength({ max: 500 })
        .withMessage('Description must be less than 500 characters'),
    (0, express_validator_1.body)('events')
        .optional()
        .isArray({ min: 1 })
        .withMessage('At least one event type is required'),
    (0, express_validator_1.body)('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive must be a boolean'),
], validation_1.handleValidationErrors, webhookController.updateWebhookEndpoint);
/**
 * DELETE /api/webhooks/endpoints/:id
 * Delete a webhook endpoint
 */
router.delete('/endpoints/:id', [(0, express_validator_1.param)('id').isUUID().withMessage('Invalid endpoint ID')], validation_1.handleValidationErrors, webhookController.deleteWebhookEndpoint);
/**
 * POST /api/webhooks/endpoints/:id/regenerate-secret
 * Regenerate the webhook secret
 */
router.post('/endpoints/:id/regenerate-secret', [(0, express_validator_1.param)('id').isUUID().withMessage('Invalid endpoint ID')], validation_1.handleValidationErrors, webhookController.regenerateWebhookSecret);
/**
 * GET /api/webhooks/endpoints/:id/deliveries
 * Get delivery history for a webhook endpoint
 */
router.get('/endpoints/:id/deliveries', [
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid endpoint ID'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
], validation_1.handleValidationErrors, webhookController.getWebhookDeliveries);
/**
 * POST /api/webhooks/endpoints/:id/test
 * Send a test webhook to the endpoint
 */
router.post('/endpoints/:id/test', [(0, express_validator_1.param)('id').isUUID().withMessage('Invalid endpoint ID')], validation_1.handleValidationErrors, webhookController.testWebhookEndpoint);
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
router.post('/api-keys', [
    (0, express_validator_1.body)('name')
        .notEmpty()
        .withMessage('API key name is required')
        .isString()
        .isLength({ min: 1, max: 100 })
        .withMessage('Name must be between 1 and 100 characters'),
    (0, express_validator_1.body)('scopes')
        .isArray({ min: 1 })
        .withMessage('At least one scope is required'),
    (0, express_validator_1.body)('scopes.*')
        .isString()
        .withMessage('Scopes must be strings'),
    (0, express_validator_1.body)('expiresAt')
        .optional()
        .isISO8601()
        .withMessage('Invalid expiration date format'),
], validation_1.handleValidationErrors, webhookController.createApiKey);
/**
 * GET /api/webhooks/api-keys/:id
 * Get a specific API key
 */
router.get('/api-keys/:id', [(0, express_validator_1.param)('id').isUUID().withMessage('Invalid API key ID')], validation_1.handleValidationErrors, webhookController.getApiKey);
/**
 * PUT /api/webhooks/api-keys/:id
 * Update an API key
 */
router.put('/api-keys/:id', [
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid API key ID'),
    (0, express_validator_1.body)('name')
        .optional()
        .isString()
        .isLength({ min: 1, max: 100 })
        .withMessage('Name must be between 1 and 100 characters'),
    (0, express_validator_1.body)('scopes')
        .optional()
        .isArray({ min: 1 })
        .withMessage('At least one scope is required'),
    (0, express_validator_1.body)('status')
        .optional()
        .isIn(['active', 'revoked'])
        .withMessage('Invalid status'),
], validation_1.handleValidationErrors, webhookController.updateApiKey);
/**
 * POST /api/webhooks/api-keys/:id/revoke
 * Revoke an API key
 */
router.post('/api-keys/:id/revoke', [(0, express_validator_1.param)('id').isUUID().withMessage('Invalid API key ID')], validation_1.handleValidationErrors, webhookController.revokeApiKey);
/**
 * DELETE /api/webhooks/api-keys/:id
 * Delete an API key
 */
router.delete('/api-keys/:id', [(0, express_validator_1.param)('id').isUUID().withMessage('Invalid API key ID')], validation_1.handleValidationErrors, webhookController.deleteApiKey);
/**
 * GET /api/webhooks/api-keys/:id/usage
 * Get usage history for an API key
 */
router.get('/api-keys/:id/usage', [
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid API key ID'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 500 })
        .withMessage('Limit must be between 1 and 500'),
], validation_1.handleValidationErrors, webhookController.getApiKeyUsage);
exports.default = router;
//# sourceMappingURL=webhooks.js.map