import { describe, expect, it } from 'vitest';
import { adminRouteManifest } from '../adminRouteManifest';
import { getAdminSettingsPath } from '../adminRoutePaths';

const getRedirectEntry = (id: string) => {
  const entry = adminRouteManifest.find((route) => route.id === id);

  expect(entry).toBeDefined();
  expect(entry?.kind).toBe('redirect');

  if (!entry || entry.kind !== 'redirect') {
    throw new Error(`Expected redirect entry for ${id}`);
  }

  return entry;
};

describe('adminRouteManifest', () => {
  it('retargets legacy admin routes to their canonical destinations', () => {
    expect(getRedirectEntry('legacy-email-marketing').redirectsTo).toBe(
      '/settings/communications'
    );
    expect(getRedirectEntry('legacy-organization-settings').redirectsTo).toBe(
      getAdminSettingsPath('organization')
    );
    expect(getRedirectEntry('legacy-admin-audit-logs').redirectsTo).toBe(
      getAdminSettingsPath('audit_logs')
    );
  });
});
