/**
 * Sentry-compatible integration for error tracking
 * 
 * Provides centralized error and performance monitoring.
 * Automatically captures:
 * - Unhandled exceptions
 * - Promise rejections
 * - Performance metrics
 * - Request/response data
 * 
 * PII Handling: Sentry-compatible collectors may redact some fields, and we add extra scrubbing.
 * 
 * Setup:
 * 1. Install: npm install @sentry/node
 * 2. Enable: Set SENTRY_DSN in .env.production
 * 3. Verify: Check events in a Sentry-compatible backend such as GlitchTip
 */

import * as Sentry from '@sentry/node';
import { nodeContextIntegration } from '@sentry/node';
import { logger } from './logger';

let sentryInitialized = false;

/**
 * Initialize Sentry-compatible error tracking
 * 
 * Can be called multiple times safely (only initializes once).
 */
export function initializeSentry(): void {
  // Initialize only when a Sentry-compatible DSN is configured.
  if (sentryInitialized) {
    return;
  }

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    logger.debug('Sentry-compatible error tracking is not configured (SENTRY_DSN not set)');
    return;
  }

  try {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% sampling in prod
      // Capture 100% of errors regardless of transaction sampling
      integrations: [
        Sentry.httpIntegration(),
        nodeContextIntegration(),
      ],
      // Before-send hook for scrubbing PII before provider ingestion.
      beforeSend: (event: Sentry.ErrorEvent, _hint: Sentry.EventHint) => {
        // Redact sensitive fields from all events
        return scrubbSentryEvent(event, _hint) as Sentry.ErrorEvent;
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
    logger.info('Sentry-compatible error tracking initialized', {
      environment: process.env.NODE_ENV,
      hasDsn: true,
    });
  } catch (error) {
    logger.error('Failed to initialize Sentry-compatible error tracking', { error });
  }
}

/**
 * Scrub PII from Sentry-compatible events before sending
 * 
 * Providers can have automatic scrubbing, but we add extra protection.
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
    event.request = scrubObject(event.request) as any;
  }

  // Scrub breadcrumbs
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((crumb: Sentry.Breadcrumb) => ({
      ...crumb,
      data: crumb.data ? (scrubObject(crumb.data) as Record<string, any>) : crumb.data,
    }));
  }

  // Scrub exception values
  if (event.exception?.values) {
    event.exception.values = event.exception.values.map((exception: Sentry.Exception) => ({
      ...exception,
      value: exception.value ? exception.value.substring(0, 200) : exception.value,
    }));
  }

  // Scrub context
  if (event.contexts) {
    event.contexts = scrubObject(event.contexts) as any;
  }

  // Scrub extra data
  if (event.extra) {
    event.extra = scrubObject(event.extra) as Record<string, unknown>;
  }

  return event;
}

/**
 * Capture an exception with the configured error-tracking provider
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
 * Capture a message with the configured error-tracking provider
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
export function startTransaction(name: string, op?: string): any {
  if (!sentryInitialized) {
    return null;
  }

  return Sentry.startSpan({
    name,
    op,
  }, (span: any) => span);
}

/**
 * Set user context for error tracking
 * 
 * Prefer opaque user IDs. Email is intentionally ignored unless a future support
 * workflow documents why provider-side email context is required.
 */
export function setUserContext(userId: string | null, _email?: string): void {
  if (!sentryInitialized) {
    return;
  }

  if (userId) {
    Sentry.setUser({
      id: userId,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Express middleware for Sentry integration
 * 
 * Captures request/response and errors in Express middleware chain.
 */
export function sentryRequestHandler() {
  return (_req: any, _res: any, next: any) => next(); // Handled by @sentry/node automatic integration in v10
}

export function sentryErrorHandler(app: any) {
  Sentry.setupExpressErrorHandler(app);
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
