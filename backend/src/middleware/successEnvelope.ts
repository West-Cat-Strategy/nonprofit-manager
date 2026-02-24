import { NextFunction, Request, Response } from 'express';
import {
  isApiErrorEnvelope,
  isApiSuccessEnvelope,
} from '@modules/shared/http/envelope';

const shouldWrapPayload = (statusCode: number, payload: unknown): boolean => {
  if (statusCode < 200 || statusCode >= 300) return false;
  if (payload === null || payload === undefined) return false;
  if (isApiSuccessEnvelope(payload) || isApiErrorEnvelope(payload)) return false;
  return true;
};

const buildSuccessPayload = (payload: unknown): Record<string, unknown> => {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return {
      ...(payload as Record<string, unknown>),
      success: true,
      data: payload,
    };
  }
  return {
    success: true,
    data: payload,
  };
};

// Normalize successful /api JSON responses to `{ success: true, data }`.
export const successEnvelopeMiddleware = (
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  const originalJson = res.json.bind(res);

  res.json = ((payload: unknown) => {
    if (shouldWrapPayload(res.statusCode, payload)) {
      return originalJson(buildSuccessPayload(payload));
    }
    return originalJson(payload);
  }) as Response['json'];

  next();
};
