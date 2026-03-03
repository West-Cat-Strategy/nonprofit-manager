import { NextFunction, Request, Response } from 'express';
import {
  isApiErrorEnvelope,
  isApiSuccessEnvelope,
  successEnvelope,
} from '@modules/shared/http/envelope';

const shouldWrapPayload = (
  res: Response,
  statusCode: number,
  payload: unknown
): boolean => {
  if (statusCode < 200 || statusCode >= 300) return false;
  if (payload === null || payload === undefined) return false;
  if (res.locals?.skipSuccessEnvelope === true) return false;
  if (isApiSuccessEnvelope(payload) || isApiErrorEnvelope(payload)) return false;
  return true;
};

// Normalize successful /api JSON responses to `{ success: true, data }`.
export const successEnvelopeMiddleware = (
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  const originalJson = res.json.bind(res);

  res.json = ((payload: unknown) => {
    if (shouldWrapPayload(res, res.statusCode, payload)) {
      return originalJson(successEnvelope(payload));
    }
    return originalJson(payload);
  }) as Response['json'];

  next();
};
