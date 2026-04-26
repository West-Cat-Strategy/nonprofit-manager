/**
 * API Key Authentication Middleware
 *
 * Authenticates requests using API keys instead of JWT tokens.
 * Supports:
 * - Authorization header: "Bearer npm_XXXXX"
 *
 * Performs:
 * - Key validation
 * - Scope checking
 * - Rate limiting
 * - Usage logging
 */

import { Request, Response, NextFunction } from 'express';
import pool from '@config/database';
import { logger } from '@config/logger';
import * as apiKeyService from '@modules/webhooks/services/apiKeyService';
import type { ApiKey, ApiKeyScope } from '@app-types/webhook';
import { unauthorized, forbidden } from '@utils/responseHelpers';
import { sendError } from '@modules/shared/http/envelope';

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
 */
function extractApiKey(req: Request): string | null {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

const hasQueryApiKey = (req: Request): boolean =>
  Object.prototype.hasOwnProperty.call(req.query, 'api_key');

const readRateLimitState = async (
  apiKeyId: string
): Promise<{ request_count: number; window_start_at: Date } | null> => {
  const result = await pool.query<{ request_count: number; window_start_at: Date }>(
    `SELECT request_count, window_start_at
     FROM api_key_rate_limit_state
     WHERE api_key_id = $1
     LIMIT 1`,
    [apiKeyId]
  );

  return result.rows[0] ?? null;
};

const isWindowExpired = (windowStartAt: Date, intervalMs: number): boolean => {
  return Date.now() - windowStartAt.getTime() >= intervalMs;
};

const resetRateLimitWindow = async (apiKeyId: string): Promise<void> => {
  await pool.query(
    `INSERT INTO api_key_rate_limit_state (api_key_id, request_count, window_start_at, updated_at)
     VALUES ($1, 1, NOW(), NOW())
     ON CONFLICT (api_key_id)
     DO UPDATE SET
       request_count = 1,
       window_start_at = NOW(),
       updated_at = NOW()`,
    [apiKeyId]
  );
};

/**
 * API Key authentication middleware
 *
 * Usage in routes:
 * router.get('/api/data', authenticateApiKey, validateApiKeyScope('data:read'), controller);
 */
export const authenticateApiKey = async (req: ApiKeyRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (hasQueryApiKey(req)) {
      return unauthorized(res, 'API keys must be sent in the Authorization header');
    }

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

    const rateLimitState = await readRateLimitState(validation.id);
    const windowExpired =
      rateLimitState &&
      isWindowExpired(new Date(rateLimitState.window_start_at), validation.rateLimitIntervalMs);

    if (
      rateLimitState &&
      !windowExpired &&
      validation.rateLimitRequests > 0 &&
      validation.rateLimitIntervalMs > 0 &&
      Number(rateLimitState.request_count) >= validation.rateLimitRequests
    ) {
      logger.warn('API key rate limit exceeded', {
        apiKeyId: validation.id,
        organizationId: validation.organizationId,
        requests: validation.rateLimitRequests,
        intervalMs: validation.rateLimitIntervalMs,
      });
      sendError(res, 'rate_limit_exceeded', 'API key rate limit exceeded', 429);
      return;
    }

    if (!rateLimitState || windowExpired) {
      await resetRateLimitWindow(validation.id);
    } else {
      await apiKeyService.incrementRateLimit(validation.id);
    }

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
