import {
  getAdminSettingsPath,
  getPortalAdminPath,
  type AdminSettingsSection,
  type PortalAdminPanel,
} from './adminRoutePaths';
import {
  adminRouteDefinitionByRouteId,
  adminSettingsSectionDefinitionById,
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

const getAdminRouteMeta = (routeId: string) => {
  const metadata = adminRouteDefinitionByRouteId.get(routeId);
  if (!metadata) {
    throw new Error(`Missing admin route metadata for ${routeId}`);
  }

  return metadata;
};

const dashboardSectionMeta = adminSettingsSectionDefinitionById.get('dashboard');

export const adminRouteManifest = [
  {
    id: 'admin-settings-communications',
    title: getAdminRouteMeta('communications').title,
    description: getAdminRouteMeta('communications').description,
    path: getAdminRouteMeta('communications').path,
    wrapper: 'protected',
    adminSurface: getAdminRouteMeta('communications').surface,
    kind: 'page',
    view: 'communications',
  },
  {
    id: 'admin-settings-email-marketing',
    title: getAdminRouteMeta('communications').title,
    description: getAdminRouteMeta('communications').description,
    path: '/settings/email-marketing',
    wrapper: 'protected',
    adminSurface: getAdminRouteMeta('communications').surface,
    kind: 'page',
    view: 'communications',
  },
  {
    id: 'admin-settings-social-media',
    title: getAdminRouteMeta('social-media').title,
    description: getAdminRouteMeta('social-media').description,
    path: getAdminRouteMeta('social-media').path,
    wrapper: 'admin',
    adminSurface: getAdminRouteMeta('social-media').surface,
    kind: 'page',
    view: 'socialMedia',
  },
  {
    id: 'admin-settings-api',
    title: getAdminRouteMeta('api-settings').title,
    description: getAdminRouteMeta('api-settings').description,
    path: getAdminRouteMeta('api-settings').path,
    wrapper: 'protected',
    adminSurface: getAdminRouteMeta('api-settings').surface,
    kind: 'page',
    view: 'api',
  },
  {
    id: 'admin-settings-navigation',
    title: getAdminRouteMeta('navigation-settings').title,
    description: getAdminRouteMeta('navigation-settings').description,
    path: getAdminRouteMeta('navigation-settings').path,
    wrapper: 'protected',
    adminSurface: getAdminRouteMeta('navigation-settings').surface,
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
    title: getAdminRouteMeta('backup-settings').title,
    description: getAdminRouteMeta('backup-settings').description,
    path: getAdminRouteMeta('backup-settings').path,
    wrapper: 'admin',
    adminSurface: getAdminRouteMeta('backup-settings').surface,
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
    title: getAdminRouteMeta('portal-admin-access').title,
    description: getAdminRouteMeta('portal-admin-access').description,
    path: getPortalAdminPath('access'),
    wrapper: 'admin',
    adminSurface: getAdminRouteMeta('portal-admin-access').surface,
    kind: 'portal-panel',
    panel: 'access',
  },
  {
    id: 'portal-admin-users',
    title: getAdminRouteMeta('portal-admin-users').title,
    description: getAdminRouteMeta('portal-admin-users').description,
    path: getPortalAdminPath('users'),
    wrapper: 'admin',
    adminSurface: getAdminRouteMeta('portal-admin-users').surface,
    kind: 'portal-panel',
    panel: 'users',
  },
  {
    id: 'portal-admin-conversations',
    title: getAdminRouteMeta('portal-admin-conversations').title,
    description: getAdminRouteMeta('portal-admin-conversations').description,
    path: getPortalAdminPath('conversations'),
    wrapper: 'admin',
    adminSurface: getAdminRouteMeta('portal-admin-conversations').surface,
    kind: 'portal-panel',
    panel: 'conversations',
  },
  {
    id: 'portal-admin-appointments',
    title: getAdminRouteMeta('portal-admin-appointments').title,
    description: getAdminRouteMeta('portal-admin-appointments').description,
    path: getPortalAdminPath('appointments'),
    wrapper: 'admin',
    adminSurface: getAdminRouteMeta('portal-admin-appointments').surface,
    kind: 'portal-panel',
    panel: 'appointments',
  },
  {
    id: 'portal-admin-slots',
    title: getAdminRouteMeta('portal-admin-slots').title,
    description: getAdminRouteMeta('portal-admin-slots').description,
    path: getPortalAdminPath('slots'),
    wrapper: 'admin',
    adminSurface: getAdminRouteMeta('portal-admin-slots').surface,
    kind: 'portal-panel',
    panel: 'slots',
  },
  {
    id: 'admin-settings-section-route',
    title: dashboardSectionMeta?.title ?? 'Admin Hub',
    description:
      dashboardSectionMeta?.description ??
      'Command center for organization health, access, delivery, and admin tooling.',
    path: '/settings/admin/:section',
    wrapper: 'admin',
    adminSurface: 'core',
    kind: 'section',
    sections: adminSettingsSections,
  },
] as const satisfies readonly AdminRouteManifestEntry[];

export default adminRouteManifest;
