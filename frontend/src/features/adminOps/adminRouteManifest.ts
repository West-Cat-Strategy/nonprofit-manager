import {
  getAdminSettingsPath,
  getPortalAdminPath,
} from './adminRoutePaths';

export type AdminRouteManifestEntry = {
  id: string;
  title: string;
  path: string;
};

export type AdminRouteRedirectEntry = AdminRouteManifestEntry & {
  redirectsTo: string;
};

export const adminSettingsRouteManifest: readonly AdminRouteManifestEntry[] = [
  { id: 'admin-settings-dashboard', title: 'Admin settings dashboard', path: getAdminSettingsPath('dashboard') },
  { id: 'admin-settings-organization', title: 'Organization settings', path: getAdminSettingsPath('organization') },
  { id: 'admin-settings-workspace-modules', title: 'Workspace modules', path: getAdminSettingsPath('workspace_modules') },
  { id: 'admin-settings-branding', title: 'Branding', path: getAdminSettingsPath('branding') },
  { id: 'admin-settings-users', title: 'Users', path: getAdminSettingsPath('users') },
  { id: 'admin-settings-communications', title: 'Communications', path: getAdminSettingsPath('communications') },
  { id: 'admin-settings-messaging', title: 'Messaging', path: getAdminSettingsPath('messaging') },
  { id: 'admin-settings-outcomes', title: 'Outcomes', path: getAdminSettingsPath('outcomes') },
  { id: 'admin-settings-roles', title: 'Roles', path: getAdminSettingsPath('roles') },
  { id: 'admin-settings-audit-logs', title: 'Audit logs', path: getAdminSettingsPath('audit_logs') },
  { id: 'admin-settings-other', title: 'Other', path: getAdminSettingsPath('other') },
] as const;

export const portalAdminRouteManifest: readonly AdminRouteManifestEntry[] = [
  { id: 'portal-admin-access', title: 'Portal access', path: getPortalAdminPath('access') },
  { id: 'portal-admin-users', title: 'Portal users', path: getPortalAdminPath('users') },
  { id: 'portal-admin-conversations', title: 'Portal conversations', path: getPortalAdminPath('conversations') },
  { id: 'portal-admin-appointments', title: 'Portal appointments', path: getPortalAdminPath('appointments') },
  { id: 'portal-admin-slots', title: 'Portal slots', path: getPortalAdminPath('slots') },
] as const;

export const adminCompatibilityRouteManifest: readonly AdminRouteRedirectEntry[] = [
  {
    id: 'legacy-email-marketing',
    title: 'Legacy communications redirect',
    path: '/email-marketing',
    redirectsTo: '/settings/communications',
  },
  {
    id: 'legacy-admin-settings',
    title: 'Legacy admin settings redirect',
    path: '/settings/admin',
    redirectsTo: getAdminSettingsPath('dashboard'),
  },
  {
    id: 'legacy-admin-portal',
    title: 'Legacy portal admin redirect',
    path: '/settings/admin/portal',
    redirectsTo: getPortalAdminPath('access'),
  },
  {
    id: 'legacy-organization-settings',
    title: 'Legacy organization settings redirect',
    path: '/settings/organization',
    redirectsTo: getAdminSettingsPath('organization'),
  },
  {
    id: 'legacy-admin-audit-logs',
    title: 'Legacy audit logs redirect',
    path: '/admin/audit-logs',
    redirectsTo: getAdminSettingsPath('audit_logs'),
  },
] as const;

export const adminRouteManifest = {
  settings: adminSettingsRouteManifest,
  portal: portalAdminRouteManifest,
  compatibility: adminCompatibilityRouteManifest,
} as const;

export default adminRouteManifest;
