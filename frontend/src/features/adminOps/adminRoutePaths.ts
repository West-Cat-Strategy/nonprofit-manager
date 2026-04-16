import {
  getRouteCatalogEntryById,
  getRouteHref,
} from '../../routes/routeCatalog';
import {
  adminSettingsSectionDefinitionById,
  adminSettingsSections,
  portalAdminDefinitionByPanel,
  type AdminSettingsSection,
  type PortalAdminPanel,
} from './adminNavigationCatalog';

export type { AdminSettingsSection, PortalAdminPanel };

const adminSettingsSectionSet = new Set<AdminSettingsSection>(adminSettingsSections);

const getAdminSettingsRouteId = (section: AdminSettingsSection): string => {
  const definition = adminSettingsSectionDefinitionById.get(section);
  if (!definition) {
    throw new Error(`Missing admin settings definition for ${section}`);
  }

  return definition.routeId;
};

const getPortalAdminRouteId = (panel: PortalAdminPanel): string => {
  const definition = portalAdminDefinitionByPanel.get(panel);
  if (!definition) {
    throw new Error(`Missing portal admin definition for ${panel}`);
  }

  return definition.routeId;
};

const adminSettingsRouteIds: Record<AdminSettingsSection, string> = {
  approvals: getAdminSettingsRouteId('approvals'),
  dashboard: getAdminSettingsRouteId('dashboard'),
  organization: getAdminSettingsRouteId('organization'),
  workspace_modules: getAdminSettingsRouteId('workspace_modules'),
  branding: getAdminSettingsRouteId('branding'),
  users: getAdminSettingsRouteId('users'),
  groups: getAdminSettingsRouteId('groups'),
  communications: getAdminSettingsRouteId('communications'),
  messaging: getAdminSettingsRouteId('messaging'),
  outcomes: getAdminSettingsRouteId('outcomes'),
  roles: getAdminSettingsRouteId('roles'),
  audit_logs: getAdminSettingsRouteId('audit_logs'),
  other: getAdminSettingsRouteId('other'),
};

const portalAdminRouteIds: Record<PortalAdminPanel, string> = {
  access: getPortalAdminRouteId('access'),
  users: getPortalAdminRouteId('users'),
  conversations: getPortalAdminRouteId('conversations'),
  appointments: getPortalAdminRouteId('appointments'),
  slots: getPortalAdminRouteId('slots'),
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
