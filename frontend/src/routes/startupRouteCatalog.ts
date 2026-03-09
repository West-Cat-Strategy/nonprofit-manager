import {
  getPortalNavigationEntries,
  getStaffNavigationEntries,
  getStaffUtilityEntries,
  matchRouteCatalogEntry,
  normalizeRouteLocation,
  type FeatureFlagValues,
  type RouteCatalogEntry,
  type RouteSection,
} from './routeCatalog';

export type StartupRouteSection = RouteSection;

export type StartupRouteEntry = Pick<
  RouteCatalogEntry,
  | 'id'
  | 'title'
  | 'section'
  | 'area'
  | 'navKind'
  | 'parentId'
  | 'breadcrumbLabel'
  | 'path'
  | 'href'
  | 'requiresAuth'
  | 'staffNav'
  | 'portalNav'
>;

type RouteMetaMatch = {
  title: string;
  section: StartupRouteSection;
  area: RouteCatalogEntry['area'];
  requiresAuth: boolean;
  path: string;
  navKind: RouteCatalogEntry['navKind'];
  parentId?: string;
  breadcrumbLabel: string;
  primaryAction?: {
    label: string;
    href: string;
  };
};

const toStartupRouteEntry = (entry: RouteCatalogEntry): StartupRouteEntry => ({
  id: entry.id,
  title: entry.title,
  section: entry.section,
  area: entry.area,
  navKind: entry.navKind,
  parentId: entry.parentId,
  breadcrumbLabel: entry.breadcrumbLabel,
  path: entry.path,
  href: entry.href,
  requiresAuth: entry.requiresAuth,
  staffNav: entry.staffNav,
  portalNav: entry.portalNav,
});

export const normalizeStartupRouteLocation = (value: string): string =>
  normalizeRouteLocation(value);

export const matchStartupRouteMeta = (value: string): RouteMetaMatch | null => {
  const matched = matchRouteCatalogEntry(value);
  if (!matched) {
    return null;
  }

  return {
    title: matched.title,
    section: matched.section,
    area: matched.area,
    requiresAuth: matched.requiresAuth,
    path: matched.path,
    navKind: matched.navKind,
    parentId: matched.parentId,
    breadcrumbLabel: matched.breadcrumbLabel,
    primaryAction: matched.primaryAction,
  };
};

export const getStartupPortalNavigationEntries = (): StartupRouteEntry[] =>
  getPortalNavigationEntries().map(toStartupRouteEntry);

export const getStartupStaffNavigationEntries = (
  flags: FeatureFlagValues = {}
): StartupRouteEntry[] => getStaffNavigationEntries(flags).map(toStartupRouteEntry);

export const getStartupStaffUtilityEntries = (
  flags: FeatureFlagValues = {}
): StartupRouteEntry[] => getStaffUtilityEntries(flags).map(toStartupRouteEntry);
