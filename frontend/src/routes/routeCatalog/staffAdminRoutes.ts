import type {
  AdminSettingsSectionDefinitionEntry,
} from '../../features/adminOps/adminNavigationCatalog';
import { adminRouteDescriptors } from '../../features/adminOps/adminRouteDescriptors';
import type { RouteCatalogEntry } from './types';
import { adminRoute, settingsRoute, staffRoute } from './shared';
import {
  getAdminSettingsRouteMeta,
} from './staffAdminRouteMeta';

type AdminRouteSeed = Parameters<typeof adminRoute>[0];

type AdminRouteOverrides = Omit<
  Partial<AdminRouteSeed>,
  'id' | 'title' | 'path' | 'adminSurface' | 'adminLabel' | 'adminDescription' | 'adminIcon'
>;

const buildAdminSettingsCatalogEntry = (
  meta: AdminSettingsSectionDefinitionEntry,
  overrides: AdminRouteOverrides = {}
) =>
  adminRoute({
    id: meta.routeId,
    title: meta.title,
    path: meta.path,
    adminSurface: meta.surface,
    adminLabel: meta.label,
    adminDescription: meta.description,
    adminIcon: meta.icon,
    ...overrides,
  });

const adminSettingsDashboardMeta = getAdminSettingsRouteMeta('admin-settings');
const adminSettingsApprovalsMeta = getAdminSettingsRouteMeta('admin-settings-approvals');
const adminSettingsOrganizationMeta = getAdminSettingsRouteMeta('admin-settings-organization');
const adminSettingsWorkspaceModulesMeta = getAdminSettingsRouteMeta(
  'admin-settings-workspace-modules'
);
const adminSettingsBrandingMeta = getAdminSettingsRouteMeta('admin-settings-branding');
const adminSettingsUsersMeta = getAdminSettingsRouteMeta('admin-settings-users');
const adminSettingsGroupsMeta = getAdminSettingsRouteMeta('admin-settings-groups');
const adminSettingsCommunicationsMeta = getAdminSettingsRouteMeta(
  'admin-settings-communications'
);
const adminSettingsMessagingMeta = getAdminSettingsRouteMeta('admin-settings-messaging');
const adminSettingsOutcomesMeta = getAdminSettingsRouteMeta('admin-settings-outcomes');
const adminSettingsRolesMeta = getAdminSettingsRouteMeta('admin-settings-roles');
const adminSettingsAuditLogsMeta = getAdminSettingsRouteMeta('admin-settings-audit-logs');
const adminSettingsOtherMeta = getAdminSettingsRouteMeta('admin-settings-other');

const descriptorCatalogEntries: readonly RouteCatalogEntry[] = adminRouteDescriptors.flatMap((descriptor) => {
  if (!descriptor.catalog) {
    return [];
  }

  const catalog = descriptor.catalog;
  const seed = {
    id: catalog.id,
    title: catalog.title ?? descriptor.title,
    path: descriptor.path,
    adminSurface: descriptor.adminSurface,
    parentId: catalog.parentId,
    featureStatus: catalog.featureStatus,
    showInMobileDrawerUtilities: catalog.showInMobileDrawerUtilities,
    adminNav: catalog.adminNav,
  };

  if (catalog.factory === 'admin') {
    return [adminRoute(seed)];
  }

  return [settingsRoute(seed)];
});

export const staffAdminRouteCatalogEntries: readonly RouteCatalogEntry[] = [
  staffRoute({
    id: 'intake-create',
    title: 'New Intake',
    section: 'Core',
    path: '/intake/new',
    primaryAction: { label: 'Create contact', href: '/intake/new' },
  }),
  staffRoute({
    id: 'interaction-create',
    title: 'Note an Interaction',
    section: 'Core',
    path: '/interactions/new',
    primaryAction: { label: 'Create new person', href: '/contacts/new' },
  }),
  staffRoute({
    id: 'people-directory',
    title: 'People Directory',
    section: 'Core',
    path: '/people',
  }),
  staffRoute({
    id: 'linking',
    title: 'Linking',
    section: 'Core',
    path: '/linking',
  }),
  staffRoute({
    id: 'operations',
    title: 'Operations',
    section: 'Core',
    path: '/operations',
  }),
  staffRoute({
    id: 'outreach',
    title: 'Outreach',
    section: 'Core',
    path: '/outreach',
  }),
  buildAdminSettingsCatalogEntry(adminSettingsDashboardMeta, {
    adminNav:
      adminSettingsDashboardMeta.surface === 'core'
        ? [
            { mode: 'settings', order: 10, label: 'Admin Hub' },
            { mode: 'portal', order: 10, label: 'Admin Hub' },
          ]
        : undefined,
  }),
  buildAdminSettingsCatalogEntry(adminSettingsApprovalsMeta),
  buildAdminSettingsCatalogEntry(adminSettingsOrganizationMeta),
  buildAdminSettingsCatalogEntry(adminSettingsWorkspaceModulesMeta),
  buildAdminSettingsCatalogEntry(adminSettingsBrandingMeta),
  buildAdminSettingsCatalogEntry(adminSettingsUsersMeta),
  buildAdminSettingsCatalogEntry(adminSettingsGroupsMeta),
  buildAdminSettingsCatalogEntry(adminSettingsCommunicationsMeta),
  buildAdminSettingsCatalogEntry(adminSettingsMessagingMeta),
  buildAdminSettingsCatalogEntry(adminSettingsOutcomesMeta),
  buildAdminSettingsCatalogEntry(adminSettingsRolesMeta),
  buildAdminSettingsCatalogEntry(adminSettingsAuditLogsMeta),
  buildAdminSettingsCatalogEntry(adminSettingsOtherMeta),
  ...descriptorCatalogEntries,
];
