import winston from 'winston';
import * as http from 'http';
import * as https from 'https';
import Transport from 'winston-transport';
import { getRequestContext } from '@config/requestContext';

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

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  requestContextInjector(),
  sensitiveDataMasker(),
  winston.format.splat(),
  winston.format.json()
);

// Custom HTTP transport for log aggregation (e.g., ELK, Loki, Datadog)
class HttpLogTransport extends Transport {
  private host: string;
  private port: number;
  private path: string;
  private protocol: string;

  constructor(options: any = {}) {
    super(options);
    this.host = options.host;
    this.port = options.port;
    this.path = options.path || '/logs';
    this.protocol = options.protocol || 'http';
  }

  log(info: any, callback?: () => void): void {
    setImmediate(() => {
      this.send(info).catch((error: Error) => {
        if (callback) {
          callback();
        }
        // Log transport errors to console without failing
        // eslint-disable-next-line no-console
        console.error('HttpLogTransport error:', error.message);
      });
    });

    if (callback) {
      callback();
    }
  }

  private async send(info: any): Promise<void> {
    try {
      const data = JSON.stringify({
        timestamp: new Date().toISOString(),
        level: info.level,
        message: info.message,
        service: info.service || 'nonprofit-manager-api',
        environment: process.env.NODE_ENV || 'development',
        version: process.env.RELEASE_VERSION || '1.0.0',
        ...info,
      });

      const options = {
        hostname: this.host,
        port: this.port,
        path: this.path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'X-API-Key': process.env.LOG_AGGREGATION_API_KEY || '',
        },
      };

      const protocol = this.protocol === 'https' ? https : http;
      const request = protocol.request(options, (response) => {
        if (response.statusCode && response.statusCode > 299) {
          // eslint-disable-next-line no-console
          console.error(`Log aggregation returned status ${response.statusCode}`);
        }
        response.on('data', () => { });
        response.on('end', () => { });
      });

      request.on('error', (error: Error) => {
        // eslint-disable-next-line no-console
        console.error('Failed to send logs to aggregation service:', error.message);
      });

      request.write(data);
      request.end();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error sending log to aggregation service:', error instanceof Error ? error.message : String(error));
    }
  }
}

const transports: winston.transport[] = [
  new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
  new winston.transports.File({ filename: 'logs/combined.log' }),
];

// Add log aggregation transport if configured
if (process.env.LOG_AGGREGATION_ENABLED === 'true' && process.env.LOG_AGGREGATION_HOST) {
  (transports as any).push(
    new HttpLogTransport({
      host: process.env.LOG_AGGREGATION_HOST,
      port: parseInt(process.env.LOG_AGGREGATION_PORT || '8080'),
      path: process.env.LOG_AGGREGATION_PATH || '/logs',
      protocol: process.env.LOG_AGGREGATION_PROTOCOL || 'http',
    })
  );
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
