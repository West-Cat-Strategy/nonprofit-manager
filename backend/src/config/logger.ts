import winston from 'winston';

// Fields that should be masked in logs
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'authorization',
  'api_key',
  'apiKey',
  'credit_card',
  'creditCard',
  'card_number',
  'cardNumber',
  'cvv',
  'ssn',
  'social_security',
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

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  sensitiveDataMasker(),
  winston.format.splat(),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'nonprofit-manager-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    })
  );
}

// Export masking function for testing and other uses
export { maskSensitiveData, SENSITIVE_FIELDS };
