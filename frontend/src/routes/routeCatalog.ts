import { demoRouteCatalogEntries } from './routeCatalog/demo';
import { portalRouteCatalogEntries } from './routeCatalog/portal';
import { publicRouteCatalogEntries } from './routeCatalog/public';
import { staffRouteCatalogEntries } from './routeCatalog/staff';
import type {
  AdminNavigationMode,
  FeatureFlagValues,
  RouteCatalogAdminNavConfig,
  RouteCatalogAlias,
  RouteCatalogEntry,
} from './routeCatalog/types';

export type {
  AdminNavigationMode,
  FeatureAccessStatus,
  FeatureFlagValues,
  RouteAuthScope,
  RouteCatalogAdminNavConfig,
  RouteCatalogAlias,
  RouteCatalogEntry,
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

  return aliasQueryEntries.every(
    ([key, value]) => currentLocation.searchParams.get(key) === value
  );
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

const getAdminNavConfigs = (
  entry: RouteCatalogEntry
): readonly RouteCatalogAdminNavConfig[] => {
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
      !entry.path.includes(':') &&
      normalizeRouteLocation(entry.path) === currentLocation.pathname
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
