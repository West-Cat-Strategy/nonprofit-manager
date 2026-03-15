import { validateProductionSecurityConfig } from '@config/productionSecurityConfig';

describe('validateProductionSecurityConfig', () => {
  const baseEnv = {
    NODE_ENV: 'production',
    JWT_SECRET: '0123456789abcdef0123456789abcdef',
    CSRF_SECRET: 'fedcba9876543210fedcba9876543210',
    STRIPE_WEBHOOK_SECRET: 'whsec_live_webhook_secret',
    ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    DB_PASSWORD: 'super-secret-db-password',
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
