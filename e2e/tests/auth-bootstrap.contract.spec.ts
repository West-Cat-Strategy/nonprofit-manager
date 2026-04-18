import { expect, test } from '@playwright/test';
import { resolveDefaultAdminCredentialProfiles } from '../helpers/auth';

test.describe('Admin Bootstrap Contract', () => {
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
});
