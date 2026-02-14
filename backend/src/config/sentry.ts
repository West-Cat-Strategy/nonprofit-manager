/**
 * Sentry Integration for Error Tracking
 * 
 * Provides centralized error and performance monitoring.
 * Automatically captures:
 * - Unhandled exceptions
 * - Promise rejections
 * - Performance metrics
 * - Request/response data
 * 
 * PII Handling: Sentry automatically redacts some fields, but we add extra scrubbing.
 * 
 * Setup:
 * 1. Install: npm install @sentry/node @sentry/tracing
 * 2. Enable: Set SENTRY_DSN in .env.production
 * 3. Verify: Check events in https://sentry.io
 */

import * as Sentry from '@sentry/node';
import { logger } from './logger';

let sentryInitialized = false;

/**
 * Initialize Sentry error tracking
 * 
 * Can be called multiple times safely (only initializes once).
 */
export function initializeSentry(): void {
  // Only initialize in production with DSN
  if (sentryInitialized) {
    return;
  }

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    logger.debug('Sentry is not configured (SENTRY_DSN not set)');
    return;
  }

  try {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% sampling in prod
      // Capture 100% of errors regardless of transaction sampling
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.OnUncaughtException(),
        new Sentry.Integrations.OnUnhandledRejection(),
      ],
      // Beforehand hooks for scrubbing PII before sending
      beforeSend: (event, hint) => {
        // Redact sensitive fields from all events
        return scrubbSentryEvent(event, hint);
      },
      // Configure allowed URLs (to ignore external service errors)
      allowUrls: [new RegExp(`^${(process.env.API_ORIGIN || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)],
      // Ignore specific errors
      ignoreErrors: [
        // Browser extensions
        'top.GLOBALS',
        // Random browser errors
        'Non-Error promise rejection captured', // Could filter to Error instead
      ],
      // Attach stack traces to all messages
      attachStacktrace: true,
      // Release version (Git commit hash recommended)
      release: process.env.RELEASE_VERSION || 'unknown',
    });

    sentryInitialized = true;
    logger.info('Sentry initialized for error tracking', { dsn, environment: process.env.NODE_ENV });
  } catch (error) {
    logger.error('Failed to initialize Sentry', { error });
  }
}

/**
 * Scrub PII from Sentry events before sending
 * 
 * Sentry has automatic scrubbing, but we add extra protection.
 */
function scrubbSentryEvent(event: Sentry.Event, _hint: Sentry.EventHint): Sentry.Event | null {
  // List of sensitive field names to redact
  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'api_key',
    'apiKey',
    'auth',
    'authorization',
    'credit_card',
    'creditCard',
    'ssn',
    'social_security_number',
    'cvv',
    'phone',
    'email',
    'home_address',
    'homeAddress',
    'stripe_secret',
    'stripeSecret',
    'stripe_token',
    'webhook_secret',
    'webhookSecret',
    'encryption_key',
    'encryptionKey',
    'db_password',
    'dbPassword',
    'redis_url',
    'redisUrl',
  ];

  /**
   * Recursively scrub an object's values
   */
  const scrubObject = (obj: unknown): unknown => {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(scrubObject);
    }

    const scrubbed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      // Check if key is sensitive
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        scrubbed[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        scrubbed[key] = scrubObject(value);
      } else if (typeof value === 'string' && value.length > 100) {
        // Redact long strings that might contain sensitive data
        scrubbed[key] = value.substring(0, 50) + '...[REDACTED]';
      } else {
        scrubbed[key] = value;
      }
    }
    return scrubbed;
  };

  // Scrub request data
  if (event.request) {
    event.request = scrubObject(event.request) as Sentry.Request;
  }

  // Scrub breadcrumbs
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map(crumb => ({
      ...crumb,
      data: crumb.data ? scrubObject(crumb.data) : crumb.data,
    }));
  }

  // Scrub exception values
  if (event.exception) {
    event.exception = event.exception.map(exception => ({
      ...exception,
      value: exception.value ? exception.value.substring(0, 200) : exception.value,
    }));
  }

  // Scrub context
  if (event.contexts) {
    event.contexts = scrubObject(event.contexts) as Record<string, unknown>;
  }

  // Scrub extra data
  if (event.extra) {
    event.extra = scrubObject(event.extra) as Record<string, unknown>;
  }

  return event;
}

/**
 * Capture an exception with Sentry
 */
export function captureException(error: Error, context?: Record<string, unknown>): void {
  if (!sentryInitialized) {
    return;
  }

  Sentry.captureException(error, {
    contexts: {
      custom: context,
    },
  });
}

/**
 * Capture a message with Sentry
 */
export function captureMessage(message: string, level: 'fatal' | 'error' | 'warning' | 'info' = 'info'): void {
  if (!sentryInitialized) {
    return;
  }

  Sentry.captureMessage(message, level);
}

/**
 * Start a transaction for performance monitoring
 */
export function startTransaction(name: string, op?: string): Sentry.Transaction | null {
  if (!sentryInitialized) {
    return null;
  }

  return Sentry.startTransaction({
    name,
    op,
  });
}

/**
 * Set user context for error tracking
 * 
 * Helps identify which users are affected by errors.
 */
export function setUserContext(userId: string | null, email?: string): void {
  if (!sentryInitialized) {
    return;
  }

  if (userId) {
    Sentry.setUser({
      id: userId,
      email: email || undefined,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Express middleware for Sentry integration
 * 
 * Captures request/response and errors in Express middleware chain.
 * Should be added near the top of middleware, after body parsing.
 */
export function sentryRequestHandler() {
  if (!sentryInitialized) {
    return (_req: any, _res: any, next: any) => next();
  }
  return Sentry.Handlers.requestHandler();
}

export function sentryErrorHandler() {
  if (!sentryInitialized) {
    return (_err: any, _req: any, _res: any, next: any) => next();
  }
  return Sentry.Handlers.errorHandler();
}

export default {
  initializeSentry,
  captureException,
  captureMessage,
  startTransaction,
  setUserContext,
  sentryRequestHandler,
  sentryErrorHandler,
};
