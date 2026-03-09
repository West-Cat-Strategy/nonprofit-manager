import { demoRouteCatalogEntries } from './routeCatalog/demo';
import { portalRouteCatalogEntries } from './routeCatalog/portal';
import { publicRouteCatalogEntries } from './routeCatalog/public';
import { staffRouteCatalogEntries } from './routeCatalog/staff';
import type {
  AdminNavigationMode,
  FeatureFlagValues,
  RouteArea,
  RouteCatalogAdminNavConfig,
  RouteCatalogAlias,
  RouteCatalogEntry,
  RouteSurface,
} from './routeCatalog/types';

export type {
  AdminNavigationMode,
  FeatureAccessStatus,
  FeatureFlagValues,
  RouteArea,
  RouteAuthScope,
  RouteCatalogAdminNavConfig,
  RouteCatalogAlias,
  RouteCatalogEntry,
  RouteNavKind,
  RouteSection,
  RouteSurface,
  StaffNavGroup,
  UiAuditScore,
} from './routeCatalog/types';

export const routeCatalog: readonly RouteCatalogEntry[] = [
  ...publicRouteCatalogEntries,
  ...portalRouteCatalogEntries,
  ...staffRouteCatalogEntries,
  ...demoRouteCatalogEntries,
];

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
}

const routeAreaMeta: Record<
  RouteArea,
  { label: string; order: number; icon?: string; representativeIds?: string[] }
> = {
  Home: { label: 'Home', order: 10, icon: '⌂', representativeIds: ['dashboard', 'portal-dashboard'] },
  People: { label: 'People', order: 20, icon: '👥', representativeIds: ['contacts'] },
  Service: { label: 'Service', order: 30, icon: '🩺', representativeIds: ['cases'] },
  Engagement: { label: 'Engagement', order: 40, icon: '📅', representativeIds: ['events'] },
  Finance: { label: 'Finance', order: 50, icon: '💰', representativeIds: ['donations'] },
  Insights: { label: 'Insights', order: 60, icon: '📈', representativeIds: ['reports', 'analytics'] },
  Publishing: { label: 'Publishing', order: 70, icon: '🌐', representativeIds: ['websites', 'website-builder'] },
  Admin: { label: 'Admin', order: 80, icon: '⚙️', representativeIds: ['navigation-settings', 'admin-settings', 'user-settings'] },
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

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeTrailingSlash = (value: string): string => {
  if (!value || value === '/') {
    return '/';
  }
  return value.endsWith('/') ? value.slice(0, -1) : value;
};

export function normalizeRouteLocation(value: string): string {
  try {
    const url = new URL(value, 'http://localhost');
    const normalizedPath = normalizeTrailingSlash(url.pathname);
    return `${normalizedPath}${url.search}`;
  } catch {
    const [rawPath = '/', rawSearch = ''] = String(value).split('?');
    const normalizedPath = normalizeTrailingSlash(rawPath || '/');
    return rawSearch ? `${normalizedPath}?${rawSearch}` : normalizedPath;
  }
}

type ParsedRouteLocation = {
  normalized: string;
  pathname: string;
  searchParams: URLSearchParams;
};

type NormalizedRouteAlias = {
  path: string;
  query: Record<string, string>;
  exactQuery: boolean;
};

export type ResolvedAdminNavigationEntry = RouteCatalogEntry & {
  adminNav: RouteCatalogAdminNavConfig;
};

const isAdminNavigationConfigArray = (
  adminNav: RouteCatalogEntry['adminNav']
): adminNav is readonly RouteCatalogAdminNavConfig[] => Array.isArray(adminNav);

const parseRouteLocation = (value: string): ParsedRouteLocation => {
  const normalized = normalizeRouteLocation(value);
  const parsed = new URL(normalized, 'http://localhost');
  return {
    normalized,
    pathname: parsed.pathname,
    searchParams: parsed.searchParams,
  };
};

const normalizeRouteAlias = (alias: string | RouteCatalogAlias): NormalizedRouteAlias => {
  if (typeof alias === 'string') {
    const parsed = new URL(normalizeRouteLocation(alias), 'http://localhost');
    return {
      path: parsed.pathname,
      query: Object.fromEntries(parsed.searchParams.entries()),
      exactQuery: parsed.search.length > 0,
    };
  }

  return {
    path: normalizeRouteLocation(alias.path).split('?')[0] || '/',
    query: alias.query ?? {},
    exactQuery: alias.exactQuery === true,
  };
};

const routeAliasMatches = (
  alias: string | RouteCatalogAlias,
  currentLocation: ParsedRouteLocation
): boolean => {
  const normalizedAlias = normalizeRouteAlias(alias);
  if (currentLocation.pathname !== normalizedAlias.path) {
    return false;
  }

  const aliasQueryEntries = Object.entries(normalizedAlias.query);
  if (
    normalizedAlias.exactQuery &&
    currentLocation.searchParams.size !== aliasQueryEntries.length
  ) {
    return false;
  }

  return aliasQueryEntries.every(([key, value]) => currentLocation.searchParams.get(key) === value);
};

const buildAliasRedirectTarget = (
  entry: RouteCatalogEntry,
  currentLocation: ParsedRouteLocation,
  alias: string | RouteCatalogAlias
): string => {
  const normalizedAlias = normalizeRouteAlias(alias);
  const canonicalUrl = new URL(normalizeRouteLocation(getRouteHref(entry)), 'http://localhost');
  const canonicalParams = new URLSearchParams(canonicalUrl.search);
  const remainingParams = new URLSearchParams(currentLocation.searchParams);

  for (const key of Object.keys(normalizedAlias.query)) {
    remainingParams.delete(key);
  }

  for (const [key, value] of canonicalParams.entries()) {
    remainingParams.set(key, value);
  }

  return remainingParams.size > 0
    ? `${canonicalUrl.pathname}?${remainingParams.toString()}`
    : canonicalUrl.pathname;
};

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
  return routeCatalog.find((entry) => entry.id === id) ?? null;
}

export function getRouteAreaLabel(area: RouteArea): string {
  return routeAreaMeta[area]?.label ?? area;
}

export function isRouteCatalogEntryEnabled(
  entry: RouteCatalogEntry,
  flags: FeatureFlagValues = {}
): boolean {
  if (!entry.featureFlagEnv) {
    return true;
  }

  const flagValue = flags[entry.featureFlagEnv];
  return flagValue !== false && flagValue !== 'false' && flagValue !== '0';
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

  if (entry.surface !== surface || !isRouteCatalogEntryEnabled(entry, flags)) {
    return false;
  }

  if (surface === 'staff') {
    return Boolean(entry.staffNav) && entry.navKind !== 'utility' && (!enabledSet || enabledSet.has(entry.id));
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
  const visibleEntries = getVisibleSurfaceEntries(surface, options).filter((entry) => entry.area === area);
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
  entry.staffNav?.shortLabel ?? entry.staffNav?.label ?? entry.portalNav?.label ?? entry.breadcrumbLabel;

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
  const areaRepresentativeEntry = getAreaRepresentativeEntry(currentEntry.surface, currentEntry.area, options);
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

export function resolveRouteCatalogAlias(value: string): string | null {
  const currentLocation = parseRouteLocation(value);

  for (const entry of routeCatalog) {
    for (const alias of entry.aliases ?? []) {
      if (!routeAliasMatches(alias, currentLocation)) {
        continue;
      }

      const target = buildAliasRedirectTarget(entry, currentLocation, alias);
      return target === currentLocation.normalized ? null : target;
    }
  }

  return null;
}

export function matchRouteCatalogEntry(value: string): RouteCatalogEntry | null {
  const currentLocation = parseRouteLocation(value);

  const hrefMatch = routeCatalog.find(
    (entry) => normalizeRouteLocation(getRouteHref(entry)) === currentLocation.normalized
  );
  if (hrefMatch) {
    return hrefMatch;
  }

  const exactPathMatch = routeCatalog.find(
    (entry) =>
      !entry.path.includes(':') && normalizeRouteLocation(entry.path) === currentLocation.pathname
  );
  if (exactPathMatch) {
    return exactPathMatch;
  }

  const aliasMatch = routeCatalog.find((entry) =>
    (entry.aliases ?? []).some((alias) => routeAliasMatches(alias, currentLocation))
  );
  if (aliasMatch) {
    return aliasMatch;
  }

  return (
    routeCatalog.find((entry) => {
      if (!entry.path.includes(':')) {
        return false;
      }

      const pattern = `^${escapeRegex(entry.path).replace(/:[^/]+/g, '[^/]+')}$`;
      return new RegExp(pattern).test(currentLocation.pathname);
    }) ?? null
  );
}

export function getStaffNavigationEntries(flags: FeatureFlagValues = {}): RouteCatalogEntry[] {
  return routeCatalog
    .filter((entry) => entry.staffNav && isRouteCatalogEntryEnabled(entry, flags))
    .sort((left, right) => {
      const leftOrder = left.staffNav?.order ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.staffNav?.order ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder;
    });
}

export function getStaffUtilityEntries(flags: FeatureFlagValues = {}): RouteCatalogEntry[] {
  return getStaffNavigationEntries(flags).filter((entry) => entry.staffNav?.group === 'utility');
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

export default routeCatalog;
