import {
  getAdminSettingsPath,
  getPortalAdminPath,
  type AdminSettingsSection,
  type PortalAdminPanel,
} from './adminRoutePaths';
import { adminSettingsTabs } from './pages/adminSettings/constants';

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
  path: string;
  wrapper: AdminRouteWrapper;
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

const adminSettingsSections: readonly AdminSettingsSection[] = adminSettingsTabs.map(
  (tab) => tab.id
);

export const adminRouteManifest = [
  {
    id: 'admin-settings-communications',
    title: 'Communications settings',
    path: '/settings/communications',
    wrapper: 'protected',
    kind: 'page',
    view: 'communications',
  },
  {
    id: 'admin-settings-email-marketing',
    title: 'Email marketing settings',
    path: '/settings/email-marketing',
    wrapper: 'protected',
    kind: 'page',
    view: 'communications',
  },
  {
    id: 'admin-settings-social-media',
    title: 'Social media settings',
    path: '/settings/social-media',
    wrapper: 'admin',
    kind: 'page',
    view: 'socialMedia',
  },
  {
    id: 'admin-settings-api',
    title: 'API settings',
    path: '/settings/api',
    wrapper: 'protected',
    kind: 'page',
    view: 'api',
  },
  {
    id: 'admin-settings-navigation',
    title: 'Navigation settings',
    path: '/settings/navigation',
    wrapper: 'protected',
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
    title: 'Data backup',
    path: '/settings/backup',
    wrapper: 'admin',
    kind: 'page',
    view: 'backup',
  },
  {
    id: 'legacy-email-marketing',
    title: 'Legacy communications redirect',
    path: '/email-marketing',
    wrapper: 'protected',
    kind: 'redirect',
    redirectsTo: '/dashboard',
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
    redirectsTo: '/dashboard',
  },
  {
    id: 'legacy-admin-audit-logs',
    title: 'Legacy audit logs redirect',
    path: '/admin/audit-logs',
    wrapper: 'admin',
    kind: 'redirect',
    redirectsTo: '/dashboard',
  },
  {
    id: 'portal-admin-access',
    title: 'Portal access',
    path: getPortalAdminPath('access'),
    wrapper: 'admin',
    kind: 'portal-panel',
    panel: 'access',
  },
  {
    id: 'portal-admin-users',
    title: 'Portal users',
    path: getPortalAdminPath('users'),
    wrapper: 'admin',
    kind: 'portal-panel',
    panel: 'users',
  },
  {
    id: 'portal-admin-conversations',
    title: 'Portal conversations',
    path: getPortalAdminPath('conversations'),
    wrapper: 'admin',
    kind: 'portal-panel',
    panel: 'conversations',
  },
  {
    id: 'portal-admin-appointments',
    title: 'Portal appointments',
    path: getPortalAdminPath('appointments'),
    wrapper: 'admin',
    kind: 'portal-panel',
    panel: 'appointments',
  },
  {
    id: 'portal-admin-slots',
    title: 'Portal slots',
    path: getPortalAdminPath('slots'),
    wrapper: 'admin',
    kind: 'portal-panel',
    panel: 'slots',
  },
  {
    id: 'admin-settings-section-route',
    title: 'Admin settings section route',
    path: '/settings/admin/:section',
    wrapper: 'admin',
    kind: 'section',
    sections: adminSettingsSections,
  },
] as const satisfies readonly AdminRouteManifestEntry[];

export default adminRouteManifest;
