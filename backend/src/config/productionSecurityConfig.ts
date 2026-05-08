export interface ProductionSecurityValidationResult {
  warnings: string[];
  errors: string[];
  fatalErrors: string[];
}

const MANAGED_DB_PROVIDERS = new Set(['rds', 'cloudsql', 'azure', 'other']);
const INSECURE_EXAMPLE_ENCRYPTION_KEYS = new Set([
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  '1111111111111111111111111111111122222222222222222222222222222222',
]);

const isAbsolutePath = (value: string): boolean => value.startsWith('/');
const hasPlaceholderValue = (value: string): boolean =>
  /change|changeme|default|dev|example|placeholder|test|your_|not-for-production/i.test(value);

const validateRequiredSecret = (
  env: NodeJS.ProcessEnv,
  key: string,
  fatalErrors: string[]
): void => {
  const value = (env[key] || '').trim();
  if (!value) {
    fatalErrors.push(`${key} must be set in production`);
    return;
  }

  if (value.length < 32 || hasPlaceholderValue(value)) {
    fatalErrors.push(
      `${key} must be at least 32 characters and must not contain placeholder, dev, test, example, or change-me values in production`
    );
  }
};

const validateOptionalStripeConfig = (
  env: NodeJS.ProcessEnv,
  fatalErrors: string[]
): void => {
  const stripeSecretKey = (env.STRIPE_SECRET_KEY || '').trim();
  const stripePublishableKey = (env.STRIPE_PUBLISHABLE_KEY || '').trim();
  const stripeWebhookSecret = (env.STRIPE_WEBHOOK_SECRET || '').trim();
  const stripeValues = [stripeSecretKey, stripePublishableKey, stripeWebhookSecret];

  if (!stripeValues.some(Boolean)) {
    return;
  }

  if (!/^sk_live_[A-Za-z0-9_]+$/.test(stripeSecretKey)) {
    fatalErrors.push(
      'STRIPE_SECRET_KEY must be a live Stripe secret key when Stripe is configured in production'
    );
  }

  if (!/^pk_live_[A-Za-z0-9_]+$/.test(stripePublishableKey)) {
    fatalErrors.push(
      'STRIPE_PUBLISHABLE_KEY must be a live Stripe publishable key when Stripe is configured in production'
    );
  }

  if (!/^whsec_[A-Za-z0-9_]+$/.test(stripeWebhookSecret) || hasPlaceholderValue(stripeWebhookSecret)) {
    fatalErrors.push(
      'STRIPE_WEBHOOK_SECRET must be an actual Stripe webhook secret when Stripe is configured in production'
    );
  }
};

export function validateProductionSecurityConfig(
  env: NodeJS.ProcessEnv
): ProductionSecurityValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const fatalErrors: string[] = [];

  if (env.NODE_ENV !== 'production') {
    return { warnings, errors, fatalErrors };
  }

  if (env.EXPOSE_AUTH_TOKENS_IN_RESPONSE === 'true') {
    fatalErrors.push(
      'EXPOSE_AUTH_TOKENS_IN_RESPONSE must not be set to "true" in production; it bypasses HTTP-only cookie protection for auth tokens'
    );
  }

  validateRequiredSecret(env, 'JWT_SECRET', fatalErrors);
  validateRequiredSecret(env, 'CSRF_SECRET', fatalErrors);
  validateRequiredSecret(env, 'HEALTH_CHECK_KEY', fatalErrors);
  validateRequiredSecret(env, 'METRICS_AUTH_KEY', fatalErrors);

  if (env.DB_PASSWORD === 'postgres') {
    errors.push('DB_PASSWORD is set to default value "postgres"');
  }

  validateOptionalStripeConfig(env, fatalErrors);

  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
    warnings.push(
      'PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are not configured; PayPal payments will be disabled'
    );
  }

  if (!env.PAYPAL_WEBHOOK_ID) {
    warnings.push(
      'PAYPAL_WEBHOOK_ID is not configured; PayPal webhook handling will be disabled'
    );
  }

  if (!env.SQUARE_ACCESS_TOKEN || !env.SQUARE_LOCATION_ID) {
    warnings.push(
      'SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID are not configured; Square payments will be disabled'
    );
  }

  if (!env.SQUARE_WEBHOOK_SIGNATURE_KEY) {
    warnings.push(
      'SQUARE_WEBHOOK_SIGNATURE_KEY is not configured; Square webhook handling will be disabled'
    );
  }

  const encryptionKey = env.ENCRYPTION_KEY || '';
  if (!/^[0-9a-f]{64}$/i.test(encryptionKey)) {
    errors.push('ENCRYPTION_KEY must be exactly 64 hexadecimal characters in production');
  } else if (INSECURE_EXAMPLE_ENCRYPTION_KEYS.has(encryptionKey.toLowerCase())) {
    errors.push(
      'ENCRYPTION_KEY is set to the tracked example key; generate a unique 64-character hex key for production'
    );
  }

  const dbMode = (env.DB_AT_REST_ENCRYPTION_MODE || '').trim().toLowerCase();

  if (!dbMode) {
    fatalErrors.push(
      'DB_AT_REST_ENCRYPTION_MODE must be set to "managed", "luks", or "self_hosted" in production'
    );
    return { warnings, errors, fatalErrors };
  }

  if (dbMode === 'managed') {
    const provider = (env.DB_AT_REST_PROVIDER || '').trim().toLowerCase();
    const dbHost = (env.DB_HOST || '').trim();

    if (!dbHost) {
      fatalErrors.push('DB_HOST must be set for managed production databases');
    } else if (dbHost === 'postgres') {
      fatalErrors.push(
        'DB_HOST must not be "postgres" when DB_AT_REST_ENCRYPTION_MODE=managed'
      );
    }

    if (!provider || !MANAGED_DB_PROVIDERS.has(provider)) {
      fatalErrors.push(
        'DB_AT_REST_PROVIDER must be one of: rds, cloudsql, azure, other when DB_AT_REST_ENCRYPTION_MODE=managed'
      );
    }

    if (env.DB_AT_REST_VERIFIED !== 'true') {
      fatalErrors.push(
        'DB_AT_REST_VERIFIED must be set to "true" when DB_AT_REST_ENCRYPTION_MODE=managed'
      );
    }
  } else if (dbMode === 'luks') {
    const dbHost = (env.DB_HOST || '').trim();
    const postgresDataDir = (env.POSTGRES_DATA_DIR || '').trim();
    const luksMapping = (env.DB_LUKS_MAPPING_NAME || '').trim();

    if (dbHost !== 'postgres') {
      fatalErrors.push(
        'DB_HOST must be set to "postgres" when DB_AT_REST_ENCRYPTION_MODE=luks'
      );
    }

    if (!postgresDataDir) {
      fatalErrors.push(
        'POSTGRES_DATA_DIR must be set when DB_AT_REST_ENCRYPTION_MODE=luks'
      );
    } else if (!isAbsolutePath(postgresDataDir)) {
      fatalErrors.push(
        'POSTGRES_DATA_DIR must be an absolute host path when DB_AT_REST_ENCRYPTION_MODE=luks'
      );
    }

    if (!luksMapping) {
      fatalErrors.push(
        'DB_LUKS_MAPPING_NAME must be set when DB_AT_REST_ENCRYPTION_MODE=luks'
      );
    }
  } else if (dbMode === 'self_hosted') {
    const dbHost = (env.DB_HOST || '').trim();
    const postgresDataDir = (env.POSTGRES_DATA_DIR || '').trim();
    const backupDir = (env.BACKUP_DIR || '').trim();
    const riskAccepted = (env.SELF_HOSTED_DB_RISK_ACCEPTED || '').trim().toLowerCase();

    if (dbHost !== 'postgres') {
      fatalErrors.push(
        'DB_HOST must be set to "postgres" when DB_AT_REST_ENCRYPTION_MODE=self_hosted'
      );
    }

    if (!postgresDataDir) {
      fatalErrors.push(
        'POSTGRES_DATA_DIR must be set when DB_AT_REST_ENCRYPTION_MODE=self_hosted'
      );
    } else if (!isAbsolutePath(postgresDataDir)) {
      fatalErrors.push(
        'POSTGRES_DATA_DIR must be an absolute host path when DB_AT_REST_ENCRYPTION_MODE=self_hosted'
      );
    }

    if (!backupDir) {
      fatalErrors.push(
        'BACKUP_DIR must be set when DB_AT_REST_ENCRYPTION_MODE=self_hosted'
      );
    } else if (!isAbsolutePath(backupDir)) {
      fatalErrors.push(
        'BACKUP_DIR must be an absolute path when DB_AT_REST_ENCRYPTION_MODE=self_hosted'
      );
    }

    if (riskAccepted !== 'true') {
      fatalErrors.push(
        'SELF_HOSTED_DB_RISK_ACCEPTED must be set to "true" when DB_AT_REST_ENCRYPTION_MODE=self_hosted'
      );
    }

    warnings.push(
      'DB_AT_REST_ENCRYPTION_MODE=self_hosted relies on host-level safeguards; confirm disk and backup protections out of band'
    );
  } else {
    fatalErrors.push(
      'DB_AT_REST_ENCRYPTION_MODE must be set to "managed", "luks", or "self_hosted" in production'
    );
  }

  return { warnings, errors, fatalErrors };
}
