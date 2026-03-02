import { NextFunction, Request, Response } from 'express';
import {
  isApiErrorEnvelope,
  isApiSuccessEnvelope,
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

const buildSuccessPayload = (payload: unknown): Record<string, unknown> => {
  const wrapped: Record<string, unknown> = {
    success: true,
    data: payload,
  };

  // Preserve legacy top-level fields for object payloads to avoid client/test regressions.
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      if (key === 'success' || key === 'data') continue;
      wrapped[key] = value;
    }
  }

  return wrapped;
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
      return originalJson(buildSuccessPayload(payload));
    }
    return originalJson(payload);
  }) as Response['json'];

  next();
};
