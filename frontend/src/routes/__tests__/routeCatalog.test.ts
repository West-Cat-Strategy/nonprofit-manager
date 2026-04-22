import { describe, expect, it } from 'vitest';
import {
  collectRouteAncestors,
  getAdminNavigationEntries,
  getRouteCatalogEntryById,
  getRouteBreadcrumbs,
  getRouteLocalNavigation,
  getRouteHref,
  getSurfaceAreaNavigation,
  isRouteCatalogEntryEnabled,
  matchRouteCatalogEntry,
  getStaffNavigationEntries,
  walkRouteParentChain,
} from '../routeCatalog';
import { createDefaultWorkspaceModuleSettings } from '../../features/workspaceModules/catalog';

const requireRouteCatalogEntry = (id: string) => {
  const entry = getRouteCatalogEntryById(id);

  expect(entry).toBeDefined();

  if (!entry) {
    throw new Error(`Expected route catalog entry for ${id}`);
  }

  return entry;
};

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
    expect(matchRouteCatalogEntry('/portal/reset-password/test-token')?.id).toBe(
      'portal-reset-password'
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

  it('looks up catalog entries by id and honors feature and workspace gating', () => {
    const teamChat = requireRouteCatalogEntry('team-chat');
    const cases = requireRouteCatalogEntry('cases');

    expect(teamChat).toMatchObject({
      id: 'team-chat',
      path: '/team-chat',
    });
    expect(getRouteHref(teamChat)).toBe('/team-chat');
    expect(isRouteCatalogEntryEnabled(teamChat, { VITE_TEAM_CHAT_ENABLED: 'true' })).toBe(true);
    expect(isRouteCatalogEntryEnabled(teamChat, { VITE_TEAM_CHAT_ENABLED: 'false' })).toBe(false);
    expect(
      isRouteCatalogEntryEnabled(cases, {}, { ...createDefaultWorkspaceModuleSettings(), cases: false })
    ).toBe(false);
  });

  it('returns admin navigation entries in their configured order', () => {
    const portalAdminEntries = getAdminNavigationEntries('portal');

    expect(portalAdminEntries.length).toBeGreaterThan(0);
    expect(portalAdminEntries.every((entry, index, entries) => index === 0 || entries[index - 1].adminNav.order <= entry.adminNav.order)).toBe(true);
  });

  it('matches canonical and dynamic routes', () => {
    expect(matchRouteCatalogEntry('/reports')?.id).toBe('reports');
    expect(matchRouteCatalogEntry('/reports/builder')?.id).toBe('reports-builder');
    expect(matchRouteCatalogEntry('/reports/saved')?.id).toBe('reports-saved');
    expect(matchRouteCatalogEntry('/reports/scheduled')?.id).toBe('reports-scheduled');
  });

  it('returns null for unknown paths so the router fallback owns that redirect contract', () => {
    expect(matchRouteCatalogEntry('/this-route-does-not-exist')).toBeNull();
    expect(matchRouteCatalogEntry('/this-route-does-not-exist?ref=wildcard')).toBeNull();
  });

  it('matches cataloged analytics, engagement, and publishing routes that the drift checker audits', () => {
    expect(matchRouteCatalogEntry('/analytics')?.id).toBe('analytics');
    expect(matchRouteCatalogEntry('/dashboard/custom')?.id).toBe('dashboard-custom');
    expect(matchRouteCatalogEntry('/alerts')?.id).toBe('alerts-overview');
    expect(matchRouteCatalogEntry('/alerts/instances')?.id).toBe('alerts-instances');
    expect(matchRouteCatalogEntry('/alerts/history')?.id).toBe('alerts-history');
    expect(matchRouteCatalogEntry('/external-service-providers')?.id).toBe(
      'external-service-providers'
    );
    expect(matchRouteCatalogEntry('/website-builder')?.id).toBe('website-builder');
    expect(matchRouteCatalogEntry('/website-builder/sample-template/preview')?.id).toBe(
      'website-builder-preview'
    );
    expect(matchRouteCatalogEntry('/events')?.id).toBe('events');
    expect(matchRouteCatalogEntry('/tasks')?.id).toBe('tasks');
    expect(matchRouteCatalogEntry('/cases')?.id).toBe('cases');
    expect(matchRouteCatalogEntry('/accounts')?.id).toBe('accounts');
    expect(matchRouteCatalogEntry('/accounts/new')?.id).toBe('account-create');
    expect(matchRouteCatalogEntry('/contacts')?.id).toBe('contacts');
    expect(matchRouteCatalogEntry('/contacts/11111111-1111-4111-8111-111111111111')?.id).toBe(
      'contact-detail'
    );
    expect(matchRouteCatalogEntry('/volunteers')?.id).toBe('volunteers');
    expect(
      matchRouteCatalogEntry('/volunteers/11111111-1111-4111-8111-111111111111/assignments/new')
        ?.id
    ).toBe('volunteer-assignment-create');
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

  it('anchors admin tools beneath the admin tools hub', () => {
    expect(
      collectRouteAncestors(matchRouteCatalogEntry('/settings/api'))?.map((entry) => entry.id)
    ).toEqual(['api-settings', 'admin-settings-other', 'admin-settings']);
    expect(
      collectRouteAncestors(matchRouteCatalogEntry('/settings/navigation'))?.map(
        (entry) => entry.id
      )
    ).toEqual(['navigation-settings', 'admin-settings-other', 'admin-settings']);
    expect(
      collectRouteAncestors(matchRouteCatalogEntry('/settings/backup'))?.map((entry) => entry.id)
    ).toEqual(['backup-settings', 'admin-settings-other', 'admin-settings']);
    expect(
      collectRouteAncestors(matchRouteCatalogEntry('/settings/social-media'))?.map(
        (entry) => entry.id
      )
    ).toEqual(['social-media', 'admin-settings-other', 'admin-settings']);
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
        expect.objectContaining({ id: 'events', shortLabel: 'Events', isActive: true }),
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

  it('anchors portal password recovery beneath portal login', () => {
    expect(
      collectRouteAncestors(matchRouteCatalogEntry('/portal/forgot-password'))?.map(
        (entry) => entry.id
      )
    ).toEqual(['portal-forgot-password', 'portal-login']);
    expect(
      collectRouteAncestors(matchRouteCatalogEntry('/portal/reset-password/test-token'))?.map(
        (entry) => entry.id
      )
    ).toEqual(['portal-reset-password', 'portal-login']);
  });
});
