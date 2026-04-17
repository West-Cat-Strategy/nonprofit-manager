import {
  getAdminSettingsPath,
  getPortalAdminPath,
  type AdminSettingsSection,
  type PortalAdminPanel,
} from './adminRoutePaths';
import {
  getAdminSettingsSectionDefinition,
  getAdminWorkspaceDefinition,
  getPortalAdminDefinition,
  adminSettingsSections,
  type AdminSurface,
} from './adminNavigationCatalog';

export type AdminRouteWrapper = 'protected' | 'admin' | 'neoBrutalist';

export type AdminRoutePageView =
  | 'communications'
  | 'socialMedia'
  | 'api'
  | 'navigation'
  | 'user'
  | 'backup';

type AdminRouteBaseEntry = {
  id: string;
  title: string;
  description?: string;
  path: string;
  wrapper: AdminRouteWrapper;
  adminSurface?: AdminSurface;
};

type AdminRoutePageEntry = AdminRouteBaseEntry & {
  kind: 'page';
  view: AdminRoutePageView;
};

type AdminRouteRedirectEntry = AdminRouteBaseEntry & {
  kind: 'redirect';
  redirectsTo: string;
};

type AdminRouteSectionEntry = AdminRouteBaseEntry & {
  kind: 'section';
  sections: readonly AdminSettingsSection[];
};

type AdminRoutePortalPanelEntry = AdminRouteBaseEntry & {
  kind: 'portal-panel';
  panel: PortalAdminPanel;
};

export type AdminRouteManifestEntry =
  | AdminRoutePageEntry
  | AdminRouteRedirectEntry
  | AdminRouteSectionEntry
  | AdminRoutePortalPanelEntry;

const communicationsMeta = getAdminWorkspaceDefinition('communications');
const socialMediaMeta = getAdminWorkspaceDefinition('social-media');
const apiSettingsMeta = getAdminWorkspaceDefinition('api-settings');
const navigationSettingsMeta = getAdminWorkspaceDefinition('navigation-settings');
const backupSettingsMeta = getAdminWorkspaceDefinition('backup-settings');
const portalAccessMeta = getPortalAdminDefinition('access');
const portalUsersMeta = getPortalAdminDefinition('users');
const portalConversationsMeta = getPortalAdminDefinition('conversations');
const portalAppointmentsMeta = getPortalAdminDefinition('appointments');
const portalSlotsMeta = getPortalAdminDefinition('slots');
const dashboardSectionMeta = getAdminSettingsSectionDefinition('dashboard');

export const adminRouteManifest = [
  {
    id: 'admin-settings-communications',
    title: communicationsMeta.title,
    description: communicationsMeta.description,
    path: communicationsMeta.path,
    wrapper: 'protected',
    adminSurface: communicationsMeta.surface,
    kind: 'page',
    view: 'communications',
  },
  {
    id: 'admin-settings-email-marketing',
    title: communicationsMeta.title,
    description: communicationsMeta.description,
    path: '/settings/email-marketing',
    wrapper: 'protected',
    adminSurface: communicationsMeta.surface,
    kind: 'page',
    view: 'communications',
  },
  {
    id: 'admin-settings-social-media',
    title: socialMediaMeta.title,
    description: socialMediaMeta.description,
    path: socialMediaMeta.path,
    wrapper: 'admin',
    adminSurface: socialMediaMeta.surface,
    kind: 'page',
    view: 'socialMedia',
  },
  {
    id: 'admin-settings-api',
    title: apiSettingsMeta.title,
    description: apiSettingsMeta.description,
    path: apiSettingsMeta.path,
    wrapper: 'protected',
    adminSurface: apiSettingsMeta.surface,
    kind: 'page',
    view: 'api',
  },
  {
    id: 'admin-settings-navigation',
    title: navigationSettingsMeta.title,
    description: navigationSettingsMeta.description,
    path: navigationSettingsMeta.path,
    wrapper: 'protected',
    adminSurface: navigationSettingsMeta.surface,
    kind: 'page',
    view: 'navigation',
  },
  {
    id: 'admin-settings-user',
    title: 'User settings',
    path: '/settings/user',
    wrapper: 'neoBrutalist',
    kind: 'page',
    view: 'user',
  },
  {
    id: 'admin-settings-backup',
    title: backupSettingsMeta.title,
    description: backupSettingsMeta.description,
    path: backupSettingsMeta.path,
    wrapper: 'admin',
    adminSurface: backupSettingsMeta.surface,
    kind: 'page',
    view: 'backup',
  },
  {
    id: 'legacy-email-marketing',
    title: 'Legacy communications redirect',
    path: '/email-marketing',
    wrapper: 'protected',
    kind: 'redirect',
    redirectsTo: '/settings/communications',
  },
  {
    id: 'legacy-admin-settings',
    title: 'Legacy admin settings redirect',
    path: '/settings/admin',
    wrapper: 'admin',
    kind: 'redirect',
    redirectsTo: getAdminSettingsPath('dashboard'),
  },
  {
    id: 'legacy-admin-email-settings',
    title: 'Legacy admin email settings redirect',
    path: '/settings/admin/email',
    wrapper: 'admin',
    kind: 'redirect',
    redirectsTo: getAdminSettingsPath('communications'),
  },
  {
    id: 'legacy-admin-portal',
    title: 'Legacy portal admin redirect',
    path: '/settings/admin/portal',
    wrapper: 'admin',
    kind: 'redirect',
    redirectsTo: getPortalAdminPath('access'),
  },
  {
    id: 'legacy-organization-settings',
    title: 'Legacy organization settings redirect',
    path: '/settings/organization',
    wrapper: 'admin',
    kind: 'redirect',
    redirectsTo: getAdminSettingsPath('organization'),
  },
  {
    id: 'legacy-admin-audit-logs',
    title: 'Legacy audit logs redirect',
    path: '/admin/audit-logs',
    wrapper: 'admin',
    kind: 'redirect',
    redirectsTo: getAdminSettingsPath('audit_logs'),
  },
  {
    id: 'portal-admin-access',
    title: portalAccessMeta.title,
    description: portalAccessMeta.description,
    path: getPortalAdminPath('access'),
    wrapper: 'admin',
    adminSurface: portalAccessMeta.surface,
    kind: 'portal-panel',
    panel: 'access',
  },
  {
    id: 'portal-admin-users',
    title: portalUsersMeta.title,
    description: portalUsersMeta.description,
    path: getPortalAdminPath('users'),
    wrapper: 'admin',
    adminSurface: portalUsersMeta.surface,
    kind: 'portal-panel',
    panel: 'users',
  },
  {
    id: 'portal-admin-conversations',
    title: portalConversationsMeta.title,
    description: portalConversationsMeta.description,
    path: getPortalAdminPath('conversations'),
    wrapper: 'admin',
    adminSurface: portalConversationsMeta.surface,
    kind: 'portal-panel',
    panel: 'conversations',
  },
  {
    id: 'portal-admin-appointments',
    title: portalAppointmentsMeta.title,
    description: portalAppointmentsMeta.description,
    path: getPortalAdminPath('appointments'),
    wrapper: 'admin',
    adminSurface: portalAppointmentsMeta.surface,
    kind: 'portal-panel',
    panel: 'appointments',
  },
  {
    id: 'portal-admin-slots',
    title: portalSlotsMeta.title,
    description: portalSlotsMeta.description,
    path: getPortalAdminPath('slots'),
    wrapper: 'admin',
    adminSurface: portalSlotsMeta.surface,
    kind: 'portal-panel',
    panel: 'slots',
  },
  {
    id: 'admin-settings-section-route',
    title: dashboardSectionMeta.title,
    description: dashboardSectionMeta.description,
    path: '/settings/admin/:section',
    wrapper: 'admin',
    adminSurface: 'core',
    kind: 'section',
    sections: adminSettingsSections,
  },
] as const satisfies readonly AdminRouteManifestEntry[];

export default adminRouteManifest;
