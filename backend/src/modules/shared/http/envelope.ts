import { Response } from 'express';

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
}

export interface ApiErrorEnvelope {
  success: false;
  error: ApiErrorPayload;
}

export const sendSuccess = <T>(res: Response, data: T, status = 200): void => {
  res.status(status).json({
    success: true,
    data,
  } satisfies ApiSuccessEnvelope<T>);
};

export const sendError = (
  res: Response,
  code: string,
  message: string,
  status = 400,
  details?: Record<string, unknown>
): void => {
  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      details,
    },
  } satisfies ApiErrorEnvelope);
};
