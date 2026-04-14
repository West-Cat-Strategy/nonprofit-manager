import type { CorsOptions } from 'cors';

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

export const createCorsOptions = (input: {
  nodeEnv?: string;
  corsOrigin?: string;
  fallbackOrigins: string[];
  onDeniedOrigin?: (origin: string) => void;
}): CorsOptions => {
  const allowedOrigins = parseOriginList(input.corsOrigin, input.fallbackOrigins);
  validateCorsOrigins(allowedOrigins, input.nodeEnv);

  const options: CorsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalizedOrigin = normalizeOrigin(origin);

      if (
        input.nodeEnv === 'development' ||
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
  };

  return options;
};

export const requestSecurityHelpers = {
  createCorsOptions,
  resolveTrustProxy,
};

