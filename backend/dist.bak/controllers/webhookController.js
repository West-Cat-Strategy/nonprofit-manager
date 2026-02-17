"use strict";
/**
 * Webhook Controller
 * HTTP handlers for webhook and API key management
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
exports.getAvailableScopes = exports.getApiKeyUsage = exports.deleteApiKey = exports.revokeApiKey = exports.updateApiKey = exports.getApiKey = exports.createApiKey = exports.getApiKeys = exports.getAvailableWebhookEvents = exports.testWebhookEndpoint = exports.getWebhookDeliveries = exports.regenerateWebhookSecret = exports.deleteWebhookEndpoint = exports.updateWebhookEndpoint = exports.getWebhookEndpoint = exports.createWebhookEndpoint = exports.getWebhookEndpoints = void 0;
const logger_1 = require("../config/logger");
const webhookService = __importStar(require("../services/webhookService"));
const apiKeyService = __importStar(require("../services/apiKeyService"));
const constants_1 = require("../config/constants");
// ==================== Webhook Endpoints ====================
/**
 * Get all webhook endpoints for the current user
 */
const getWebhookEndpoints = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const endpoints = await webhookService.getWebhookEndpoints(userId);
        res.json(endpoints);
    }
    catch (error) {
        logger_1.logger.error('Error getting webhook endpoints', { error });
        res.status(500).json({ error: 'Failed to get webhook endpoints' });
    }
};
exports.getWebhookEndpoints = getWebhookEndpoints;
/**
 * Create a new webhook endpoint
 */
const createWebhookEndpoint = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const { url, description, events } = req.body;
        if (!url) {
            res.status(400).json({ error: 'URL is required' });
            return;
        }
        if (!events || !Array.isArray(events) || events.length === 0) {
            res.status(400).json({ error: 'At least one event type is required' });
            return;
        }
        // Validate URL format
        try {
            new URL(url);
        }
        catch {
            res.status(400).json({ error: 'Invalid URL format' });
            return;
        }
        // Only allow HTTPS URLs in production
        if (process.env.NODE_ENV === 'production' && !url.startsWith('https://')) {
            res.status(400).json({ error: 'HTTPS URL is required in production' });
            return;
        }
        const urlValidation = await webhookService.validateWebhookUrl(url);
        if (!urlValidation.ok) {
            res.status(400).json({ error: urlValidation.reason || 'Webhook URL is not allowed' });
            return;
        }
        const endpoint = await webhookService.createWebhookEndpoint(userId, {
            url,
            description,
            events,
        });
        res.status(201).json(endpoint);
    }
    catch (error) {
        logger_1.logger.error('Error creating webhook endpoint', { error });
        res.status(500).json({ error: 'Failed to create webhook endpoint' });
    }
};
exports.createWebhookEndpoint = createWebhookEndpoint;
/**
 * Get a specific webhook endpoint
 */
const getWebhookEndpoint = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const { id } = req.params;
        const endpoint = await webhookService.getWebhookEndpoint(id, userId);
        if (!endpoint) {
            res.status(404).json({ error: 'Webhook endpoint not found' });
            return;
        }
        res.json(endpoint);
    }
    catch (error) {
        logger_1.logger.error('Error getting webhook endpoint', { error });
        res.status(500).json({ error: 'Failed to get webhook endpoint' });
    }
};
exports.getWebhookEndpoint = getWebhookEndpoint;
/**
 * Update a webhook endpoint
 */
const updateWebhookEndpoint = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const { id } = req.params;
        const data = req.body;
        // Validate URL if provided
        if (data.url) {
            try {
                new URL(data.url);
            }
            catch {
                res.status(400).json({ error: 'Invalid URL format' });
                return;
            }
            if (process.env.NODE_ENV === 'production' && !data.url.startsWith('https://')) {
                res.status(400).json({ error: 'HTTPS URL is required in production' });
                return;
            }
            const urlValidation = await webhookService.validateWebhookUrl(data.url);
            if (!urlValidation.ok) {
                res.status(400).json({ error: urlValidation.reason || 'Webhook URL is not allowed' });
                return;
            }
        }
        const endpoint = await webhookService.updateWebhookEndpoint(id, userId, data);
        if (!endpoint) {
            res.status(404).json({ error: 'Webhook endpoint not found' });
            return;
        }
        res.json(endpoint);
    }
    catch (error) {
        logger_1.logger.error('Error updating webhook endpoint', { error });
        res.status(500).json({ error: 'Failed to update webhook endpoint' });
    }
};
exports.updateWebhookEndpoint = updateWebhookEndpoint;
/**
 * Delete a webhook endpoint
 */
const deleteWebhookEndpoint = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const { id } = req.params;
        const deleted = await webhookService.deleteWebhookEndpoint(id, userId);
        if (!deleted) {
            res.status(404).json({ error: 'Webhook endpoint not found' });
            return;
        }
        res.status(204).send();
    }
    catch (error) {
        logger_1.logger.error('Error deleting webhook endpoint', { error });
        res.status(500).json({ error: 'Failed to delete webhook endpoint' });
    }
};
exports.deleteWebhookEndpoint = deleteWebhookEndpoint;
/**
 * Regenerate webhook secret
 */
const regenerateWebhookSecret = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const { id } = req.params;
        const secret = await webhookService.regenerateWebhookSecret(id, userId);
        if (!secret) {
            res.status(404).json({ error: 'Webhook endpoint not found' });
            return;
        }
        res.json({ secret });
    }
    catch (error) {
        logger_1.logger.error('Error regenerating webhook secret', { error });
        res.status(500).json({ error: 'Failed to regenerate webhook secret' });
    }
};
exports.regenerateWebhookSecret = regenerateWebhookSecret;
/**
 * Get webhook deliveries for an endpoint
 */
const getWebhookDeliveries = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const { id } = req.params;
        const limit = parseInt(req.query.limit) || constants_1.PAGINATION.WEBHOOK_DEFAULT_LIMIT;
        const deliveries = await webhookService.getWebhookDeliveries(id, userId, limit);
        res.json(deliveries);
    }
    catch (error) {
        logger_1.logger.error('Error getting webhook deliveries', { error });
        res.status(500).json({ error: 'Failed to get webhook deliveries' });
    }
};
exports.getWebhookDeliveries = getWebhookDeliveries;
/**
 * Test a webhook endpoint
 */
const testWebhookEndpoint = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const { id } = req.params;
        const result = await webhookService.testWebhookEndpoint(id, userId);
        res.json(result);
    }
    catch (error) {
        logger_1.logger.error('Error testing webhook endpoint', { error });
        res.status(500).json({ error: 'Failed to test webhook endpoint' });
    }
};
exports.testWebhookEndpoint = testWebhookEndpoint;
/**
 * Get available webhook events
 */
const getAvailableWebhookEvents = async (_req, res) => {
    try {
        const events = webhookService.getAvailableWebhookEvents();
        res.json(events);
    }
    catch (error) {
        logger_1.logger.error('Error getting available webhook events', { error });
        res.status(500).json({ error: 'Failed to get available webhook events' });
    }
};
exports.getAvailableWebhookEvents = getAvailableWebhookEvents;
// ==================== API Keys ====================
/**
 * Get all API keys for the current user
 */
const getApiKeys = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const keys = await apiKeyService.getApiKeys(userId);
        res.json(keys);
    }
    catch (error) {
        logger_1.logger.error('Error getting API keys', { error });
        res.status(500).json({ error: 'Failed to get API keys' });
    }
};
exports.getApiKeys = getApiKeys;
/**
 * Create a new API key
 */
const createApiKey = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const { name, scopes, expiresAt } = req.body;
        if (!name) {
            res.status(400).json({ error: 'API key name is required' });
            return;
        }
        if (!scopes || !Array.isArray(scopes) || scopes.length === 0) {
            res.status(400).json({ error: 'At least one scope is required' });
            return;
        }
        const key = await apiKeyService.createApiKey(userId, {
            name,
            scopes,
            expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        });
        res.status(201).json(key);
    }
    catch (error) {
        logger_1.logger.error('Error creating API key', { error });
        res.status(500).json({ error: 'Failed to create API key' });
    }
};
exports.createApiKey = createApiKey;
/**
 * Get a specific API key
 */
const getApiKey = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const { id } = req.params;
        const key = await apiKeyService.getApiKeyById(id, userId);
        if (!key) {
            res.status(404).json({ error: 'API key not found' });
            return;
        }
        // Don't return the hash
        // Omit keyHash from response
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { keyHash: _hash, ...safeKey } = key;
        res.json(safeKey);
    }
    catch (error) {
        logger_1.logger.error('Error getting API key', { error });
        res.status(500).json({ error: 'Failed to get API key' });
    }
};
exports.getApiKey = getApiKey;
/**
 * Update an API key
 */
const updateApiKey = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const { id } = req.params;
        const data = req.body;
        const key = await apiKeyService.updateApiKey(id, userId, data);
        if (!key) {
            res.status(404).json({ error: 'API key not found' });
            return;
        }
        // Don't return the hash
        // Omit keyHash from response
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { keyHash: _hash, ...safeKey } = key;
        res.json(safeKey);
    }
    catch (error) {
        logger_1.logger.error('Error updating API key', { error });
        res.status(500).json({ error: 'Failed to update API key' });
    }
};
exports.updateApiKey = updateApiKey;
/**
 * Revoke an API key
 */
const revokeApiKey = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const { id } = req.params;
        const revoked = await apiKeyService.revokeApiKey(id, userId);
        if (!revoked) {
            res.status(404).json({ error: 'API key not found or already revoked' });
            return;
        }
        res.json({ success: true, message: 'API key revoked' });
    }
    catch (error) {
        logger_1.logger.error('Error revoking API key', { error });
        res.status(500).json({ error: 'Failed to revoke API key' });
    }
};
exports.revokeApiKey = revokeApiKey;
/**
 * Delete an API key
 */
const deleteApiKey = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const { id } = req.params;
        const deleted = await apiKeyService.deleteApiKey(id, userId);
        if (!deleted) {
            res.status(404).json({ error: 'API key not found' });
            return;
        }
        res.status(204).send();
    }
    catch (error) {
        logger_1.logger.error('Error deleting API key', { error });
        res.status(500).json({ error: 'Failed to delete API key' });
    }
};
exports.deleteApiKey = deleteApiKey;
/**
 * Get API key usage history
 */
const getApiKeyUsage = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const { id } = req.params;
        const limit = parseInt(req.query.limit) || constants_1.PAGINATION.WEBHOOK_DELIVERY_DEFAULT_LIMIT;
        const usage = await apiKeyService.getApiKeyUsage(id, userId, limit);
        res.json(usage);
    }
    catch (error) {
        logger_1.logger.error('Error getting API key usage', { error });
        res.status(500).json({ error: 'Failed to get API key usage' });
    }
};
exports.getApiKeyUsage = getApiKeyUsage;
/**
 * Get available API scopes
 */
const getAvailableScopes = async (_req, res) => {
    try {
        const scopes = apiKeyService.getAvailableScopes();
        res.json(scopes);
    }
    catch (error) {
        logger_1.logger.error('Error getting available scopes', { error });
        res.status(500).json({ error: 'Failed to get available scopes' });
    }
};
exports.getAvailableScopes = getAvailableScopes;
exports.default = {
    // Webhooks
    getWebhookEndpoints: exports.getWebhookEndpoints,
    createWebhookEndpoint: exports.createWebhookEndpoint,
    getWebhookEndpoint: exports.getWebhookEndpoint,
    updateWebhookEndpoint: exports.updateWebhookEndpoint,
    deleteWebhookEndpoint: exports.deleteWebhookEndpoint,
    regenerateWebhookSecret: exports.regenerateWebhookSecret,
    getWebhookDeliveries: exports.getWebhookDeliveries,
    testWebhookEndpoint: exports.testWebhookEndpoint,
    getAvailableWebhookEvents: exports.getAvailableWebhookEvents,
    // API Keys
    getApiKeys: exports.getApiKeys,
    createApiKey: exports.createApiKey,
    getApiKey: exports.getApiKey,
    updateApiKey: exports.updateApiKey,
    revokeApiKey: exports.revokeApiKey,
    deleteApiKey: exports.deleteApiKey,
    getApiKeyUsage: exports.getApiKeyUsage,
    getAvailableScopes: exports.getAvailableScopes,
};
//# sourceMappingURL=webhookController.js.map