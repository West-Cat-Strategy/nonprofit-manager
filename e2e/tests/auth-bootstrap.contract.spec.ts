import { expect, test } from '@playwright/test';
import {
  getConfiguredAdminCredentials,
  isCompatibleAdminAuthBootstrapCache,
  resolveDefaultAdminCredentialProfiles,
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
    const primary = getConfiguredAdminCredentials();

    expect(
      isCompatibleAdminAuthBootstrapCache(primary, {
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
    const primary = getConfiguredAdminCredentials();

    expect(
      isCompatibleAdminAuthBootstrapCache(primary, {
        admin: { email: 'admin@example.com', password: 'Admin123!@#' },
        session: {
          email: 'admin@example.com',
          password: 'Admin123!@#',
          user: { role: 'admin' },
        },
      })
    ).toBe(true);
  });
});
