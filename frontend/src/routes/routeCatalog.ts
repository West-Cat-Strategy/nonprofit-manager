export type {
  AdminNavigationMode,
  FeatureAccessStatus,
  FeatureFlagValues,
  RouteArea,
  RouteAuthScope,
  RouteCatalogAdminNavConfig,
  RouteCatalogEntry,
  RouteNavKind,
  RouteSection,
  RouteSurface,
  StaffNavGroup,
  UiAuditScore,
} from './routeCatalog/types';

export {
  getAdminNavigationEntries,
  getRouteAreaLabel,
  getRouteCatalogEntryById,
  getRouteHref,
  isRouteCatalogEntryEnabled,
  routeCatalog,
  type ResolvedAdminNavigationEntry,
} from './routeCatalog/core';

export {
  matchRouteCatalogEntry,
  normalizeRouteLocation,
} from './routeCatalog/matching';

export {
  getPortalNavigationEntries,
  getRouteBreadcrumbs,
  getRouteLocalNavigation,
  getStaffNavigationEntries,
  getStaffUtilityEntries,
  getSurfaceAreaNavigation,
  type RouteBreadcrumbEntry,
  type RouteNavigationEntry,
  type SurfaceAreaNavigationEntry,
} from './routeCatalog/navigation';

export { routeCatalog as default } from './routeCatalog/core';
