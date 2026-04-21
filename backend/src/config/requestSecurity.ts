import type { CorsOptions, CorsOptionsDelegate } from 'cors';
import type { Request } from 'express';

const normalizeOrigin = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (trimmed === '*') return trimmed;

  try {
    return new URL(trimmed).origin.toLowerCase();
  } catch {
    return trimmed.toLowerCase();
  }
};

const parseOriginList = (value: string | undefined, fallbackOrigins: string[]): string[] => {
  const rawValue =
    typeof value === 'string' && value.trim().length > 0 ? value : fallbackOrigins.join(',');

  return rawValue
    .split(',')
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);
};

const validateCorsOrigins = (allowedOrigins: string[], nodeEnv: string | undefined): void => {
  if (nodeEnv !== 'development' && allowedOrigins.includes('*')) {
    throw new Error('CORS_ORIGIN cannot include "*" when credentials are enabled outside development');
  }
};

type CorsOptionsInput = {
  nodeEnv?: string;
  corsOrigin?: string;
  fallbackOrigins: string[];
  onDeniedOrigin?: (origin: string) => void;
  allowRequestHostOrigin?: boolean;
};

const resolveAllowedOrigins = (input: CorsOptionsInput): string[] => {
  const allowedOrigins = parseOriginList(input.corsOrigin, input.fallbackOrigins);
  validateCorsOrigins(allowedOrigins, input.nodeEnv);
  return allowedOrigins;
};

const resolveRequestOrigin = (request: Pick<Request, 'protocol' | 'get'>): string | null => {
  const forwardedProto = request.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const protocol = forwardedProto || request.protocol;
  const forwardedHost = request.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = forwardedHost || request.get('host')?.split(',')[0]?.trim();

  if (!protocol || !host) {
    return null;
  }

  return normalizeOrigin(`${protocol}://${host}`);
};

const buildCorsOptions = (
  input: CorsOptionsInput,
  allowedOrigins: string[],
  requestOrigin?: string | null
): CorsOptions => ({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    const normalizedOrigin = normalizeOrigin(origin);

    if (
      input.nodeEnv === 'development' ||
      (input.allowRequestHostOrigin && requestOrigin === normalizedOrigin) ||
      allowedOrigins.includes(normalizedOrigin) ||
      allowedOrigins.includes('*')
    ) {
      callback(null, true);
      return;
    }

    input.onDeniedOrigin?.(origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Organization-Id'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400,
  optionsSuccessStatus: 200,
});

export const resolveTrustProxy = (rawValue: string | undefined): boolean | number | string => {
  const raw = (rawValue || '').trim().toLowerCase();
  if (!raw) {
    return false;
  }

  if (raw === 'true') return true;
  if (raw === 'false') return false;

  const asNumber = Number(raw);
  if (Number.isInteger(asNumber) && asNumber >= 0) {
    return asNumber;
  }

  return raw;
};

export const createCorsOptions = (input: CorsOptionsInput): CorsOptions =>
  buildCorsOptions(input, resolveAllowedOrigins(input));

export const createCorsOptionsDelegate = (
  input: CorsOptionsInput
): CorsOptionsDelegate<Request> => {
  const allowedOrigins = resolveAllowedOrigins(input);

  return (req, callback) => {
    callback(null, buildCorsOptions(input, allowedOrigins, resolveRequestOrigin(req)));
  };
};

export const requestSecurityHelpers = {
  createCorsOptions,
  createCorsOptionsDelegate,
  resolveTrustProxy,
};
