/**
 * Webhook Controller
 * HTTP handlers for webhook and API key management
 */

import { Response } from 'express';
import { logger } from '@config/logger';
import { apiKeyService, webhookService } from '@services';
import type { AuthRequest } from '@middleware/auth';
import type {
  CreateWebhookEndpointRequest,
  UpdateWebhookEndpointRequest,
  CreateApiKeyRequest,
  UpdateApiKeyRequest,
} from '@app-types/webhook';
import { PAGINATION } from '@config/constants';
import { badRequest, notFoundMessage, serverError, unauthorized } from '@utils/responseHelpers';

// ==================== Webhook Endpoints ====================

/**
 * Get all webhook endpoints for the current user
 */
export const getWebhookEndpoints = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      unauthorized(res, 'User not authenticated');
      return;
    }

    const endpoints = await webhookService.getWebhookEndpoints(userId);
    res.json(endpoints);
  } catch (error) {
    logger.error('Error getting webhook endpoints', { error });
    serverError(res, 'Failed to get webhook endpoints');
  }
};

/**
 * Create a new webhook endpoint
 */
export const createWebhookEndpoint = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      unauthorized(res, 'User not authenticated');
      return;
    }

    const { url, description, events } = req.body as CreateWebhookEndpointRequest;

    if (!url) {
      badRequest(res, 'URL is required');
      return;
    }

    if (!events || !Array.isArray(events) || events.length === 0) {
      badRequest(res, 'At least one event type is required');
      return;
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      badRequest(res, 'Invalid URL format');
      return;
    }

    // Only allow HTTPS URLs in production
    if (process.env.NODE_ENV === 'production' && !url.startsWith('https://')) {
      badRequest(res, 'HTTPS URL is required in production');
      return;
    }

    const urlValidation = await webhookService.validateWebhookUrl(url);
    if (!urlValidation.ok) {
      badRequest(res, urlValidation.reason || 'Webhook URL is not allowed');
      return;
    }

    const endpoint = await webhookService.createWebhookEndpoint(userId, {
      url,
      description,
      events,
    });

    res.status(201).json(endpoint);
  } catch (error) {
    logger.error('Error creating webhook endpoint', { error });
    serverError(res, 'Failed to create webhook endpoint');
  }
};

/**
 * Get a specific webhook endpoint
 */
export const getWebhookEndpoint = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      unauthorized(res, 'User not authenticated');
      return;
    }

    const { id } = req.params;

    const endpoint = await webhookService.getWebhookEndpoint(id, userId);

    if (!endpoint) {
      notFoundMessage(res, 'Webhook endpoint not found');
      return;
    }

    res.json(endpoint);
  } catch (error) {
    logger.error('Error getting webhook endpoint', { error });
    serverError(res, 'Failed to get webhook endpoint');
  }
};

/**
 * Update a webhook endpoint
 */
export const updateWebhookEndpoint = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      unauthorized(res, 'User not authenticated');
      return;
    }

    const { id } = req.params;
    const data = req.body as UpdateWebhookEndpointRequest;

    // Validate URL if provided
    if (data.url) {
      try {
        new URL(data.url);
      } catch {
        badRequest(res, 'Invalid URL format');
        return;
      }

      if (process.env.NODE_ENV === 'production' && !data.url.startsWith('https://')) {
        badRequest(res, 'HTTPS URL is required in production');
        return;
      }

      const urlValidation = await webhookService.validateWebhookUrl(data.url);
      if (!urlValidation.ok) {
        badRequest(res, urlValidation.reason || 'Webhook URL is not allowed');
        return;
      }
    }

    const endpoint = await webhookService.updateWebhookEndpoint(id, userId, data);

    if (!endpoint) {
      notFoundMessage(res, 'Webhook endpoint not found');
      return;
    }

    res.json(endpoint);
  } catch (error) {
    logger.error('Error updating webhook endpoint', { error });
    serverError(res, 'Failed to update webhook endpoint');
  }
};

/**
 * Delete a webhook endpoint
 */
export const deleteWebhookEndpoint = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      unauthorized(res, 'User not authenticated');
      return;
    }

    const { id } = req.params;

    const deleted = await webhookService.deleteWebhookEndpoint(id, userId);

    if (!deleted) {
      notFoundMessage(res, 'Webhook endpoint not found');
      return;
    }

    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting webhook endpoint', { error });
    serverError(res, 'Failed to delete webhook endpoint');
  }
};

/**
 * Regenerate webhook secret
 */
export const regenerateWebhookSecret = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      unauthorized(res, 'User not authenticated');
      return;
    }

    const { id } = req.params;

    const secret = await webhookService.regenerateWebhookSecret(id, userId);

    if (!secret) {
      notFoundMessage(res, 'Webhook endpoint not found');
      return;
    }

    res.json({ secret });
  } catch (error) {
    logger.error('Error regenerating webhook secret', { error });
    serverError(res, 'Failed to regenerate webhook secret');
  }
};

/**
 * Get webhook deliveries for an endpoint
 */
export const getWebhookDeliveries = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      unauthorized(res, 'User not authenticated');
      return;
    }

    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || PAGINATION.WEBHOOK_DEFAULT_LIMIT;

    const deliveries = await webhookService.getWebhookDeliveries(id, userId, limit);
    res.json(deliveries);
  } catch (error) {
    logger.error('Error getting webhook deliveries', { error });
    serverError(res, 'Failed to get webhook deliveries');
  }
};

/**
 * Test a webhook endpoint
 */
export const testWebhookEndpoint = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      unauthorized(res, 'User not authenticated');
      return;
    }

    const { id } = req.params;

    const result = await webhookService.testWebhookEndpoint(id, userId);
    res.json(result);
  } catch (error) {
    logger.error('Error testing webhook endpoint', { error });
    serverError(res, 'Failed to test webhook endpoint');
  }
};

/**
 * Get available webhook events
 */
export const getAvailableWebhookEvents = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const events = webhookService.getAvailableWebhookEvents();
    res.json(events);
  } catch (error) {
    logger.error('Error getting available webhook events', { error });
    serverError(res, 'Failed to get available webhook events');
  }
};

// ==================== API Keys ====================

/**
 * Get all API keys for the current user
 */
export const getApiKeys = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      unauthorized(res, 'User not authenticated');
      return;
    }

    const keys = await apiKeyService.getApiKeys(userId);
    res.json(keys);
  } catch (error) {
    logger.error('Error getting API keys', { error });
    serverError(res, 'Failed to get API keys');
  }
};

/**
 * Create a new API key
 */
export const createApiKey = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      unauthorized(res, 'User not authenticated');
      return;
    }

    const { name, scopes, expiresAt } = req.body as CreateApiKeyRequest;

    if (!name) {
      badRequest(res, 'API key name is required');
      return;
    }

    if (!scopes || !Array.isArray(scopes) || scopes.length === 0) {
      badRequest(res, 'At least one scope is required');
      return;
    }

    const key = await apiKeyService.createApiKey(userId, {
      name,
      scopes,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    res.status(201).json(key);
  } catch (error) {
    logger.error('Error creating API key', { error });
    serverError(res, 'Failed to create API key');
  }
};

/**
 * Get a specific API key
 */
export const getApiKey = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      unauthorized(res, 'User not authenticated');
      return;
    }

    const { id } = req.params;

    const key = await apiKeyService.getApiKeyById(id, userId);

    if (!key) {
      notFoundMessage(res, 'API key not found');
      return;
    }

    // Don't return the hash
    // Omit keyHash from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { keyHash: _hash, ...safeKey } = key;
    res.json(safeKey);
  } catch (error) {
    logger.error('Error getting API key', { error });
    serverError(res, 'Failed to get API key');
  }
};

/**
 * Update an API key
 */
export const updateApiKey = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      unauthorized(res, 'User not authenticated');
      return;
    }

    const { id } = req.params;
    const data = req.body as UpdateApiKeyRequest;

    const key = await apiKeyService.updateApiKey(id, userId, data);

    if (!key) {
      notFoundMessage(res, 'API key not found');
      return;
    }

    // Don't return the hash
    // Omit keyHash from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { keyHash: _hash, ...safeKey } = key;
    res.json(safeKey);
  } catch (error) {
    logger.error('Error updating API key', { error });
    serverError(res, 'Failed to update API key');
  }
};

/**
 * Revoke an API key
 */
export const revokeApiKey = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      unauthorized(res, 'User not authenticated');
      return;
    }

    const { id } = req.params;

    const revoked = await apiKeyService.revokeApiKey(id, userId);

    if (!revoked) {
      notFoundMessage(res, 'API key not found or already revoked');
      return;
    }

    res.json({ success: true, message: 'API key revoked' });
  } catch (error) {
    logger.error('Error revoking API key', { error });
    serverError(res, 'Failed to revoke API key');
  }
};

/**
 * Delete an API key
 */
export const deleteApiKey = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      unauthorized(res, 'User not authenticated');
      return;
    }

    const { id } = req.params;

    const deleted = await apiKeyService.deleteApiKey(id, userId);

    if (!deleted) {
      notFoundMessage(res, 'API key not found');
      return;
    }

    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting API key', { error });
    serverError(res, 'Failed to delete API key');
  }
};

/**
 * Get API key usage history
 */
export const getApiKeyUsage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      unauthorized(res, 'User not authenticated');
      return;
    }

    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || PAGINATION.WEBHOOK_DELIVERY_DEFAULT_LIMIT;

    const usage = await apiKeyService.getApiKeyUsage(id, userId, limit);
    res.json(usage);
  } catch (error) {
    logger.error('Error getting API key usage', { error });
    serverError(res, 'Failed to get API key usage');
  }
};

/**
 * Get available API scopes
 */
export const getAvailableScopes = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const scopes = apiKeyService.getAvailableScopes();
    res.json(scopes);
  } catch (error) {
    logger.error('Error getting available scopes', { error });
    serverError(res, 'Failed to get available scopes');
  }
};

export default {
  // Webhooks
  getWebhookEndpoints,
  createWebhookEndpoint,
  getWebhookEndpoint,
  updateWebhookEndpoint,
  deleteWebhookEndpoint,
  regenerateWebhookSecret,
  getWebhookDeliveries,
  testWebhookEndpoint,
  getAvailableWebhookEvents,
  // API Keys
  getApiKeys,
  createApiKey,
  getApiKey,
  updateApiKey,
  revokeApiKey,
  deleteApiKey,
  getApiKeyUsage,
  getAvailableScopes,
};
