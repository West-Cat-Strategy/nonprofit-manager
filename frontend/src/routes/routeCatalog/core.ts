import { demoRouteCatalogEntries } from './demo';
import { portalRouteCatalogEntries } from './portal';
import { publicRouteCatalogEntries } from './public';
import { staffRouteCatalogEntries } from './staff';
import {
  createDefaultWorkspaceModuleSettings,
  resolveWorkspaceModuleForRouteId,
  type WorkspaceModuleSettings,
} from '../../features/workspaceModules/catalog';
import type {
  AdminNavigationMode,
  FeatureFlagValues,
  RouteArea,
  RouteCatalogAdminNavConfig,
  RouteCatalogEntry,
} from './types';

export const routeCatalog: readonly RouteCatalogEntry[] = [
  ...publicRouteCatalogEntries,
  ...portalRouteCatalogEntries,
  ...staffRouteCatalogEntries,
  ...demoRouteCatalogEntries,
];

const routeCatalogEntryById = new Map(routeCatalog.map((entry) => [entry.id, entry] as const));

export const routeAreaMeta: Record<
  RouteArea,
  { label: string; order: number; icon?: string; representativeIds?: string[] }
> = {
  Home: { label: 'Home', order: 10, icon: '⌂', representativeIds: ['dashboard', 'portal-dashboard'] },
  People: { label: 'People', order: 20, icon: '👥', representativeIds: ['contacts'] },
  Service: { label: 'Service', order: 30, icon: '🩺', representativeIds: ['cases'] },
  Engagement: { label: 'Engagement', order: 40, icon: '📅', representativeIds: ['events'] },
  Finance: { label: 'Finance', order: 50, icon: '💰', representativeIds: ['donations', 'grants'] },
  Insights: { label: 'Insights', order: 60, icon: '📈', representativeIds: ['reports', 'analytics'] },
  Publishing: { label: 'Publishing', order: 70, icon: '🌐', representativeIds: ['websites', 'website-builder'] },
  Admin: {
    label: 'Admin',
    order: 80,
    icon: '⚙️',
    representativeIds: ['navigation-settings', 'admin-settings', 'user-settings'],
  },
  Access: { label: 'Access', order: 10, icon: '🔐', representativeIds: ['login', 'portal-login'] },
  Events: { label: 'Events', order: 20, icon: '📅', representativeIds: ['public-events', 'portal-events'] },
  'Check-In': { label: 'Check-In', order: 30, icon: '✅' },
  Reports: { label: 'Reports', order: 40, icon: '🧾' },
  Cases: { label: 'Cases', order: 20, icon: '📋', representativeIds: ['portal-cases'] },
  Messages: { label: 'Messages', order: 30, icon: '💬', representativeIds: ['portal-messages'] },
  Documents: { label: 'Documents', order: 40, icon: '📎', representativeIds: ['portal-documents'] },
  Forms: { label: 'Forms', order: 50, icon: '📝', representativeIds: ['portal-forms'] },
  Appointments: { label: 'Appointments', order: 60, icon: '🗓️', representativeIds: ['portal-appointments'] },
  Account: { label: 'Account', order: 70, icon: '👤', representativeIds: ['portal-profile'] },
  Demo: { label: 'Demo', order: 90, icon: '🧪' },
};

export type ResolvedAdminNavigationEntry = RouteCatalogEntry & {
  adminNav: RouteCatalogAdminNavConfig;
};

const isAdminNavigationConfigArray = (
  adminNav: RouteCatalogEntry['adminNav']
): adminNav is readonly RouteCatalogAdminNavConfig[] => Array.isArray(adminNav);

const getAdminNavConfigs = (entry: RouteCatalogEntry): readonly RouteCatalogAdminNavConfig[] => {
  const { adminNav } = entry;
  if (!adminNav) {
    return [];
  }

  return isAdminNavigationConfigArray(adminNav) ? [...adminNav] : [adminNav];
};

export function getRouteHref(entry: RouteCatalogEntry): string {
  return entry.href ?? entry.path;
}

export function getRouteCatalogEntryById(id: string): RouteCatalogEntry | null {
  return routeCatalogEntryById.get(id) ?? null;
}

export function getRouteAreaLabel(area: RouteArea): string {
  return routeAreaMeta[area]?.label ?? area;
}

export function isRouteCatalogEntryEnabled(
  entry: RouteCatalogEntry,
  flags: FeatureFlagValues = {},
  workspaceModules: WorkspaceModuleSettings = createDefaultWorkspaceModuleSettings()
): boolean {
  if (!entry.featureFlagEnv) {
    const workspaceModule = resolveWorkspaceModuleForRouteId(entry.id);
    return workspaceModule ? workspaceModules[workspaceModule] !== false : true;
  }

  const flagValue = flags[entry.featureFlagEnv];
  if (flagValue === false || flagValue === 'false' || flagValue === '0') {
    return false;
  }

  const workspaceModule = resolveWorkspaceModuleForRouteId(entry.id);
  return workspaceModule ? workspaceModules[workspaceModule] !== false : true;
}

export function getAdminNavigationEntries(
  mode: AdminNavigationMode
): ResolvedAdminNavigationEntry[] {
  return routeCatalog
    .flatMap((entry) =>
      getAdminNavConfigs(entry)
        .filter((config) => config.mode === mode)
        .map((config) => ({
          ...entry,
          adminNav: config,
        }))
    )
    .sort((left, right) => {
      const leftOrder = left.adminNav.order ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.adminNav.order ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder;
    });
}
