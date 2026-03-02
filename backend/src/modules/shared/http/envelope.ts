import { Response } from 'express';

const CORRELATION_ID_HEADER = 'x-correlation-id';

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
  correlationId?: string;
}

export type ProviderAckPayload = {
  received: true;
  duplicate?: true;
  rejected?: true;
  processingError?: true;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const getResponseCorrelationId = (res: Response): string | undefined => {
  const header = res.getHeader(CORRELATION_ID_HEADER);
  if (Array.isArray(header)) {
    return header[0];
  }
  if (typeof header === 'string') {
    return header;
  }
  return undefined;
};

const setResponseCorrelationId = (res: Response, correlationId?: string): string | undefined => {
  const resolved = correlationId || getResponseCorrelationId(res);
  if (resolved) {
    res.setHeader(CORRELATION_ID_HEADER, resolved);
  }
  return resolved;
};

export const successEnvelope = <T>(data: T): ApiSuccessEnvelope<T> & Record<string, unknown> => {
  const envelope: ApiSuccessEnvelope<T> & Record<string, unknown> = {
    success: true,
    data,
  };

  // Preserve legacy top-level object fields while keeping canonical `data`.
  if (isPlainObject(data)) {
    for (const [key, value] of Object.entries(data)) {
      if (key === 'success' || key === 'data') continue;
      envelope[key] = value;
    }
  }

  return envelope;
};

export const isApiSuccessEnvelope = (payload: unknown): payload is ApiSuccessEnvelope<unknown> => {
  if (!payload || typeof payload !== 'object') return false;
  const candidate = payload as Record<string, unknown>;
  return candidate.success === true && Object.prototype.hasOwnProperty.call(candidate, 'data');
};

export const isApiErrorEnvelope = (payload: unknown): payload is ApiErrorEnvelope => {
  if (!payload || typeof payload !== 'object') return false;
  const candidate = payload as Record<string, unknown>;
  return candidate.success === false && typeof candidate.error === 'object' && candidate.error !== null;
};

export const errorEnvelope = (
  code: string,
  message: string,
  details?: Record<string, unknown>,
  correlationId?: string
): ApiErrorEnvelope => ({
  success: false,
  error: {
    code,
    message,
    ...(details ? { details } : {}),
  },
  ...(correlationId ? { correlationId } : {}),
});

export const sendSuccess = <T>(res: Response, data: T, status = 200): Response => {
  return res.status(status).json(successEnvelope(data));
};

export const sendProviderAck = (
  res: Response,
  payload: ProviderAckPayload,
  status = 200
): Response => {
  if (!res.locals) {
    (res as Response & { locals: Record<string, unknown> }).locals = {};
  }
  res.locals.skipSuccessEnvelope = true;
  return res.status(status).json(payload);
};

export const sendError = (
  res: Response,
  code: string,
  message: string,
  status = 400,
  details?: Record<string, unknown>,
  correlationId?: string
): Response => {
  const resolvedCorrelationId = setResponseCorrelationId(res, correlationId);
  return res.status(status).json(errorEnvelope(code, message, details, resolvedCorrelationId));
};

export const buildApiErrorPayload = (
  res: Response,
  code: string,
  message: string,
  details?: Record<string, unknown>,
  correlationId?: string
): ApiErrorEnvelope => {
  const resolvedCorrelationId = setResponseCorrelationId(res, correlationId);
  return errorEnvelope(code, message, details, resolvedCorrelationId);
};
