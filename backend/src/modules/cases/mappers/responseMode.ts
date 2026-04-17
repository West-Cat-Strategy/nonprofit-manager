import type { Response } from 'express';
import { sendError, sendSuccess } from '../../shared/http/envelope';

export const sendData = <T>(
  res: Response,
  payload: T,
  status = 200
): void => {
  sendSuccess(res, payload, status);
};

export const sendFailure = (
  res: Response,
  code: string,
  message: string,
  status = 400,
  details?: Record<string, unknown>
): void => {
  sendError(res, code, message, status, details);
};
