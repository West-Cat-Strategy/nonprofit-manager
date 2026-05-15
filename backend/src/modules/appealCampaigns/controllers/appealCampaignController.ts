import { logger } from '@config/logger';
import type { AuthRequest } from '@middleware/auth';
import type { Response } from 'express';
import { sendSuccess } from '@modules/shared/http/envelope';
import { badRequest, created, notFoundMessage, serverError } from '@utils/responseHelpers';
import type {
  CreateAppealCampaignInput,
  UpdateAppealCampaignInput,
} from '@app-types/appealCampaign';
import {
  AppealCampaignValidationError,
  appealCampaignService,
} from '../services/appealCampaignService';

const getOrganizationId = (req: AuthRequest): string | null =>
  req.organizationId || req.accountId || req.tenantId || null;

const isValidationError = (error: unknown): boolean =>
  error instanceof AppealCampaignValidationError ||
  (typeof error === 'object' &&
    error !== null &&
    (error as { statusCode?: number }).statusCode === 400);

export const listAppealCampaigns = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const organizationId = getOrganizationId(req);
    if (!organizationId) {
      badRequest(res, 'Organization context is required');
      return;
    }
    const query = req.validatedQuery as { status?: CreateAppealCampaignInput['status'] } | undefined;
    sendSuccess(
      res,
      await appealCampaignService.listCampaigns(organizationId, query?.status)
    );
  } catch (error) {
    logger.error('Failed to list appeal campaigns', { error });
    serverError(res, 'Failed to list appeal campaigns');
  }
};

export const getAppealCampaign = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const organizationId = getOrganizationId(req);
    if (!organizationId) {
      badRequest(res, 'Organization context is required');
      return;
    }
    const campaign = await appealCampaignService.getCampaign(organizationId, req.params.id);
    if (!campaign) {
      notFoundMessage(res, 'Appeal campaign not found');
      return;
    }
    sendSuccess(res, campaign);
  } catch (error) {
    logger.error('Failed to get appeal campaign', { error });
    serverError(res, 'Failed to get appeal campaign');
  }
};

export const createAppealCampaign = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const organizationId = getOrganizationId(req);
    if (!organizationId) {
      badRequest(res, 'Organization context is required');
      return;
    }
    created(
      res,
      await appealCampaignService.createCampaign(
        organizationId,
        req.user?.id,
        req.body as CreateAppealCampaignInput
      )
    );
  } catch (error) {
    if (isValidationError(error)) {
      badRequest(res, error instanceof Error ? error.message : 'Invalid appeal campaign');
      return;
    }
    logger.error('Failed to create appeal campaign', { error });
    serverError(res, 'Failed to create appeal campaign');
  }
};

export const updateAppealCampaign = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const organizationId = getOrganizationId(req);
    if (!organizationId) {
      badRequest(res, 'Organization context is required');
      return;
    }
    const campaign = await appealCampaignService.updateCampaign(
      organizationId,
      req.params.id,
      req.user?.id,
      req.body as UpdateAppealCampaignInput
    );
    if (!campaign) {
      notFoundMessage(res, 'Appeal campaign not found');
      return;
    }
    sendSuccess(res, campaign);
  } catch (error) {
    if (isValidationError(error)) {
      badRequest(res, error instanceof Error ? error.message : 'Invalid appeal campaign');
      return;
    }
    logger.error('Failed to update appeal campaign', { error });
    serverError(res, 'Failed to update appeal campaign');
  }
};
