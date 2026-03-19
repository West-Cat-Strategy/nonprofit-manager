import {
  getRouteCatalogEntryById,
  getRouteHref,
} from '../../routes/routeCatalog';
import { adminSettingsTabs } from './pages/adminSettings/constants';

export type AdminSettingsSection = (typeof adminSettingsTabs)[number]['id'];

export type PortalAdminPanel =
  | 'access'
  | 'users'
  | 'conversations'
  | 'appointments'
  | 'slots';

const adminSettingsSectionSet = new Set<AdminSettingsSection>(
  adminSettingsTabs.map((tab) => tab.id)
);

const adminSettingsRouteIds: Record<AdminSettingsSection, string> = {
  dashboard: 'admin-settings',
  organization: 'admin-settings-organization',
  workspace_modules: 'admin-settings-workspace-modules',
  branding: 'admin-settings-branding',
  users: 'admin-settings-users',
  email: 'admin-settings-email',
  messaging: 'admin-settings-messaging',
  outcomes: 'admin-settings-outcomes',
  roles: 'admin-settings-roles',
  audit_logs: 'admin-settings-audit-logs',
  other: 'admin-settings-other',
};

const portalAdminRouteIds: Record<PortalAdminPanel, string> = {
  access: 'portal-admin-access',
  users: 'portal-admin-users',
  conversations: 'portal-admin-conversations',
  appointments: 'portal-admin-appointments',
  slots: 'portal-admin-slots',
};

const getCatalogPath = (id: string): string => {
  const entry = getRouteCatalogEntryById(id);
  if (!entry) {
    throw new Error(`Missing route catalog entry: ${id}`);
  }

  return getRouteHref(entry);
};

export const parseAdminSettingsSection = (
  value: string | null | undefined
): AdminSettingsSection | null => {
  if (!value) {
    return null;
  }

  return adminSettingsSectionSet.has(value as AdminSettingsSection)
    ? (value as AdminSettingsSection)
    : null;
};

export const isAdminSettingsSection = (
  value: string | null | undefined
): value is AdminSettingsSection => parseAdminSettingsSection(value) !== null;

export const getAdminSettingsPath = (
  section: AdminSettingsSection = 'dashboard'
): string => getCatalogPath(adminSettingsRouteIds[section]);

export const getPortalAdminPath = (
  panel: PortalAdminPanel = 'access'
): string => getCatalogPath(portalAdminRouteIds[panel]);
