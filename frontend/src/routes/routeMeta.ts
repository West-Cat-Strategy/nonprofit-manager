import {
  getRouteBreadcrumbs,
  getRouteLocalNavigation,
  getRouteAreaLabel,
  matchRouteCatalogEntry,
  type RouteArea,
  type RouteBreadcrumbEntry,
  type RouteNavigationEntry,
  type RouteSurface,
} from './routeCatalog';
import type { StartupRouteSection } from './startupRouteCatalog';

export interface RouteMeta {
  title: string;
  section: StartupRouteSection;
  area: RouteArea;
  areaLabel: string;
  surface: RouteSurface;
  requiresAuth: boolean;
  breadcrumbs: RouteBreadcrumbEntry[];
  localNavigation: RouteNavigationEntry[];
  primaryAction?: {
    label: string;
    path: string;
  };
}

export function getRouteMeta(pathname: string): RouteMeta {
  const matched = matchRouteCatalogEntry(pathname);
  if (matched) {
    return {
      title: matched.title,
      section: matched.section,
      area: matched.area,
      areaLabel: getRouteAreaLabel(matched.area),
      surface: matched.surface,
      requiresAuth: matched.requiresAuth,
      breadcrumbs: getRouteBreadcrumbs(pathname),
      localNavigation: getRouteLocalNavigation(pathname),
      primaryAction: matched.primaryAction
        ? { label: matched.primaryAction.label, path: matched.primaryAction.href }
        : undefined,
    };
  }

  return {
    title: 'Workspace',
    section: 'Core',
    area: 'Home',
    areaLabel: 'Home',
    surface: 'staff',
    requiresAuth: true,
    breadcrumbs: [],
    localNavigation: [],
  };
}
