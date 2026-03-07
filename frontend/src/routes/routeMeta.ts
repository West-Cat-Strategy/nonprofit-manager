import { matchStartupRouteMeta, type StartupRouteSection } from './startupRouteCatalog';

export interface RouteMeta {
  title: string;
  section: StartupRouteSection;
  requiresAuth: boolean;
  primaryAction?: {
    label: string;
    path: string;
  };
}

export function getRouteMeta(pathname: string): RouteMeta {
  const matched = matchStartupRouteMeta(pathname);
  if (matched) {
    return {
      title: matched.title,
      section: matched.section,
      requiresAuth: matched.requiresAuth,
      primaryAction: matched.primaryAction
        ? { label: matched.primaryAction.label, path: matched.primaryAction.href }
        : undefined,
    };
  }

  return {
    title: 'Workspace',
    section: 'Core',
    requiresAuth: true,
  };
}
