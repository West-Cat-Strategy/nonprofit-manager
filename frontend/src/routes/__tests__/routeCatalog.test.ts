import { describe, expect, it } from 'vitest';
import {
  getRouteBreadcrumbs,
  getRouteLocalNavigation,
  getSurfaceAreaNavigation,
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

  it('groups staff navigation into top-level areas with active state driven by the route area', () => {
    const staffAreas = getSurfaceAreaNavigation('staff', '/cases');

    expect(staffAreas.find((entry) => entry.area === 'Home')).toMatchObject({
      href: '/dashboard',
      isActive: false,
      label: 'Home',
    });
    expect(staffAreas.find((entry) => entry.area === 'People')).toMatchObject({
      href: '/contacts',
      isActive: false,
      label: 'People',
    });
    expect(staffAreas.find((entry) => entry.area === 'Service')).toMatchObject({
      href: '/cases',
      isActive: true,
      label: 'Service',
    });
  });

  it('builds breadcrumbs and local navigation from the route hierarchy for detail pages', () => {
    const contactDetailPath = '/contacts/11111111-1111-4111-8111-111111111111';

    expect(
      getRouteBreadcrumbs(contactDetailPath).map(({ label, current }) => ({ label, current }))
    ).toEqual([
      { label: 'People', current: false },
      { label: 'Person Detail', current: true },
    ]);

    const peopleLocalNav = getRouteLocalNavigation(contactDetailPath);
    expect(peopleLocalNav.map((entry) => entry.shortLabel)).toEqual(
      expect.arrayContaining(['People', 'Accounts', 'Volunteers'])
    );
    expect(peopleLocalNav.find((entry) => entry.id === 'contacts')?.isActive).toBe(true);
  });

  it('falls back to area navigation when a portal area has a single visible hub route', () => {
    const portalLocalNav = getRouteLocalNavigation('/portal/messages');

    expect(portalLocalNav.find((entry) => entry.area === 'Home')).toMatchObject({
      href: '/portal',
      isActive: false,
      label: 'Home',
    });
    expect(portalLocalNav.find((entry) => entry.area === 'Messages')).toMatchObject({
      href: '/portal/messages',
      isActive: true,
      label: 'Messages',
    });
  });
});
