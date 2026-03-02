import { Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import * as externalServiceProviderService from '@services/externalServiceProviderService';
import { appendAuditLog } from '@services/auditService';
import { logger } from '@config/logger';
import pool from '@config/database';
import { badRequest, serverError } from '@utils/responseHelpers';
import { sendSuccess } from '@modules/shared/http/envelope';

const getRequestUserAgent = (req: AuthRequest): string | null => {
  const userAgent = req.headers['user-agent'];
  if (Array.isArray(userAgent)) {
    return userAgent[0] || null;
  }
  return userAgent || null;
};

const getRequestIp = (req: AuthRequest): string | null => {
  return req.ip || req.connection.remoteAddress || null;
};

export const getExternalServiceProviders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const query = req.query as Record<string, string | string[] | undefined>;
    const getParam = (key: string) => {
      const value = query[key];
      return Array.isArray(value) ? value[0] : value;
    };

    const providers = await externalServiceProviderService.listProviders({
      search: getParam('search'),
      provider_type: getParam('provider_type'),
      include_inactive: getParam('include_inactive') === 'true',
      limit: Number(getParam('limit') || 100),
    });

    sendSuccess(res, { providers });
  } catch (error) {
    logger.error('Error fetching external service providers', { error });
    serverError(res, 'Failed to fetch external service providers');
  }
};

export const createExternalServiceProvider = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const provider_name = String(req.body?.provider_name || '').trim();
    if (!provider_name) {
      badRequest(res, 'provider_name is required');
      return;
    }

    const provider = await externalServiceProviderService.createProvider(
      {
        provider_name,
        provider_type: req.body?.provider_type,
        notes: req.body?.notes,
        is_active: req.body?.is_active,
      },
      req.user?.id
    );

    await appendAuditLog(pool, {
      action: 'external_service_provider_created',
      resourceType: 'external_service_provider',
      resourceId: provider.id,
      userId: req.user?.id || null,
      details: {
        providerName: provider.provider_name,
        providerType: provider.provider_type || null,
        isActive: provider.is_active,
      },
      ipAddress: getRequestIp(req),
      userAgent: getRequestUserAgent(req),
      requestId: req.correlationId,
    });

    sendSuccess(res, provider, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create external service provider';
    if (message.includes('already exists')) {
      badRequest(res, message);
      return;
    }
    logger.error('Error creating external service provider', { error });
    serverError(res, 'Failed to create external service provider');
  }
};

export const updateExternalServiceProvider = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const provider = await externalServiceProviderService.updateProvider(
      id,
      {
        provider_name: req.body?.provider_name,
        provider_type: req.body?.provider_type,
        notes: req.body?.notes,
        is_active: req.body?.is_active,
      },
      req.user?.id
    );

    if (!provider) {
      badRequest(res, 'No fields to update or provider not found');
      return;
    }

    await appendAuditLog(pool, {
      action: 'external_service_provider_updated',
      resourceType: 'external_service_provider',
      resourceId: provider.id,
      userId: req.user?.id || null,
      details: {
        providerName: provider.provider_name,
        providerType: provider.provider_type || null,
        isActive: provider.is_active,
      },
      ipAddress: getRequestIp(req),
      userAgent: getRequestUserAgent(req),
      requestId: req.correlationId,
    });

    sendSuccess(res, provider);
  } catch (error) {
    logger.error('Error updating external service provider', { error });
    serverError(res, 'Failed to update external service provider');
  }
};

export const deleteExternalServiceProvider = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const deleted = await externalServiceProviderService.deleteProvider(id);
    if (!deleted) {
      badRequest(res, 'Provider not found');
      return;
    }

    await appendAuditLog(pool, {
      action: 'external_service_provider_archived',
      resourceType: 'external_service_provider',
      resourceId: id,
      userId: req.user?.id || null,
      details: {
        archived: true,
      },
      ipAddress: getRequestIp(req),
      userAgent: getRequestUserAgent(req),
      requestId: req.correlationId,
    });

    sendSuccess(res, { message: 'External service provider archived' });
  } catch (error) {
    logger.error('Error deleting external service provider', { error });
    serverError(res, 'Failed to delete external service provider');
  }
};
