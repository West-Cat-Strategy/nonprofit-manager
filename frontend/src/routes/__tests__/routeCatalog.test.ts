import { describe, expect, it } from 'vitest';
import {
  matchRouteCatalogEntry,
  resolveRouteCatalogAlias,
} from '../routeCatalog';

describe('routeCatalog alias resolution', () => {
  it('returns null for already canonical locations', () => {
    expect(resolveRouteCatalogAlias('/settings/admin/users')).toBeNull();
    expect(resolveRouteCatalogAlias('/settings/email-marketing')).toBeNull();
  });

  it('canonicalizes legacy admin query routes and preserves unrelated params', () => {
    expect(resolveRouteCatalogAlias('/settings/admin?section=users')).toBe(
      '/settings/admin/users'
    );
    expect(resolveRouteCatalogAlias('/settings/admin?section=users&foo=1')).toBe(
      '/settings/admin/users?foo=1'
    );
  });

  it('canonicalizes bare admin and portal roots', () => {
    expect(resolveRouteCatalogAlias('/settings/admin')).toBe('/settings/admin/dashboard');
    expect(resolveRouteCatalogAlias('/settings/admin/portal')).toBe(
      '/settings/admin/portal/access'
    );
  });

  it('canonicalizes retired aliases to their current settings routes', () => {
    expect(resolveRouteCatalogAlias('/email-marketing?ref=legacy')).toBe(
      '/settings/email-marketing?ref=legacy'
    );
    expect(resolveRouteCatalogAlias('/settings/organization')).toBe(
      '/settings/admin/organization'
    );
    expect(resolveRouteCatalogAlias('/admin/audit-logs')).toBe(
      '/settings/admin/audit_logs'
    );
  });

  it('matches canonical and alias admin locations to the same route entries', () => {
    expect(matchRouteCatalogEntry('/settings/admin/users')?.id).toBe('admin-settings-users');
    expect(matchRouteCatalogEntry('/settings/admin?section=users')?.id).toBe(
      'admin-settings-users'
    );
    expect(matchRouteCatalogEntry('/settings/admin/portal')?.id).toBe('portal-admin-access');
  });
});
