import { validateProductionSecurityConfig } from '@config/productionSecurityConfig';

describe('validateProductionSecurityConfig', () => {
  const validProductionEncryptionKey = [
    'abcdef0123456789',
    '0123456789abcdef',
    'fedcba9876543210',
    '0011223344556677',
  ].join('');
  const trackedExampleEncryptionKey = `${'1'.repeat(32)}${'2'.repeat(32)}`;
  const stripeKey = (prefix: string, mode: string, value: string): string =>
    `${prefix}_${mode}_${value}`;

  const baseEnv = {
    NODE_ENV: 'production',
    JWT_SECRET: 'super-secure-production-ready-jwt-secret-at-least-32-chars',
    CSRF_SECRET: 'super-secure-production-ready-csrf-secret-at-least-32-chars',
    HEALTH_CHECK_KEY: 'super-secure-production-health-key-at-least-32-chars',
    METRICS_AUTH_KEY: 'super-secure-production-metrics-key-at-least-32-chars',
    STRIPE_SECRET_KEY: stripeKey('sk', 'live', 'productionreadysecretkey'),
    STRIPE_PUBLISHABLE_KEY: stripeKey('pk', 'live', 'productionreadypublishablekey'),
    STRIPE_WEBHOOK_SECRET: stripeKey('whsec', 'live', 'webhook_secret'),
    ENCRYPTION_KEY: validProductionEncryptionKey,
    DB_PASSWORD: 'super-secret-db-password',
    PAYPAL_CLIENT_ID: 'paypal-client-id',
    PAYPAL_CLIENT_SECRET: 'paypal-client-secret',
    PAYPAL_WEBHOOK_ID: 'paypal-webhook-id',
    SQUARE_ACCESS_TOKEN: 'square-access-token',
    SQUARE_LOCATION_ID: 'square-location-id',
    SQUARE_WEBHOOK_SIGNATURE_KEY: 'square-webhook-key',
  } satisfies NodeJS.ProcessEnv;

  it('passes for a valid managed configuration', () => {
    const result = validateProductionSecurityConfig({
      ...baseEnv,
      DB_HOST: 'prod-db.example.com',
      DB_AT_REST_ENCRYPTION_MODE: 'managed',
      DB_AT_REST_PROVIDER: 'rds',
      DB_AT_REST_VERIFIED: 'true',
    });

    expect(result).toEqual({
      warnings: [],
      errors: [],
      fatalErrors: [],
    });
  });

  it('fails when production still uses the tracked example encryption key', () => {
    const result = validateProductionSecurityConfig({
      ...baseEnv,
      ENCRYPTION_KEY: trackedExampleEncryptionKey,
      DB_HOST: 'prod-db.example.com',
      DB_AT_REST_ENCRYPTION_MODE: 'managed',
      DB_AT_REST_PROVIDER: 'rds',
      DB_AT_REST_VERIFIED: 'true',
    });

    expect(result.errors).toContain(
      'ENCRYPTION_KEY is set to the tracked example key; generate a unique 64-character hex key for production'
    );
  });

  it('treats weak production JWT, CSRF, health, and metrics keys as fatal', () => {
    const result = validateProductionSecurityConfig({
      ...baseEnv,
      JWT_SECRET: 'dev-jwt-secret',
      CSRF_SECRET: 'change-me',
      HEALTH_CHECK_KEY: 'health-placeholder',
      METRICS_AUTH_KEY: '',
      DB_HOST: 'prod-db.example.com',
      DB_AT_REST_ENCRYPTION_MODE: 'managed',
      DB_AT_REST_PROVIDER: 'rds',
      DB_AT_REST_VERIFIED: 'true',
    });

    expect(result.fatalErrors).toEqual(
      expect.arrayContaining([
        'JWT_SECRET must be at least 32 characters and must not contain placeholder, dev, test, example, or change-me values in production',
        'CSRF_SECRET must be at least 32 characters and must not contain placeholder, dev, test, example, or change-me values in production',
        'HEALTH_CHECK_KEY must be at least 32 characters and must not contain placeholder, dev, test, example, or change-me values in production',
        'METRICS_AUTH_KEY must be set in production',
      ])
    );
  });

  it('fails only configured Stripe production keys that are incomplete or non-live', () => {
    const result = validateProductionSecurityConfig({
      ...baseEnv,
      STRIPE_SECRET_KEY: stripeKey('sk', 'test', 'not_allowed'),
      STRIPE_PUBLISHABLE_KEY: '',
      STRIPE_WEBHOOK_SECRET: stripeKey('whsec', 'test', 'placeholder'),
      DB_HOST: 'prod-db.example.com',
      DB_AT_REST_ENCRYPTION_MODE: 'managed',
      DB_AT_REST_PROVIDER: 'rds',
      DB_AT_REST_VERIFIED: 'true',
    });

    expect(result.fatalErrors).toEqual(
      expect.arrayContaining([
        'STRIPE_SECRET_KEY must be a live Stripe secret key when Stripe is configured in production',
        'STRIPE_PUBLISHABLE_KEY must be a live Stripe publishable key when Stripe is configured in production',
        'STRIPE_WEBHOOK_SECRET must be an actual Stripe webhook secret when Stripe is configured in production',
      ])
    );
  });

  it('allows production without Stripe keys when Stripe is not configured', () => {
    const result = validateProductionSecurityConfig({
      ...baseEnv,
      STRIPE_SECRET_KEY: '',
      STRIPE_PUBLISHABLE_KEY: '',
      STRIPE_WEBHOOK_SECRET: '',
      DB_HOST: 'prod-db.example.com',
      DB_AT_REST_ENCRYPTION_MODE: 'managed',
      DB_AT_REST_PROVIDER: 'rds',
      DB_AT_REST_VERIFIED: 'true',
    });

    expect(result.fatalErrors).toEqual([]);
  });

  it('fails when managed configuration is missing provider and verification attestation', () => {
    const result = validateProductionSecurityConfig({
      ...baseEnv,
      DB_HOST: 'prod-db.example.com',
      DB_AT_REST_ENCRYPTION_MODE: 'managed',
    });

    expect(result.fatalErrors).toEqual(
      expect.arrayContaining([
        'DB_AT_REST_PROVIDER must be one of: rds, cloudsql, azure, other when DB_AT_REST_ENCRYPTION_MODE=managed',
        'DB_AT_REST_VERIFIED must be set to "true" when DB_AT_REST_ENCRYPTION_MODE=managed',
      ])
    );
  });

  it('fails when managed configuration still points at the local postgres service', () => {
    const result = validateProductionSecurityConfig({
      ...baseEnv,
      DB_HOST: 'postgres',
      DB_AT_REST_ENCRYPTION_MODE: 'managed',
      DB_AT_REST_PROVIDER: 'rds',
      DB_AT_REST_VERIFIED: 'true',
    });

    expect(result.fatalErrors).toContain(
      'DB_HOST must not be "postgres" when DB_AT_REST_ENCRYPTION_MODE=managed'
    );
  });

  it('passes for a valid luks configuration', () => {
    const result = validateProductionSecurityConfig({
      ...baseEnv,
      DB_HOST: 'postgres',
      DB_AT_REST_ENCRYPTION_MODE: 'luks',
      POSTGRES_DATA_DIR: '/srv/nonprofit-manager/postgres',
      DB_LUKS_MAPPING_NAME: 'nonprofit-manager-db',
    });

    expect(result).toEqual({
      warnings: [],
      errors: [],
      fatalErrors: [],
    });
  });

  it('passes for a valid self-hosted configuration with explicit risk acceptance', () => {
    const result = validateProductionSecurityConfig({
      ...baseEnv,
      DB_HOST: 'postgres',
      DB_AT_REST_ENCRYPTION_MODE: 'self_hosted',
      POSTGRES_DATA_DIR: '/Users/bryan/nonprofit-manager-production/postgres',
      BACKUP_DIR: '/Users/bryan/nonprofit-manager-production/backups',
      SELF_HOSTED_DB_RISK_ACCEPTED: 'true',
    });

    expect(result.errors).toEqual([]);
    expect(result.fatalErrors).toEqual([]);
    expect(result.warnings).toEqual([
      'DB_AT_REST_ENCRYPTION_MODE=self_hosted relies on host-level safeguards; confirm disk and backup protections out of band',
    ]);
  });

  it('fails when luks configuration is missing mount details', () => {
    const result = validateProductionSecurityConfig({
      ...baseEnv,
      DB_HOST: 'postgres',
      DB_AT_REST_ENCRYPTION_MODE: 'luks',
      POSTGRES_DATA_DIR: 'srv/nonprofit-manager/postgres',
    });

    expect(result.fatalErrors).toEqual(
      expect.arrayContaining([
        'POSTGRES_DATA_DIR must be an absolute host path when DB_AT_REST_ENCRYPTION_MODE=luks',
        'DB_LUKS_MAPPING_NAME must be set when DB_AT_REST_ENCRYPTION_MODE=luks',
      ])
    );
  });

  it('fails when self-hosted configuration is missing absolute paths and risk acceptance', () => {
    const result = validateProductionSecurityConfig({
      ...baseEnv,
      DB_HOST: 'postgres',
      DB_AT_REST_ENCRYPTION_MODE: 'self_hosted',
      POSTGRES_DATA_DIR: 'Users/bryan/nonprofit-manager-production/postgres',
      BACKUP_DIR: 'Users/bryan/nonprofit-manager-production/backups',
    });

    expect(result.fatalErrors).toEqual(
      expect.arrayContaining([
        'POSTGRES_DATA_DIR must be an absolute host path when DB_AT_REST_ENCRYPTION_MODE=self_hosted',
        'BACKUP_DIR must be an absolute path when DB_AT_REST_ENCRYPTION_MODE=self_hosted',
        'SELF_HOSTED_DB_RISK_ACCEPTED must be set to "true" when DB_AT_REST_ENCRYPTION_MODE=self_hosted',
      ])
    );
  });

  it('treats missing PayPal and Square credentials as optional warnings', () => {
    const result = validateProductionSecurityConfig({
      ...baseEnv,
      DB_HOST: 'postgres',
      DB_AT_REST_ENCRYPTION_MODE: 'luks',
      POSTGRES_DATA_DIR: '/srv/nonprofit-manager/postgres',
      DB_LUKS_MAPPING_NAME: 'nonprofit-manager-db',
      PAYPAL_CLIENT_ID: '',
      PAYPAL_CLIENT_SECRET: '',
      PAYPAL_WEBHOOK_ID: '',
      SQUARE_ACCESS_TOKEN: '',
      SQUARE_LOCATION_ID: '',
      SQUARE_WEBHOOK_SIGNATURE_KEY: '',
    });

    expect(result.errors).toEqual([]);
    expect(result.fatalErrors).toEqual([]);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        'PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are not configured; PayPal payments will be disabled',
        'PAYPAL_WEBHOOK_ID is not configured; PayPal webhook handling will be disabled',
        'SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID are not configured; Square payments will be disabled',
        'SQUARE_WEBHOOK_SIGNATURE_KEY is not configured; Square webhook handling will be disabled',
      ])
    );
  });

  it('is non-blocking outside production', () => {
    const result = validateProductionSecurityConfig({
      NODE_ENV: 'development',
      DB_AT_REST_ENCRYPTION_MODE: 'managed',
    });

    expect(result).toEqual({
      warnings: [],
      errors: [],
      fatalErrors: [],
    });
  });
});
