import {
  getRouteCatalogEntryById,
  getRouteHref,
} from '../../routes/routeCatalog';
import {
  adminSettingsSectionDefinitions,
  adminSettingsSections,
  portalAdminDefinitionByPanel,
  type AdminSettingsSection,
  type PortalAdminPanel,
} from './adminNavigationCatalog';

export type { AdminSettingsSection, PortalAdminPanel };

const adminSettingsSectionSet = new Set<AdminSettingsSection>(adminSettingsSections);

const adminSettingsRouteIds: Record<AdminSettingsSection, string> = {
  dashboard: adminSettingsSectionDefinitions[0].routeId,
  organization: adminSettingsSectionDefinitions[1].routeId,
  workspace_modules: adminSettingsSectionDefinitions[2].routeId,
  branding: adminSettingsSectionDefinitions[3].routeId,
  users: adminSettingsSectionDefinitions[4].routeId,
  groups: adminSettingsSectionDefinitions[5].routeId,
  communications: adminSettingsSectionDefinitions[6].routeId,
  messaging: adminSettingsSectionDefinitions[7].routeId,
  outcomes: adminSettingsSectionDefinitions[8].routeId,
  roles: adminSettingsSectionDefinitions[9].routeId,
  audit_logs: adminSettingsSectionDefinitions[10].routeId,
  other: adminSettingsSectionDefinitions[11].routeId,
};

const portalAdminRouteIds: Record<PortalAdminPanel, string> = {
  access: portalAdminDefinitionByPanel.get('access')!.routeId,
  users: portalAdminDefinitionByPanel.get('users')!.routeId,
  conversations: portalAdminDefinitionByPanel.get('conversations')!.routeId,
  appointments: portalAdminDefinitionByPanel.get('appointments')!.routeId,
  slots: portalAdminDefinitionByPanel.get('slots')!.routeId,
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
