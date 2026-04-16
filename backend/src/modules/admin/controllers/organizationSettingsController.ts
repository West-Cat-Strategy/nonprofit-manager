import type { Response } from 'express';
import { logger } from '@config/logger';
import type { AuthRequest } from '@middleware/auth';
import { sendError, sendSuccess } from '@modules/shared/http/envelope';
import { requireActiveOrganizationSafe, requireUserSafe } from '@services/authGuardService';
import type { OrganizationSettingsConfig } from '@app-types/organizationSettings';
import * as organizationSettingsUseCase from '../usecases/organizationSettingsUseCase';

export const getOrganizationSettingsHandler = async (req: AuthRequest, res: Response) => {
  const userResult = requireUserSafe(req);
  if (!userResult.ok) {
    return sendError(
      res,
      userResult.error.code.toUpperCase(),
      userResult.error.message,
      userResult.error.statusCode,
      undefined,
      req.correlationId
    );
  }

  const orgResult = await requireActiveOrganizationSafe(req);
  if (!orgResult.ok) {
    return sendError(
      res,
      orgResult.error.code.toUpperCase(),
      orgResult.error.message,
      orgResult.error.statusCode,
      undefined,
      req.correlationId
    );
  }

  try {
    const settings = await organizationSettingsUseCase.getOrganizationSettings(
      orgResult.data.organizationId,
      userResult.data.user.id
    );
    return sendSuccess(res, settings);
  } catch (error) {
    logger.error('Failed to fetch organization settings', {
      error,
      organizationId: orgResult.data.organizationId,
      userId: userResult.data.user.id,
    });
    return sendError(
      res,
      'SERVER_ERROR',
      'Failed to fetch organization settings',
      500,
      undefined,
      req.correlationId
    );
  }
};

export const updateOrganizationSettingsHandler = async (req: AuthRequest, res: Response) => {
  const userResult = requireUserSafe(req);
  if (!userResult.ok) {
    return sendError(
      res,
      userResult.error.code.toUpperCase(),
      userResult.error.message,
      userResult.error.statusCode,
      undefined,
      req.correlationId
    );
  }

  const orgResult = await requireActiveOrganizationSafe(req);
  if (!orgResult.ok) {
    return sendError(
      res,
      orgResult.error.code.toUpperCase(),
      orgResult.error.message,
      orgResult.error.statusCode,
      undefined,
      req.correlationId
    );
  }

  try {
    const { config } = req.body as { config: OrganizationSettingsConfig };
    const settings = await organizationSettingsUseCase.updateOrganizationSettings(
      orgResult.data.organizationId,
      config,
      userResult.data.user.id
    );
    return sendSuccess(res, settings);
  } catch (error) {
    logger.error('Failed to update organization settings', {
      error,
      organizationId: orgResult.data.organizationId,
      userId: userResult.data.user.id,
    });
    return sendError(
      res,
      'SERVER_ERROR',
      'Failed to update organization settings',
      500,
      undefined,
      req.correlationId
    );
  }
};
