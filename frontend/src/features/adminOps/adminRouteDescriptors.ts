import type { FeatureAccessStatus, RouteCatalogAdminNavConfig } from '../../routes/routeCatalog';
import {
  adminSettingsSections,
  getAdminSettingsSectionDefinition,
  getAdminWorkspaceDefinition,
  getPortalAdminDefinition,
  type AdminSettingsSection,
  type AdminSurface,
  type PortalAdminPanel,
} from './adminNavigationCatalog';

export type AdminRouteWrapper = 'protected' | 'admin' | 'neoBrutalist';

export type AdminRoutePageView =
  | 'communications'
  | 'socialMedia'
  | 'api'
  | 'navigation'
  | 'user'
  | 'backup';

type AdminCatalogFactory = 'admin' | 'settings';

export interface AdminRouteCatalogDescriptor {
  id: string;
  factory: AdminCatalogFactory;
  title?: string;
  parentId?: string;
  featureStatus?: FeatureAccessStatus;
  showInMobileDrawerUtilities?: boolean;
  adminNav?: RouteCatalogAdminNavConfig | ReadonlyArray<RouteCatalogAdminNavConfig>;
}

type AdminRouteBaseDescriptor = {
  routeId: string;
  title: string;
  description?: string;
  path: string;
  wrapper: AdminRouteWrapper;
  adminSurface?: AdminSurface;
  aliases?: ReadonlyArray<string>;
  catalog?: AdminRouteCatalogDescriptor;
};

type AdminRoutePageDescriptor = AdminRouteBaseDescriptor & {
  kind: 'page';
  view: AdminRoutePageView;
};

type AdminRouteRedirectDescriptor = AdminRouteBaseDescriptor & {
  kind: 'redirect';
  redirectsTo: string;
};

type AdminRoutePortalPanelDescriptor = AdminRouteBaseDescriptor & {
  kind: 'portal-panel';
  panel: PortalAdminPanel;
  catalog: AdminRouteCatalogDescriptor;
};

export type AdminRouteDescriptor =
  | AdminRoutePageDescriptor
  | AdminRouteRedirectDescriptor
  | AdminRoutePortalPanelDescriptor;

export interface AdminRouteManifestBaseEntry {
  id: string;
  title: string;
  description?: string;
  path: string;
  wrapper: AdminRouteWrapper;
  adminSurface?: AdminSurface;
}

export interface AdminRouteManifestPageEntry extends AdminRouteManifestBaseEntry {
  kind: 'page';
  view: AdminRoutePageView;
}

export interface AdminRouteManifestRedirectEntry extends AdminRouteManifestBaseEntry {
  kind: 'redirect';
  redirectsTo: string;
}

export interface AdminRouteManifestPortalPanelEntry extends AdminRouteManifestBaseEntry {
  kind: 'portal-panel';
  panel: PortalAdminPanel;
}

export interface AdminRouteManifestSectionEntry extends AdminRouteManifestBaseEntry {
  kind: 'section';
  sections: ReadonlyArray<AdminSettingsSection>;
}

export type AdminRouteManifestEntry =
  | AdminRouteManifestPageEntry
  | AdminRouteManifestRedirectEntry
  | AdminRouteManifestPortalPanelEntry
  | AdminRouteManifestSectionEntry;

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
const organizationSectionMeta = getAdminSettingsSectionDefinition('organization');
const auditLogsSectionMeta = getAdminSettingsSectionDefinition('audit_logs');

export const adminRouteDescriptors: ReadonlyArray<AdminRouteDescriptor> = [
  {
    routeId: 'admin-settings-communications',
    title: communicationsMeta.title,
    description: communicationsMeta.description,
    path: communicationsMeta.path,
    wrapper: 'protected',
    adminSurface: communicationsMeta.surface,
    kind: 'page',
    view: 'communications',
    catalog: {
      id: 'communications',
      factory: 'settings',
      featureStatus: 'available',
      adminNav: {
        mode: 'settings',
        order: 150,
        label: communicationsMeta.title,
        matchPrefixes: ['/settings/email-marketing'],
      },
    },
  },
  {
    routeId: 'admin-settings-email-marketing',
    title: 'Newsletter Campaigns',
    description: communicationsMeta.description,
    path: '/settings/email-marketing',
    wrapper: 'protected',
    adminSurface: communicationsMeta.surface,
    kind: 'page',
    view: 'communications',
    catalog: {
      id: 'email-marketing',
      factory: 'settings',
      title: 'Newsletter Campaigns',
      parentId: 'communications',
      featureStatus: 'available',
    },
  },
  {
    routeId: 'admin-settings-social-media',
    title: socialMediaMeta.title,
    description: socialMediaMeta.description,
    path: socialMediaMeta.path,
    wrapper: 'admin',
    adminSurface: socialMediaMeta.surface,
    kind: 'page',
    view: 'socialMedia',
    catalog: {
      id: 'social-media',
      factory: 'admin',
      featureStatus: 'available',
      adminNav: { mode: 'settings', order: 160, label: socialMediaMeta.title },
    },
  },
  {
    routeId: 'admin-settings-api',
    title: apiSettingsMeta.title,
    description: apiSettingsMeta.description,
    path: apiSettingsMeta.path,
    wrapper: 'protected',
    adminSurface: apiSettingsMeta.surface,
    kind: 'page',
    view: 'api',
    catalog: {
      id: 'api-settings',
      factory: 'settings',
      featureStatus: 'available',
      showInMobileDrawerUtilities: true,
      adminNav: { mode: 'settings', order: 120, label: apiSettingsMeta.title },
    },
  },
  {
    routeId: 'admin-settings-navigation',
    title: navigationSettingsMeta.title,
    description: navigationSettingsMeta.description,
    path: navigationSettingsMeta.path,
    wrapper: 'protected',
    adminSurface: navigationSettingsMeta.surface,
    kind: 'page',
    view: 'navigation',
    catalog: {
      id: 'navigation-settings',
      factory: 'settings',
      featureStatus: 'available',
      showInMobileDrawerUtilities: true,
      adminNav: { mode: 'settings', order: 130, label: 'Navigation' },
    },
  },
  {
    routeId: 'admin-settings-user',
    title: 'User settings',
    path: '/settings/user',
    wrapper: 'neoBrutalist',
    kind: 'page',
    view: 'user',
    catalog: {
      id: 'user-settings',
      factory: 'settings',
      featureStatus: 'available',
    },
  },
  {
    routeId: 'admin-settings-backup',
    title: backupSettingsMeta.title,
    description: backupSettingsMeta.description,
    path: backupSettingsMeta.path,
    wrapper: 'admin',
    adminSurface: backupSettingsMeta.surface,
    kind: 'page',
    view: 'backup',
    catalog: {
      id: 'backup-settings',
      factory: 'admin',
      adminNav: { mode: 'settings', order: 140, label: backupSettingsMeta.title },
    },
  },
  {
    routeId: 'legacy-email-marketing',
    title: 'Legacy communications redirect',
    path: '/email-marketing',
    wrapper: 'protected',
    kind: 'redirect',
    redirectsTo: communicationsMeta.path,
  },
  {
    routeId: 'legacy-admin-settings',
    title: 'Legacy admin settings redirect',
    path: '/settings/admin',
    wrapper: 'admin',
    kind: 'redirect',
    redirectsTo: dashboardSectionMeta.path,
  },
  {
    routeId: 'legacy-admin-email-settings',
    title: 'Legacy admin email settings redirect',
    path: '/settings/admin/email',
    wrapper: 'admin',
    kind: 'redirect',
    redirectsTo: communicationsMeta.path,
  },
  {
    routeId: 'legacy-admin-portal',
    title: 'Legacy portal admin redirect',
    path: '/settings/admin/portal',
    wrapper: 'admin',
    kind: 'redirect',
    redirectsTo: portalAccessMeta.path,
  },
  {
    routeId: 'legacy-organization-settings',
    title: 'Legacy organization settings redirect',
    path: '/settings/organization',
    wrapper: 'admin',
    kind: 'redirect',
    redirectsTo: organizationSectionMeta.path,
  },
  {
    routeId: 'legacy-admin-audit-logs',
    title: 'Legacy audit logs redirect',
    path: '/admin/audit-logs',
    wrapper: 'admin',
    kind: 'redirect',
    redirectsTo: auditLogsSectionMeta.path,
  },
  {
    routeId: 'portal-admin-access',
    title: portalAccessMeta.title,
    description: portalAccessMeta.description,
    path: portalAccessMeta.path,
    wrapper: 'admin',
    adminSurface: portalAccessMeta.surface,
    kind: 'portal-panel',
    panel: 'access',
    catalog: {
      id: 'portal-admin-access',
      factory: 'admin',
      adminNav: [
        {
          mode: 'settings',
          order: 110,
          label: portalAccessMeta.title,
          matchPrefixes: ['/settings/admin/portal'],
        },
        {
          mode: 'portal',
          order: 20,
          label: 'Access',
        },
      ],
    },
  },
  {
    routeId: 'portal-admin-users',
    title: portalUsersMeta.title,
    description: portalUsersMeta.description,
    path: portalUsersMeta.path,
    wrapper: 'admin',
    adminSurface: portalUsersMeta.surface,
    kind: 'portal-panel',
    panel: 'users',
    catalog: {
      id: 'portal-admin-users',
      factory: 'admin',
      adminNav: { mode: 'portal', order: 30, label: 'Users' },
    },
  },
  {
    routeId: 'portal-admin-conversations',
    title: portalConversationsMeta.title,
    description: portalConversationsMeta.description,
    path: portalConversationsMeta.path,
    wrapper: 'admin',
    adminSurface: portalConversationsMeta.surface,
    kind: 'portal-panel',
    panel: 'conversations',
    catalog: {
      id: 'portal-admin-conversations',
      factory: 'admin',
      adminNav: { mode: 'portal', order: 40, label: 'Conversations' },
    },
  },
  {
    routeId: 'portal-admin-appointments',
    title: portalAppointmentsMeta.title,
    description: portalAppointmentsMeta.description,
    path: portalAppointmentsMeta.path,
    wrapper: 'admin',
    adminSurface: portalAppointmentsMeta.surface,
    kind: 'portal-panel',
    panel: 'appointments',
    catalog: {
      id: 'portal-admin-appointments',
      factory: 'admin',
      adminNav: { mode: 'portal', order: 50, label: 'Appointments' },
    },
  },
  {
    routeId: 'portal-admin-slots',
    title: portalSlotsMeta.title,
    description: portalSlotsMeta.description,
    path: portalSlotsMeta.path,
    wrapper: 'admin',
    adminSurface: portalSlotsMeta.surface,
    kind: 'portal-panel',
    panel: 'slots',
    catalog: {
      id: 'portal-admin-slots',
      factory: 'admin',
      adminNav: { mode: 'portal', order: 60, label: 'Slots' },
    },
  },
] ;

export const adminSectionRouteEntry: AdminRouteManifestSectionEntry = {
  id: 'admin-settings-section-route',
  title: dashboardSectionMeta.title,
  description: dashboardSectionMeta.description,
  path: '/settings/admin/:section',
  wrapper: 'admin',
  adminSurface: 'core',
  kind: 'section',
  sections: adminSettingsSections,
};
