/**
 * API Key Authentication Middleware
 * 
 * Authenticates requests using API keys instead of JWT tokens.
 * Supports:
 * - Authorization header: "Bearer app_XXXXX"
 * - Query parameter: ?api_key=app_XXXXX
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
 * - Authorization header: "Bearer app_XXXXX"
 * - Query parameter: ?api_key=app_XXXXX
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

    if (!validation.valid) {
      // Log failed authentication attempt
      logger.warn('API key validation failed', {
        error: validation.error,
        ip: req.ip,
      });
      return unauthorized(res, validation.error || 'Invalid API key');
    }

    // Increment rate limit counter
    if (validation.apiKeyId) {
      await apiKeyService.incrementRateLimit(validation.apiKeyId);

      // Attach API key info to request
      req.apiKey = {
        id: validation.apiKeyId,
        organizationId: validation.organizationId!,
        scopes: validation.scopes || [],
      };

      // LogAPI key usage
      const start = Date.now();
      const originalJson = res.json.bind(res);
      res.json = function (data: any) {
        const responseTime = Date.now() - start;
        await apiKeyService.logApiKeyUsage(
          validation.apiKeyId!,
          req.path,
          req.method,
          res.statusCode,
          req.ip || 'unknown',
          req.headers['user-agent'] || 'unknown',
          responseTime
        ).catch((err) => logger.error('Failed to log API key usage', { err }));
        return originalJson(data);
      };
    }

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

    const hasScope = req.apiKey.scopes.includes(requiredScope) || req.apiKey.scopes.includes('*');

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
export const auditApiKeyUsage = async (req: ApiKeyRequest, res: Response, next: NextFunction): Promise<void> => {
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
