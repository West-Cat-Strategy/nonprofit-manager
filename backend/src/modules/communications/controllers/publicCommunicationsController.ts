import type { Request, Response } from 'express';
import { sendSuccess } from '@modules/shared/http/envelope';
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
