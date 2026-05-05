import type { Response } from 'express';
import { sendError, sendSuccess } from '@modules/shared/http/envelope';
import { notFoundMessage } from '@utils/responseHelpers';
import { mailchimpService } from '../services/mailchimpService';
import { UnsupportedMailchimpCampaignRunActionError } from '../services/mailchimpCampaignRunActionErrors';

export const handleCampaignRunActionResult = (
  res: Response,
  result: Awaited<ReturnType<typeof mailchimpService.sendCampaignRun>>
): void => {
  if (!result) {
    notFoundMessage(res, 'Campaign run not found');
    return;
  }

  sendSuccess(res, result);
};

export const handleUnsupportedCampaignRunAction = (
  res: Response,
  error: unknown
): boolean => {
  const isUnsupported =
    error instanceof UnsupportedMailchimpCampaignRunActionError ||
    (
      typeof error === 'object' &&
      error !== null &&
      (error as { statusCode?: number; code?: string }).statusCode === 405 &&
      (error as { code?: string }).code === 'method_not_allowed'
    );
  if (!isUnsupported) return false;

  const message =
    error instanceof Error
      ? error.message
      : typeof (error as { message?: unknown }).message === 'string'
        ? (error as { message: string }).message
        : 'Mailchimp campaign run action is not supported';

  sendError(res, 'method_not_allowed', message, 405);
  return true;
};
