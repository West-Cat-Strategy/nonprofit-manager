export interface ProductionSecurityValidationResult {
  warnings: string[];
  errors: string[];
  fatalErrors: string[];
}

const MANAGED_DB_PROVIDERS = new Set(['rds', 'cloudsql', 'azure', 'other']);

const isAbsolutePath = (value: string): boolean => value.startsWith('/');

export function validateProductionSecurityConfig(
  env: NodeJS.ProcessEnv
): ProductionSecurityValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const fatalErrors: string[] = [];

  if (env.NODE_ENV !== 'production') {
    return { warnings, errors, fatalErrors };
  }

  const jwtSecret = env.JWT_SECRET || '';
  if (jwtSecret.includes('dev') || jwtSecret.includes('placeholder') || jwtSecret.length < 32) {
    warnings.push(
      'JWT_SECRET appears insecure (contains "dev"/"placeholder" or is less than 32 characters)'
    );
  }

  if (env.DB_PASSWORD === 'postgres') {
    errors.push('DB_PASSWORD is set to default value "postgres"');
  }

  const csrfSecret = env.CSRF_SECRET || '';
  if (csrfSecret.includes('change') || csrfSecret.includes('placeholder') || csrfSecret.length < 32) {
    warnings.push(
      'CSRF_SECRET appears insecure (contains "change"/"placeholder" or is less than 32 characters)'
    );
  }

  const stripeWebhookSecret = env.STRIPE_WEBHOOK_SECRET || '';
  if (stripeWebhookSecret.includes('placeholder') || stripeWebhookSecret.includes('test')) {
    errors.push(
      'STRIPE_WEBHOOK_SECRET must be set to actual Stripe webhook secret (not placeholder or test value)'
    );
  }

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
  if (encryptionKey.length < 64) {
    warnings.push(
      'ENCRYPTION_KEY should be 64 hex characters (256-bit). Current length: ' + encryptionKey.length
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
