/**
 * API Key Authentication Middleware
 *
 * Authenticates requests using API keys instead of JWT tokens.
 * Supports:
 * - Authorization header: "Bearer npm_XXXXX"
 * - Query parameter: ?api_key=npm_XXXXX
 *
 * Performs:
 * - Key validation
 * - Scope checking
 * - Rate limiting
 * - Usage logging
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '@config/logger';
import * as apiKeyService from '@services/apiKeyService';
import type { ApiKey, ApiKeyScope } from '@app-types/webhook';
import { unauthorized, forbidden } from '@utils/responseHelpers';

export interface ApiKeyRequest extends Request {
  apiKey?: {
    id: string;
    organizationId: string;
    scopes: string[];
  };
}

/**
 * Extract API key from request
 *
 * Supports:
 * - Authorization header: "Bearer npm_XXXXX"
 * - Query parameter: ?api_key=npm_XXXXX
 */
function extractApiKey(req: Request): string | null {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check query parameter
  if (req.query.api_key && typeof req.query.api_key === 'string') {
    return req.query.api_key;
  }

  return null;
}

/**
 * API Key authentication middleware
 *
 * Usage in routes:
 * router.get('/api/data', authenticateApiKey, validateApiKeyScope('data:read'), controller);
 */
export const authenticateApiKey = async (req: ApiKeyRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const apiKey = extractApiKey(req);

    if (!apiKey) {
      return unauthorized(res, 'Missing API key');
    }

    // Validate API key
    const validation = await apiKeyService.validateApiKey(apiKey);

    if (!validation) {
      // Log failed authentication attempt
      logger.warn('API key validation failed', {
        ip: req.ip,
      });
      return unauthorized(res, 'Invalid API key');
    }

    await apiKeyService.incrementRateLimit(validation.id);

    // Attach API key info to request
    req.apiKey = {
      id: validation.id,
      organizationId: validation.organizationId,
      scopes: validation.scopes || [],
    };

    // Log API key usage after the response payload is sent.
    const start = Date.now();
    const originalJson = res.json.bind(res);
    res.json = function (data: unknown) {
      const responseTime = Date.now() - start;
      apiKeyService
        .logApiKeyUsage(
          validation.id,
          req.originalUrl?.split('?')[0] || req.path,
          req.method,
          res.statusCode,
          responseTime,
          req.ip || 'unknown',
          req.get('user-agent') || 'unknown'
        )
        .catch((err: unknown) => logger.error('Failed to log API key usage', { err }));
      return originalJson(data);
    };

    next();
  } catch (error) {
    logger.error('API key authentication error', { error });
    return unauthorized(res, 'Authentication failed');
  }
};

/**
 * Middleware to check API key scopes
 *
 * Usage:
 * router.get('/api/data', authenticateApiKey, validateApiKeyScope('data:read'), controller);
 */
export const validateApiKeyScope = (requiredScope: string) => {
  return (req: ApiKeyRequest, res: Response, next: NextFunction): void => {
    if (!req.apiKey) {
      return forbidden(res, 'API key authentication required');
    }

    const hasScope = apiKeyService.hasScope(
      { scopes: req.apiKey.scopes } as ApiKey,
      requiredScope as ApiKeyScope
    );

    if (!hasScope) {
      logger.warn('API key lacks required scope', {
        apiKeyId: req.apiKey.id,
        requiredScope,
        availableScopes: req.apiKey.scopes,
      });
      return forbidden(res, `This API key does not have the "${requiredScope}" scope`);
    }

    next();
  };
};

/**
 * Optional: Log all API key authentication attempts for audit trail
 */
export const auditApiKeyUsage = async (req: ApiKeyRequest, _res: Response, next: NextFunction): Promise<void> => {
  const apiKey = extractApiKey(req);

  if (apiKey && req.apiKey) {
    // Additional audit logging can go here
    logger.debug('API key request', {
      apiKeyId: req.apiKey.id,
      organizationId: req.apiKey.organizationId,
      method: req.method,
      path: req.path,
      ip: req.ip,
    });
  }

  next();
};

export default {
  authenticateApiKey,
  validateApiKeyScope,
  auditApiKeyUsage,
  extractApiKey,
};
