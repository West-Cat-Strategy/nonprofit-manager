import { expect, test } from '@playwright/test';
import {
  isCompatibleAdminAuthBootstrapCache,
  resolveDefaultAdminCredentialProfiles,
  shouldRecoverRlsVerificationOnlyAdminBootstrap,
} from '../helpers/auth';

test.describe('Admin Bootstrap Contract', () => {
  test('playwright-managed host prefers the setup admin with Docker fallback only as alternate', () => {
    const { primary, alternate } = resolveDefaultAdminCredentialProfiles({
      dockerBackedRun: false,
    });

    expect(primary.runtimeProfile).toBe('playwright-managed');
    expect(primary.password).toBe('Admin123!@#');
    expect(alternate?.runtimeProfile).toBe('docker-seeded');
    expect(alternate?.password).toBe('password123');
  });

  test('setupRequired=true on Docker prefers strong first-time setup credentials', () => {
    const { primary, alternate } = resolveDefaultAdminCredentialProfiles({
      dockerBackedRun: true,
      setupRequired: true,
    });

    expect(primary.runtimeProfile).toBe('docker-setup');
    expect(primary.password).toBe('Admin123!@#');
    expect(alternate?.runtimeProfile).toBe('docker-seeded');
    expect(alternate?.password).toBe('password123');
  });

  test('setupRequired=false on Docker prefers seeded admin login with strong fallback', () => {
    const { primary, alternate } = resolveDefaultAdminCredentialProfiles({
      dockerBackedRun: true,
      setupRequired: false,
    });

    expect(primary.runtimeProfile).toBe('docker-seeded');
    expect(primary.password).toBe('password123');
    expect(alternate?.runtimeProfile).toBe('docker-setup');
    expect(alternate?.password).toBe('Admin123!@#');
  });

  test('Playwright-managed host admin rejects stale docker bootstrap cache state', () => {
    const hostContract = {
      email: 'admin@example.com',
      password: 'Admin123!@#',
    };

    expect(
      isCompatibleAdminAuthBootstrapCache(hostContract, {
        admin: { email: 'admin@example.com', password: 'password123' },
        session: {
          email: 'admin@example.com',
          password: 'password123',
          user: { role: 'admin' },
        },
      })
    ).toBe(false);
  });

  test('Playwright-managed host admin keeps the Admin123!@# cache contract', () => {
    const hostContract = {
      email: 'admin@example.com',
      password: 'Admin123!@#',
    };

    expect(
      isCompatibleAdminAuthBootstrapCache(hostContract, {
        admin: { email: 'admin@example.com', password: 'Admin123!@#' },
        session: {
          email: 'admin@example.com',
          password: 'Admin123!@#',
          user: { role: 'admin' },
        },
      })
    ).toBe(true);
  });

  test('matching cached credentials are rejected when the cached session is not admin-capable', () => {
    const hostContract = {
      email: 'admin@example.com',
      password: 'Admin123!@#',
    };

    expect(
      isCompatibleAdminAuthBootstrapCache(hostContract, {
        admin: { email: 'admin@example.com', password: 'Admin123!@#' },
        session: {
          email: 'admin@example.com',
          password: 'Admin123!@#',
          user: { role: 'staff' },
        },
      })
    ).toBe(false);
  });

  test('Playwright-managed host can recover from RLS-only verification admin state', () => {
    expect(
      shouldRecoverRlsVerificationOnlyAdminBootstrap({
        setupRequired: false,
        adminRows: [
          {
            id: '00000000-0000-4000-8000-000000000102',
            email: 'rls-admin@example.test',
            password_hash: 'verification-only',
            role: 'admin',
          },
        ],
      })
    ).toBe(true);
  });

  test('RLS verification recovery is blocked when a real admin exists', () => {
    expect(
      shouldRecoverRlsVerificationOnlyAdminBootstrap({
        setupRequired: false,
        adminRows: [
          {
            id: '11111111-1111-1111-1111-111111111111',
            email: 'admin@example.com',
            password_hash: '$2a$10$ylcNfn/4fZuCN5MGbXCLV.trRFYhylZ2p9Pl5/3e0HsPu4eZJ0ZGS',
            role: 'admin',
          },
        ],
      })
    ).toBe(false);
  });

  test('RLS verification recovery is blocked by explicit admin credentials', () => {
    expect(
      shouldRecoverRlsVerificationOnlyAdminBootstrap({
        setupRequired: false,
        explicitAdminCredentialOverride: true,
        adminRows: [
          {
            id: '00000000-0000-4000-8000-000000000102',
            email: 'rls-admin@example.test',
            password_hash: 'verification-only',
            role: 'admin',
          },
        ],
      })
    ).toBe(false);
  });

  test('RLS verification recovery is blocked for externally managed auth runtimes', () => {
    expect(
      shouldRecoverRlsVerificationOnlyAdminBootstrap({
        setupRequired: false,
        allowExternallyManagedAuthFallbacks: true,
        adminRows: [
          {
            id: '00000000-0000-4000-8000-000000000102',
            email: 'rls-admin@example.test',
            password_hash: 'verification-only',
            role: 'admin',
          },
        ],
      })
    ).toBe(false);
  });
});
