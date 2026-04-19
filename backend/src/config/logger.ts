import winston from 'winston';
import * as fs from 'fs';
import * as path from 'path';
import type { TransformableInfo } from 'logform';
import { getRequestContext } from '@config/requestContext';

// Fields that should be masked in logs
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'authorization',
  'api_key',
  'apiKey',
  'email',
  'phone',
  'mobile',
  'address',
  'street',
  'postal_code',
  'postalCode',
  'zip_code',
  'zipcode',
  'postcode',
  'first_name',
  'firstName',
  'last_name',
  'lastName',
  'full_name',
  'fullName',
  'given_name',
  'givenName',
  'family_name',
  'familyName',
  'dob',
  'date_of_birth',
  'dateOfBirth',
  'birth_date',
  'birthDate',
  'birthdate',
  'credit_card',
  'creditCard',
  'card_number',
  'cardNumber',
  'cvv',
  'ssn',
  'social_security',
  'phn',
  'personal_health_number',
  'health_number',
  'stripe_secret',
  'stripeSecret',
  'webhook_secret',
  'webhookSecret',
  'client_secret',
  'clientSecret',
];

// Mask sensitive data in objects
const maskSensitiveData = (obj: unknown): unknown => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(maskSensitiveData);
  }

  const masked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()))) {
      masked[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskSensitiveData(value);
    } else {
      masked[key] = value;
    }
  }

  return masked;
};

const SPLAT_SYMBOL = Symbol.for('splat');

const sanitizeSplatValue = (value: unknown): unknown => {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeSplatValue);
  }

  if (typeof value === 'object') {
    const masked: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      masked[key] = sanitizeSplatValue(nestedValue);
    }
    return masked;
  }

  return '[REDACTED]';
};

const sanitizeSplatArgs = winston.format((info: TransformableInfo) => {
  const splatInfo = info as TransformableInfo & Record<symbol, unknown>;
  const splatValue = splatInfo[SPLAT_SYMBOL];

  if (splatValue === undefined) {
    return info;
  }

  if (Array.isArray(splatValue)) {
    splatInfo[SPLAT_SYMBOL] = splatValue.map(sanitizeSplatValue);
  } else {
    splatInfo[SPLAT_SYMBOL] = sanitizeSplatValue(splatValue);
  }

  return splatInfo;
});

// Custom format to mask sensitive data
const sensitiveDataMasker = winston.format((info) => {
  // Mask any metadata objects
  if (info.metadata && typeof info.metadata === 'object') {
    info.metadata = maskSensitiveData(info.metadata);
  }

  // Mask any additional properties
  const maskedInfo = { ...info };
  for (const [key, value] of Object.entries(maskedInfo)) {
    if (key !== 'level' && key !== 'message' && key !== 'timestamp' && key !== 'service') {
      if (typeof value === 'object' && value !== null) {
        maskedInfo[key] = maskSensitiveData(value);
      } else if (typeof value === 'string') {
        const lowerKey = key.toLowerCase();
        if (SENSITIVE_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()))) {
          maskedInfo[key] = '[REDACTED]';
        }
      }
    }
  }

  return maskedInfo;
});

const requestContextInjector = winston.format((info) => {
  const context = getRequestContext();
  if (!context) {
    return info;
  }

  if (context.correlationId && !info.correlationId) {
    info.correlationId = context.correlationId;
  }
  if (context.userId && !info.userId) {
    info.userId = context.userId;
  }
  if (context.organizationId && !info.organizationId) {
    info.organizationId = context.organizationId;
  }
  if (context.accountId && !info.accountId) {
    info.accountId = context.accountId;
  }
  if (context.tenantId && !info.tenantId) {
    info.tenantId = context.tenantId;
  }

  return info;
});

export const createLogFormat = () =>
  winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    requestContextInjector(),
    sanitizeSplatArgs(),
    winston.format.splat(),
    sensitiveDataMasker(),
    winston.format.json()
  );

const logFormat = createLogFormat();

const parsePositiveInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const logDirectory = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
const enableFileLogging =
  process.env.ENABLE_FILE_LOGGING === 'true' ||
  (process.env.ENABLE_FILE_LOGGING !== 'false' && process.env.NODE_ENV === 'production');

const maxFileSizeBytes = parsePositiveInteger(
  process.env.LOG_FILE_MAX_BYTES,
  10 * 1024 * 1024
);
const maxFileCount = parsePositiveInteger(process.env.LOG_FILE_MAX_FILES, 5);

const transports: winston.transport[] = [];

if (enableFileLogging) {
  fs.mkdirSync(logDirectory, { recursive: true });

  transports.push(
    new winston.transports.File({
      filename: path.join(logDirectory, 'error.log'),
      level: 'error',
      maxsize: maxFileSizeBytes,
      maxFiles: maxFileCount,
      tailable: true,
    }),
    new winston.transports.File({
      filename: path.join(logDirectory, 'combined.log'),
      maxsize: maxFileSizeBytes,
      maxFiles: maxFileCount,
      tailable: true,
    })
  );
}

// Add log aggregation transport if configured
if (process.env.LOG_AGGREGATION_ENABLED === 'true' && process.env.LOG_AGGREGATION_HOST) {
  const httpTransport = new winston.transports.Http({
      host: process.env.LOG_AGGREGATION_HOST,
      port: parseInt(process.env.LOG_AGGREGATION_PORT || '8080'),
      path: process.env.LOG_AGGREGATION_PATH || '/logs',
      protocol: process.env.LOG_AGGREGATION_PROTOCOL || 'http',
      headers: {
        'X-API-Key': process.env.LOG_AGGREGATION_API_KEY || '',
      },
      ssl: process.env.LOG_AGGREGATION_PROTOCOL === 'https',
    } as unknown as winston.transports.HttpTransportOptions);

  httpTransport.on('warn', (info) => {
    // Keep aggregation failures visible without failing application logging.
    // eslint-disable-next-line no-console
    console.error('Log aggregation warning:', String(info.message ?? info));
  });

  httpTransport.on('error', (error) => {
    // Keep aggregation failures visible without throwing from logger initialization.
    // eslint-disable-next-line no-console
    console.error('Log aggregation error:', error instanceof Error ? error.message : String(error));
  });

  (transports as any).push(httpTransport);
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'nonprofit-manager-api' },
  transports,
});

if (process.env.NODE_ENV !== 'production' || process.env.CONSOLE_LOGGING === 'true') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

// Export masking function for testing and other uses
export { maskSensitiveData, SENSITIVE_FIELDS };
