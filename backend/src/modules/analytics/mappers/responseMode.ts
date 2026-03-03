import type { Response } from 'express';
import { sendError, sendSuccess } from '../../shared/http/envelope';

export type ResponseMode = 'v2' | 'legacy';

export const sendData = <T>(
  res: Response,
  _mode: ResponseMode,
  payload: T,
  status = 200
): void => {
  sendSuccess(res, payload, status);
};

export const sendFailure = (
  res: Response,
  _mode: ResponseMode,
  code: string,
  message: string,
  status = 400,
  details?: Record<string, unknown>
): void => {
  sendError(res, code, message, status, details);
};
