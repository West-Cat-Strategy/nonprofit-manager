import type { Response } from 'express';
import { sendError, sendSuccess } from '../../shared/http/envelope';

export type ResponseMode = 'v2' | 'legacy';

export const sendData = <T>(
  res: Response,
  mode: ResponseMode,
  payload: T,
  status = 200
): void => {
  if (mode === 'v2') {
    sendSuccess(res, payload, status);
    return;
  }

  res.status(status).json(payload);
};

export const sendFailure = (
  res: Response,
  mode: ResponseMode,
  code: string,
  message: string,
  status = 400,
  details?: Record<string, unknown>
): void => {
  if (mode === 'v2') {
    sendError(res, code, message, status, details);
    return;
  }

  res.status(status).json({
    error: {
      code,
      message,
      details,
    },
  });
};
