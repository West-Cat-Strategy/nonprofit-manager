import type { Response } from 'express';
import { logger } from '@config/logger';
import type { AuthRequest } from '@middleware/auth';
import { sendError, sendSuccess } from '@modules/shared/http/envelope';
import { badRequest, created, notFoundMessage, serverError } from '@utils/responseHelpers';
import type { DataScopeFilter } from '@app-types/dataScope';
import type {
  CommunicationAudiencePreviewRequest,
  CommunicationCampaignActionResult,
  CommunicationCampaignRescheduleRequest,
  CommunicationCampaignTestSendRequest,
  CommunicationRecipientStatus,
  CreateCommunicationAudienceRequest,
  CreateCommunicationCampaignRequest,
} from '@app-types/communications';
import * as communicationsService from '../services/communicationsService';

const getRequesterScopeAccountIds = (req: AuthRequest): string[] => {
  const scope = req.dataScope?.filter as DataScopeFilter | undefined;
  const accountIds = new Set<string>();
  (scope?.accountIds ?? []).forEach((accountId) => accountIds.add(accountId));
  if (req.accountId) accountIds.add(req.accountId);
  if (req.organizationId) accountIds.add(req.organizationId);
  return Array.from(accountIds);
};

const isValidationStatusError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { statusCode?: number }).statusCode === 400;

const sendCampaignRunActionResult = (
  res: Response,
  result: CommunicationCampaignActionResult | null
): void => {
  if (!result) {
    notFoundMessage(res, 'Campaign run not found');
    return;
  }
  if (result.action === 'unsupported') {
    sendError(res, 'method_not_allowed', result.message, 405, {
      action: result.action,
      provider: result.run.provider,
      runId: result.run.id,
    });
    return;
  }
  sendSuccess(res, result);
};

export const getStatus = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    sendSuccess(res, await communicationsService.getStatus());
  } catch (error) {
    logger.error('Error getting communications status', { error });
    serverError(res, 'Failed to get communications status');
  }
};

export const getAudiences = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const query = (req.validatedQuery ?? req.query) as { scope?: 'provider' | 'saved' };
    if (query.scope === 'provider') {
      sendSuccess(res, await communicationsService.listProviderAudiences(getRequesterScopeAccountIds(req)));
      return;
    }
    sendSuccess(res, await communicationsService.listAudiences(getRequesterScopeAccountIds(req)));
  } catch (error) {
    logger.error('Error getting communications audiences', { error });
    serverError(res, 'Failed to get communications audiences');
  }
};

export const getAudience = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const audience = await communicationsService.getProviderAudience(
      req.params.audienceId,
      getRequesterScopeAccountIds(req)
    );
    if (!audience) {
      notFoundMessage(res, 'Audience not found');
      return;
    }
    sendSuccess(res, audience);
  } catch (error) {
    logger.error('Error getting communications audience', { error });
    serverError(res, 'Failed to get communications audience');
  }
};

export const createAudience = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = req.body as CreateCommunicationAudienceRequest;
    created(
      res,
      await communicationsService.createAudience(
        {
          ...body,
          scopeAccountIds: getRequesterScopeAccountIds(req),
        },
        req.user?.id
      )
    );
  } catch (error) {
    if (isValidationStatusError(error)) {
      badRequest(res, error instanceof Error ? error.message : 'Invalid audience');
      return;
    }
    logger.error('Error creating communications audience', { error });
    serverError(res, 'Failed to create communications audience');
  }
};

export const archiveAudience = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const audience = await communicationsService.archiveAudience(
      req.params.audienceId,
      req.user?.id,
      getRequesterScopeAccountIds(req)
    );
    if (!audience) {
      notFoundMessage(res, 'Audience not found');
      return;
    }
    sendSuccess(res, audience);
  } catch (error) {
    if (isValidationStatusError(error)) {
      badRequest(res, error instanceof Error ? error.message : 'Invalid audience');
      return;
    }
    logger.error('Error archiving communications audience', { error });
    serverError(res, 'Failed to archive communications audience');
  }
};

export const previewAudience = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    sendSuccess(
      res,
      await communicationsService.previewAudience(
        req.body as CommunicationAudiencePreviewRequest,
        getRequesterScopeAccountIds(req)
      )
    );
  } catch (error) {
    if (isValidationStatusError(error)) {
      badRequest(res, error instanceof Error ? error.message : 'Invalid audience preview');
      return;
    }
    logger.error('Error previewing communications audience', { error });
    serverError(res, 'Failed to preview communications audience');
  }
};

export const previewCampaign = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    sendSuccess(res, communicationsService.previewCampaign(req.body as CreateCommunicationCampaignRequest));
  } catch (error) {
    logger.error('Error previewing communications campaign', { error });
    serverError(res, 'Failed to render campaign preview');
  }
};

export const createCampaign = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = req.body as CreateCommunicationCampaignRequest;
    created(
      res,
      await communicationsService.createCampaign({
        ...body,
        sendTime: body.sendTime ? new Date(body.sendTime) : undefined,
        requestedBy: req.user?.id,
        scopeAccountIds: getRequesterScopeAccountIds(req),
      })
    );
  } catch (error) {
    if (isValidationStatusError(error)) {
      badRequest(res, error instanceof Error ? error.message : 'Invalid campaign');
      return;
    }
    logger.error('Error creating communications campaign', { error });
    serverError(res, 'Failed to create communications campaign');
  }
};

export const getCampaigns = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const query = (req.validatedQuery ?? req.query) as { audienceId?: string };
    sendSuccess(
      res,
      await communicationsService.listCampaigns(
        query.audienceId,
        getRequesterScopeAccountIds(req)
      )
    );
  } catch (error) {
    logger.error('Error getting communications campaigns', { error });
    serverError(res, 'Failed to get campaigns');
  }
};

export const sendCampaignTest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = req.body as CommunicationCampaignTestSendRequest;
    sendSuccess(
      res,
      await communicationsService.sendCampaignTest({
        ...body,
        sendTime: body.sendTime ? new Date(body.sendTime) : undefined,
        requestedBy: req.user?.id,
        scopeAccountIds: getRequesterScopeAccountIds(req),
      })
    );
  } catch (error) {
    if (isValidationStatusError(error)) {
      badRequest(res, error instanceof Error ? error.message : 'Invalid campaign test send');
      return;
    }
    logger.error('Error sending communications campaign test email', { error });
    serverError(res, 'Failed to send campaign test email');
  }
};

export const getCampaignRuns = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const query = (req.validatedQuery ?? req.query) as { limit?: number };
    sendSuccess(
      res,
      await communicationsService.listCampaignRuns(query.limit ?? 20, getRequesterScopeAccountIds(req))
    );
  } catch (error) {
    logger.error('Error getting communications campaign runs', { error });
    serverError(res, 'Failed to get campaign runs');
  }
};

export const getCampaignRunRecipients = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const query = (req.validatedQuery ?? req.query) as {
      status?: CommunicationRecipientStatus;
      limit?: number;
    };
    const result = await communicationsService.listCampaignRunRecipients(
      req.params.runId,
      { status: query.status, limit: query.limit ?? 20 },
      getRequesterScopeAccountIds(req)
    );
    if (!result) {
      notFoundMessage(res, 'Campaign run not found');
      return;
    }
    sendSuccess(res, result);
  } catch (error) {
    logger.error('Error getting communications campaign run recipients', { error });
    serverError(res, 'Failed to get campaign run recipients');
  }
};

export const sendCampaignRun = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await communicationsService.sendCampaignRun(
      req.params.runId,
      getRequesterScopeAccountIds(req)
    );
    sendCampaignRunActionResult(res, result);
  } catch (error) {
    if (isValidationStatusError(error)) {
      badRequest(res, error instanceof Error ? error.message : 'Invalid campaign run action');
      return;
    }
    logger.error('Error sending communications campaign run', { error });
    serverError(res, 'Failed to send campaign run');
  }
};

export const refreshCampaignRunStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await communicationsService.refreshCampaignRunStatus(
      req.params.runId,
      getRequesterScopeAccountIds(req)
    );
    sendCampaignRunActionResult(res, result);
  } catch (error) {
    if (isValidationStatusError(error)) {
      badRequest(res, error instanceof Error ? error.message : 'Invalid campaign run action');
      return;
    }
    logger.error('Error refreshing communications campaign run status', { error });
    serverError(res, 'Failed to refresh campaign run status');
  }
};

export const cancelCampaignRun = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await communicationsService.cancelCampaignRun(
      req.params.runId,
      getRequesterScopeAccountIds(req)
    );
    sendCampaignRunActionResult(res, result);
  } catch (error) {
    if (isValidationStatusError(error)) {
      badRequest(res, error instanceof Error ? error.message : 'Invalid campaign run action');
      return;
    }
    logger.error('Error canceling communications campaign run', { error });
    serverError(res, 'Failed to cancel campaign run');
  }
};

export const rescheduleCampaignRun = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = req.body as CommunicationCampaignRescheduleRequest;
    const result = await communicationsService.rescheduleCampaignRun(
      req.params.runId,
      { sendTime: new Date(body.sendTime) },
      getRequesterScopeAccountIds(req)
    );
    sendCampaignRunActionResult(res, result);
  } catch (error) {
    if (isValidationStatusError(error)) {
      badRequest(res, error instanceof Error ? error.message : 'Invalid campaign run action');
      return;
    }
    logger.error('Error rescheduling communications campaign run', { error });
    serverError(res, 'Failed to reschedule campaign run');
  }
};

export const retryFailedCampaignRunRecipients = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const result = await communicationsService.retryFailedCampaignRunRecipients(
      req.params.runId,
      getRequesterScopeAccountIds(req)
    );
    sendCampaignRunActionResult(res, result);
  } catch (error) {
    if (isValidationStatusError(error)) {
      badRequest(res, error instanceof Error ? error.message : 'Invalid campaign run action');
      return;
    }
    logger.error('Error retrying communications campaign run recipients', { error });
    serverError(res, 'Failed to retry failed campaign recipients');
  }
};
