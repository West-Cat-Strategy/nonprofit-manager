import type { Request, Response } from 'express';
import { sendSuccess } from '@modules/shared/http/envelope';
import { logger } from '@config/logger';
import { buildUnavailableCampaignBrowserViewHtml } from '@services/template/emailCampaignBrowserView';
import * as browserViewService from '../services/localCampaignBrowserViewService';
import * as unsubscribeService from '../services/unsubscribeService';

const GENERIC_UNSUBSCRIBE_RESPONSE = {
  accepted: true,
  message: 'If this unsubscribe link is valid, the recipient has been unsubscribed.',
};

const recordUnsubscribe = async (req: Request): Promise<void> => {
  const token = typeof req.params.token === 'string' ? req.params.token : '';
  await unsubscribeService.recordLocalUnsubscribeFromToken(token);
};

export const getUnsubscribe = async (req: Request, res: Response): Promise<void> => {
  await recordUnsubscribe(req);
  sendSuccess(res, GENERIC_UNSUBSCRIBE_RESPONSE);
};

export const postUnsubscribe = async (req: Request, res: Response): Promise<void> => {
  await recordUnsubscribe(req);
  sendSuccess(res, GENERIC_UNSUBSCRIBE_RESPONSE);
};

export const getBrowserView = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = typeof req.params.token === 'string' ? req.params.token : '';
    const html = await browserViewService.renderLocalCampaignBrowserViewFromToken(token);
    res
      .status(200)
      .type('html')
      .set('Cache-Control', 'private, no-store')
      .send(html);
  } catch (error) {
    logger.warn('Local campaign browser view route failed', { error });
    res
      .status(200)
      .type('html')
      .set('Cache-Control', 'private, no-store')
      .send(buildUnavailableCampaignBrowserViewHtml());
  }
};
