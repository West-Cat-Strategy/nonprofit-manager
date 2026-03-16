import {
  createDefaultWorkspaceModuleSettings,
  type WorkspaceModuleSettings,
} from '../../features/workspaceModules/catalog';
import {
  getRouteAreaLabel,
  getRouteCatalogEntryById,
  getRouteHref,
  isRouteCatalogEntryEnabled,
  routeAreaMeta,
  routeCatalog,
} from './core';
import { matchRouteCatalogEntry } from './matching';
import type {
  FeatureFlagValues,
  RouteArea,
  RouteCatalogEntry,
  RouteSurface,
} from './types';

export interface RouteBreadcrumbEntry {
  label: string;
  href: string;
  current?: boolean;
}

export interface RouteNavigationEntry {
  id: string;
  area: RouteArea;
  label: string;
  shortLabel: string;
  href: string;
  icon?: string;
  isActive: boolean;
}

export interface SurfaceAreaNavigationEntry extends RouteNavigationEntry {
  entries: RouteCatalogEntry[];
}

interface RouteCatalogQueryOptions {
  enabledRouteIds?: Iterable<string>;
  flags?: FeatureFlagValues;
  workspaceModules?: WorkspaceModuleSettings;
}

const toEnabledRouteSet = (enabledRouteIds?: Iterable<string>): Set<string> | null => {
  if (!enabledRouteIds) {
    return null;
  }
  return enabledRouteIds instanceof Set ? enabledRouteIds : new Set(enabledRouteIds);
};

const getNavigationOrder = (entry: RouteCatalogEntry): number => {
  if (entry.surface === 'staff') {
    return entry.staffNav?.order ?? Number.MAX_SAFE_INTEGER;
  }
  if (entry.surface === 'portal') {
    return entry.portalNav?.order ?? Number.MAX_SAFE_INTEGER;
  }
  return Number.MAX_SAFE_INTEGER;
};

const sortNavigationEntries = (left: RouteCatalogEntry, right: RouteCatalogEntry): number => {
  const orderDelta = getNavigationOrder(left) - getNavigationOrder(right);
  if (orderDelta !== 0) {
    return orderDelta;
  }
  return left.title.localeCompare(right.title);
};

const isEntryVisibleForSurfaceNavigation = (
  entry: RouteCatalogEntry,
  surface: RouteSurface,
  options: RouteCatalogQueryOptions = {}
): boolean => {
  const enabledSet = toEnabledRouteSet(options.enabledRouteIds);
  const flags = options.flags ?? {};
  const workspaceModules = options.workspaceModules ?? createDefaultWorkspaceModuleSettings();

  if (entry.surface !== surface || !isRouteCatalogEntryEnabled(entry, flags, workspaceModules)) {
    return false;
  }

  if (surface === 'staff') {
    return (
      Boolean(entry.staffNav) &&
      entry.navKind !== 'utility' &&
      (!enabledSet || enabledSet.has(entry.id))
    );
  }

  if (surface === 'portal') {
    return Boolean(entry.portalNav);
  }

  if (surface === 'public') {
    return entry.navKind === 'hub' && !entry.path.includes(':');
  }

  return false;
};

const getVisibleSurfaceEntries = (
  surface: RouteSurface,
  options: RouteCatalogQueryOptions = {}
): RouteCatalogEntry[] =>
  routeCatalog
    .filter((entry) => isEntryVisibleForSurfaceNavigation(entry, surface, options))
    .sort(sortNavigationEntries);

const getAreaRepresentativeEntry = (
  surface: RouteSurface,
  area: RouteArea,
  options: RouteCatalogQueryOptions = {}
): RouteCatalogEntry | null => {
  const visibleEntries = getVisibleSurfaceEntries(surface, options).filter(
    (entry) => entry.area === area
  );
  if (visibleEntries.length === 0) {
    return null;
  }

  for (const preferredId of routeAreaMeta[area]?.representativeIds ?? []) {
    const preferredEntry = visibleEntries.find((entry) => entry.id === preferredId);
    if (preferredEntry) {
      return preferredEntry;
    }
  }

  return visibleEntries[0] ?? null;
};

const getEntryNavigationLabel = (entry: RouteCatalogEntry): string =>
  entry.staffNav?.label ?? entry.portalNav?.label ?? entry.breadcrumbLabel;

const getEntryNavigationShortLabel = (entry: RouteCatalogEntry): string =>
  entry.staffNav?.shortLabel ??
  entry.staffNav?.label ??
  entry.portalNav?.label ??
  entry.breadcrumbLabel;

const getEntryNavigationIcon = (entry: RouteCatalogEntry): string | undefined =>
  entry.staffNav?.icon ?? routeAreaMeta[entry.area]?.icon;

const getCurrentHubId = (entry: RouteCatalogEntry): string =>
  entry.navKind === 'hub' ? entry.id : entry.parentId ?? entry.id;

const toRouteNavigationEntry = (
  entry: RouteCatalogEntry,
  activeRouteId: string | null
): RouteNavigationEntry => ({
  id: entry.id,
  area: entry.area,
  label: getEntryNavigationLabel(entry),
  shortLabel: getEntryNavigationShortLabel(entry),
  href: getRouteHref(entry),
  icon: getEntryNavigationIcon(entry),
  isActive: activeRouteId === entry.id,
});

export function getSurfaceAreaNavigation(
  surface: RouteSurface,
  currentLocation: string,
  options: RouteCatalogQueryOptions = {}
): SurfaceAreaNavigationEntry[] {
  const currentEntry = matchRouteCatalogEntry(currentLocation);
  const visibleEntries = getVisibleSurfaceEntries(surface, options);
  const groupedEntries = new Map<RouteArea, RouteCatalogEntry[]>();

  for (const entry of visibleEntries) {
    const existingEntries = groupedEntries.get(entry.area) ?? [];
    existingEntries.push(entry);
    groupedEntries.set(entry.area, existingEntries);
  }

  return [...groupedEntries.entries()]
    .map(([area, entries]) => {
      const representativeEntry = getAreaRepresentativeEntry(surface, area, options) ?? entries[0];
      return {
        id: representativeEntry.id,
        area,
        label: getRouteAreaLabel(area),
        shortLabel: getRouteAreaLabel(area),
        href: getRouteHref(representativeEntry),
        icon: routeAreaMeta[area]?.icon ?? getEntryNavigationIcon(representativeEntry),
        isActive: currentEntry?.surface === surface && currentEntry.area === area,
        entries,
      };
    })
    .sort((left, right) => {
      const orderDelta =
        (routeAreaMeta[left.area]?.order ?? Number.MAX_SAFE_INTEGER) -
        (routeAreaMeta[right.area]?.order ?? Number.MAX_SAFE_INTEGER);
      if (orderDelta !== 0) {
        return orderDelta;
      }
      return left.label.localeCompare(right.label);
    });
}

export function getRouteLocalNavigation(
  value: string,
  options: RouteCatalogQueryOptions = {}
): RouteNavigationEntry[] {
  const currentEntry = matchRouteCatalogEntry(value);
  if (!currentEntry) {
    return [];
  }

  const activeRouteId = getCurrentHubId(currentEntry);
  const sameAreaEntries = getVisibleSurfaceEntries(currentEntry.surface, options).filter(
    (entry) => entry.area === currentEntry.area
  );

  if (sameAreaEntries.length > 1) {
    return sameAreaEntries.map((entry) => toRouteNavigationEntry(entry, activeRouteId));
  }

  return getSurfaceAreaNavigation(currentEntry.surface, value, options).map((entry) => ({
    id: entry.id,
    area: entry.area,
    label: entry.label,
    shortLabel: entry.shortLabel,
    href: entry.href,
    icon: entry.icon,
    isActive: entry.isActive,
  }));
}

export function getRouteBreadcrumbs(
  value: string,
  options: RouteCatalogQueryOptions = {}
): RouteBreadcrumbEntry[] {
  const currentEntry = matchRouteCatalogEntry(value);
  if (!currentEntry) {
    return [];
  }

  const breadcrumbs: RouteBreadcrumbEntry[] = [];
  const areaRepresentativeEntry = getAreaRepresentativeEntry(
    currentEntry.surface,
    currentEntry.area,
    options
  );
  const parentEntry = currentEntry.parentId ? getRouteCatalogEntryById(currentEntry.parentId) : null;
  const currentHref = getRouteHref(currentEntry);
  const areaLabel = getRouteAreaLabel(currentEntry.area);

  if (areaRepresentativeEntry) {
    breadcrumbs.push({
      label: areaLabel,
      href: getRouteHref(areaRepresentativeEntry),
      current: !parentEntry && currentEntry.id === areaRepresentativeEntry.id,
    });
  }

  if (parentEntry && parentEntry.id !== areaRepresentativeEntry?.id) {
    breadcrumbs.push({
      label: parentEntry.breadcrumbLabel,
      href: getRouteHref(parentEntry),
      current: currentEntry.id === parentEntry.id,
    });
  }

  const currentLabel = currentEntry.breadcrumbLabel;
  const lastBreadcrumb = breadcrumbs[breadcrumbs.length - 1];
  if (lastBreadcrumb?.label !== currentLabel || lastBreadcrumb?.href !== currentHref) {
    breadcrumbs.push({
      label: currentLabel,
      href: currentHref,
      current: true,
    });
  } else if (breadcrumbs.length > 0) {
    breadcrumbs[breadcrumbs.length - 1] = {
      ...breadcrumbs[breadcrumbs.length - 1],
      current: true,
    };
  }

  return breadcrumbs;
}

export function getStaffNavigationEntries(
  flags: FeatureFlagValues = {},
  workspaceModules: WorkspaceModuleSettings = createDefaultWorkspaceModuleSettings()
): RouteCatalogEntry[] {
  return routeCatalog
    .filter((entry) => entry.staffNav && isRouteCatalogEntryEnabled(entry, flags, workspaceModules))
    .sort((left, right) => {
      const leftOrder = left.staffNav?.order ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.staffNav?.order ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder;
    });
}

export function getStaffUtilityEntries(
  flags: FeatureFlagValues = {},
  workspaceModules: WorkspaceModuleSettings = createDefaultWorkspaceModuleSettings()
): RouteCatalogEntry[] {
  return getStaffNavigationEntries(flags, workspaceModules).filter(
    (entry) => entry.staffNav?.group === 'utility'
  );
}

export function getPortalNavigationEntries(): RouteCatalogEntry[] {
  return routeCatalog
    .filter((entry) => entry.portalNav)
    .sort((left, right) => {
      const leftOrder = left.portalNav?.order ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.portalNav?.order ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder;
    });
}
