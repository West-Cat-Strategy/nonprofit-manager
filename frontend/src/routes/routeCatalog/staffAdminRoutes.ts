import type {
  AdminSettingsSectionDefinitionEntry,
  AdminWorkspaceDefinitionEntry,
} from '../../features/adminOps/adminNavigationCatalog';
import type { RouteCatalogEntry } from './types';
import { adminRoute, settingsRoute, staffRoute } from './shared';
import {
  getAdminSettingsRouteMeta,
  getAdminWorkspaceRouteMeta,
} from './staffAdminRouteMeta';

type AdminRouteSeed = Parameters<typeof adminRoute>[0];
type SettingsRouteSeed = Parameters<typeof settingsRoute>[0];

type AdminRouteOverrides = Omit<
  Partial<AdminRouteSeed>,
  'id' | 'title' | 'path' | 'adminSurface' | 'adminLabel' | 'adminDescription' | 'adminIcon'
>;

type SettingsRouteOverrides = Omit<
  Partial<SettingsRouteSeed>,
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

const buildWorkspaceAdminCatalogEntry = (
  meta: AdminWorkspaceDefinitionEntry,
  overrides: AdminRouteOverrides = {}
) =>
  adminRoute({
    id: meta.routeId,
    title: meta.title,
    path: meta.path,
    adminSurface: meta.surface,
    adminLabel: meta.title,
    adminDescription: meta.description,
    adminIcon: meta.icon,
    ...overrides,
  });

const buildWorkspaceSettingsCatalogEntry = (
  meta: AdminWorkspaceDefinitionEntry,
  overrides: SettingsRouteOverrides = {}
) =>
  settingsRoute({
    id: meta.routeId,
    title: meta.title,
    path: meta.path,
    adminSurface: meta.surface,
    adminLabel: meta.title,
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

const apiSettingsMeta = getAdminWorkspaceRouteMeta('api-settings');
const navigationSettingsMeta = getAdminWorkspaceRouteMeta('navigation-settings');
const backupSettingsMeta = getAdminWorkspaceRouteMeta('backup-settings');
const communicationsWorkspaceMeta = getAdminWorkspaceRouteMeta('communications');
const socialMediaMeta = getAdminWorkspaceRouteMeta('social-media');
const portalAdminAccessMeta = getAdminWorkspaceRouteMeta('portal-admin-access');
const portalAdminUsersMeta = getAdminWorkspaceRouteMeta('portal-admin-users');
const portalAdminConversationsMeta = getAdminWorkspaceRouteMeta('portal-admin-conversations');
const portalAdminAppointmentsMeta = getAdminWorkspaceRouteMeta('portal-admin-appointments');
const portalAdminSlotsMeta = getAdminWorkspaceRouteMeta('portal-admin-slots');

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
  settingsRoute({
    id: 'user-settings',
    title: 'User Settings',
    path: '/settings/user',
    featureStatus: 'available',
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
  buildWorkspaceSettingsCatalogEntry(apiSettingsMeta, {
    adminNav: { mode: 'settings', order: 120, label: apiSettingsMeta.title },
    featureStatus: 'available',
    showInMobileDrawerUtilities: true,
  }),
  buildWorkspaceSettingsCatalogEntry(navigationSettingsMeta, {
    adminNav: { mode: 'settings', order: 130, label: 'Navigation' },
    featureStatus: 'available',
    showInMobileDrawerUtilities: true,
  }),
  buildWorkspaceAdminCatalogEntry(backupSettingsMeta, {
    adminNav: { mode: 'settings', order: 140, label: backupSettingsMeta.title },
  }),
  buildWorkspaceSettingsCatalogEntry(communicationsWorkspaceMeta, {
    adminNav: {
      mode: 'settings',
      order: 150,
      label: communicationsWorkspaceMeta.title,
      matchPrefixes: ['/settings/email-marketing'],
    },
    featureStatus: 'available',
  }),
  settingsRoute({
    id: 'email-marketing',
    title: 'Newsletter Campaigns',
    path: '/settings/email-marketing',
    parentId: 'communications',
    featureStatus: 'available',
  }),
  buildWorkspaceAdminCatalogEntry(socialMediaMeta, {
    adminNav: { mode: 'settings', order: 160, label: socialMediaMeta.title },
    featureStatus: 'available',
  }),
  buildWorkspaceAdminCatalogEntry(portalAdminAccessMeta, {
    adminNav: [
      {
        mode: 'settings',
        order: 110,
        label: portalAdminAccessMeta.title,
        matchPrefixes: ['/settings/admin/portal'],
      },
      {
        mode: 'portal',
        order: 20,
        label: 'Access',
      },
    ],
  }),
  buildWorkspaceAdminCatalogEntry(portalAdminUsersMeta, {
    adminNav: { mode: 'portal', order: 30, label: 'Users' },
  }),
  buildWorkspaceAdminCatalogEntry(portalAdminConversationsMeta, {
    adminNav: { mode: 'portal', order: 40, label: 'Conversations' },
  }),
  buildWorkspaceAdminCatalogEntry(portalAdminAppointmentsMeta, {
    adminNav: { mode: 'portal', order: 50, label: 'Appointments' },
  }),
  buildWorkspaceAdminCatalogEntry(portalAdminSlotsMeta, {
    adminNav: { mode: 'portal', order: 60, label: 'Slots' },
  }),
];

export const staffAdminPreludeRouteCatalogAuditTargets = [{ href: '/intake/new' }] as const;

export const staffAdminCoreRouteCatalogAuditTargets = [
  { path: '/intake/new' },
  { path: '/interactions/new' },
  { path: '/people' },
  { path: '/linking' },
  { path: '/operations' },
  { path: '/outreach' },
  { path: '/settings/user' },
  { path: '/settings/email-marketing' },
] as const;

export const staffAdminSettingsRouteCatalogAuditTargets = [
  { path: '/settings/admin/approvals' },
  { path: '/settings/admin/dashboard' },
  { path: '/settings/admin/organization' },
  { path: '/settings/admin/workspace_modules' },
  { path: '/settings/admin/branding' },
  { path: '/settings/admin/users' },
  { path: '/settings/admin/groups' },
  { path: '/settings/admin/communications' },
  { path: '/settings/admin/messaging' },
  { path: '/settings/admin/outcomes' },
  { path: '/settings/admin/roles' },
  { path: '/settings/admin/audit_logs' },
  { path: '/settings/admin/other' },
  { path: '/settings/api' },
  { path: '/settings/navigation' },
  { path: '/settings/backup' },
  { path: '/settings/communications' },
  { path: '/settings/social-media' },
  { path: '/settings/admin/portal/access' },
  { path: '/settings/admin/portal/users' },
  { path: '/settings/admin/portal/conversations' },
  { path: '/settings/admin/portal/appointments' },
  { path: '/settings/admin/portal/slots' },
] as const;
