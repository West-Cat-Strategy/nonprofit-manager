import { describe, expect, it } from 'vitest';
import {
  collectRouteAncestors,
  getRouteBreadcrumbs,
  getRouteLocalNavigation,
  getSurfaceAreaNavigation,
  matchRouteCatalogEntry,
  getStaffNavigationEntries,
  walkRouteParentChain,
} from '../routeCatalog';
import { createDefaultWorkspaceModuleSettings } from '../../features/workspaceModules/catalog';

describe('routeCatalog matching', () => {
  it('matches canonical routes and keeps query strings attached to canonical paths', () => {
    expect(matchRouteCatalogEntry('/settings/admin/approvals')?.id).toBe(
      'admin-settings-approvals'
    );
    expect(matchRouteCatalogEntry('/settings/admin/users')?.id).toBe('admin-settings-users');
    expect(matchRouteCatalogEntry('/settings/admin/users?foo=1')?.id).toBe('admin-settings-users');
    expect(matchRouteCatalogEntry('/settings/admin/groups')?.id).toBe('admin-settings-groups');
    expect(matchRouteCatalogEntry('/settings/admin/portal/access')?.id).toBe('portal-admin-access');
    expect(matchRouteCatalogEntry('/admin-registration-review/a.b.c')?.id).toBe(
      'admin-registration-review'
    );
    expect(matchRouteCatalogEntry('/settings/communications?ref=legacy')?.id).toBe(
      'communications'
    );
    expect(matchRouteCatalogEntry('/settings/email-marketing')?.id).toBe('email-marketing');
    expect(
      getRouteBreadcrumbs('/settings/email-marketing').map(({ label, current }) => ({
        label,
        current: Boolean(current),
      }))
    ).toEqual([
      { label: 'Newsletter Campaigns', current: false },
      { label: 'Newsletter Campaigns', current: true },
    ]);
    expect(
      getRouteBreadcrumbs('/settings/email-marketing?ref=legacy').map(({ label, current }) => ({
        label,
        current: Boolean(current),
      }))
    ).toEqual([
      { label: 'Newsletter Campaigns', current: false },
      { label: 'Newsletter Campaigns', current: true },
    ]);
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

  it('includes Websites in the staff navigation and resolves the module hub route', () => {
    expect(getStaffNavigationEntries({}, createDefaultWorkspaceModuleSettings())).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'websites',
          path: '/websites',
          staffNav: expect.objectContaining({
            group: 'secondary',
          }),
        }),
      ])
    );

    expect(matchRouteCatalogEntry('/websites')?.id).toBe('websites');
    expect(getRouteLocalNavigation('/websites').some((entry) => entry.id === 'websites')).toBe(
      true
    );
  });

  it('exposes the events calendar as a first-class staff navigation entry', () => {
    expect(matchRouteCatalogEntry('/events/calendar')?.id).toBe('events-calendar');

    expect(
      getRouteLocalNavigation('/events/calendar').map((entry) => ({
        id: entry.id,
        shortLabel: entry.shortLabel,
        isActive: entry.isActive,
      }))
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'events', shortLabel: 'Events', isActive: false }),
        expect.objectContaining({ id: 'events-calendar', shortLabel: 'Calendar', isActive: true }),
      ])
    );
  });

  it('walks the Websites route family to a terminal ancestor chain', () => {
    expect(
      collectRouteAncestors(matchRouteCatalogEntry('/websites'))?.map((entry) => entry.id)
    ).toEqual(['websites']);
    expect(
      collectRouteAncestors(matchRouteCatalogEntry('/websites/example-site/overview')).map(
        (entry) => entry.id
      )
    ).toEqual(['website-console-overview', 'websites']);
    expect(
      collectRouteAncestors(
        matchRouteCatalogEntry('/website-builder/example-template/preview')
      ).map((entry) => entry.id)
    ).toEqual(['website-builder-preview', 'website-builder', 'websites']);
  });

  it('stops walking parent chains when a cycle is encountered', () => {
    const cyclicNodes = new Map([
      ['a', { id: 'a', parentId: 'b' }],
      ['b', { id: 'b', parentId: 'c' }],
      ['c', { id: 'c', parentId: 'a' }],
    ]);

    const chain = walkRouteParentChain(
      cyclicNodes.get('a') ?? null,
      (entry) => cyclicNodes.get(entry.parentId ?? '') ?? null
    );

    expect(chain.map((entry) => entry.id)).toEqual(['a', 'b', 'c']);
  });

  it('builds breadcrumbs and local navigation from the route hierarchy for detail pages', () => {
    const contactDetailPath = '/contacts/11111111-1111-4111-8111-111111111111';
    const contactPrintPath = '/contacts/11111111-1111-4111-8111-111111111111/print';

    expect(
      getRouteBreadcrumbs(contactDetailPath).map(({ label, current }) => ({ label, current }))
    ).toEqual([
      { label: 'People', current: false },
      { label: 'Person Detail', current: true },
    ]);

    expect(
      getRouteBreadcrumbs(contactPrintPath).map(({ label, current }) => ({ label, current }))
    ).toEqual([
      { label: 'People', current: false },
      { label: 'Person Detail', current: false },
      { label: 'Print / Export', current: true },
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
