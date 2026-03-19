import { describe, expect, it } from 'vitest';
import {
  getRouteBreadcrumbs,
  getRouteLocalNavigation,
  getSurfaceAreaNavigation,
  matchRouteCatalogEntry,
} from '../routeCatalog';

describe('routeCatalog matching', () => {
  it('matches canonical routes and keeps query strings attached to canonical paths', () => {
    expect(matchRouteCatalogEntry('/settings/admin/users')?.id).toBe('admin-settings-users');
    expect(matchRouteCatalogEntry('/settings/admin/users?foo=1')?.id).toBe(
      'admin-settings-users'
    );
    expect(matchRouteCatalogEntry('/settings/admin/portal/access')?.id).toBe(
      'portal-admin-access'
    );
    expect(matchRouteCatalogEntry('/settings/email-marketing?ref=legacy')?.id).toBe(
      'email-marketing'
    );
  });

  it('matches canonical and dynamic routes', () => {
    expect(matchRouteCatalogEntry('/reports/builder')?.id).toBe('reports');
    expect(matchRouteCatalogEntry('/reports/saved')?.id).toBe('reports-saved');
    expect(matchRouteCatalogEntry('/reports/scheduled')?.id).toBe('reports-scheduled');
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
