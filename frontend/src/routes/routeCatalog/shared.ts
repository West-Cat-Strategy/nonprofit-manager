import type { RouteCatalogEntry, RouteSurface, UiAuditScore } from './types';

type RouteCatalogSeed = Omit<RouteCatalogEntry, 'href' | 'featureStatus' | 'auditScore'> &
  Partial<Pick<RouteCatalogEntry, 'href' | 'featureStatus' | 'auditScore'>>;

const defaultAuditScoresBySurface: Record<RouteSurface, UiAuditScore> = {
  public: { readability: 4, accessibility: 4, efficiency: 4, workflowClarity: 4 },
  staff: { readability: 4, accessibility: 4, efficiency: 4, workflowClarity: 4 },
  portal: { readability: 4, accessibility: 4, efficiency: 4, workflowClarity: 4 },
  demo: { readability: 3, accessibility: 3, efficiency: 3, workflowClarity: 3 },
};

const withDefaults = (entry: RouteCatalogSeed): RouteCatalogEntry => ({
  ...entry,
  href: entry.href ?? entry.path,
  featureStatus:
    entry.featureStatus ?? (entry.authScope === 'admin' ? 'role-gated' : 'available'),
  auditScore: entry.auditScore ?? { ...defaultAuditScoresBySurface[entry.surface] },
});

export const publicRoute = (
  entry: Omit<RouteCatalogSeed, 'surface' | 'authScope' | 'requiresAuth'>
) =>
  withDefaults({
    ...entry,
    surface: 'public',
    authScope: 'public',
    requiresAuth: false,
  });

export const demoRoute = (
  entry: Omit<RouteCatalogSeed, 'surface' | 'authScope' | 'requiresAuth' | 'section'>
) =>
  withDefaults({
    ...entry,
    section: 'Demo',
    surface: 'demo',
    authScope: 'public',
    requiresAuth: false,
  });

export const staffRoute = (
  entry: Omit<RouteCatalogSeed, 'surface' | 'authScope' | 'requiresAuth'>
) =>
  withDefaults({
    ...entry,
    surface: 'staff',
    authScope: 'staff',
    requiresAuth: true,
  });

export const settingsRoute = (
  entry: Omit<RouteCatalogSeed, 'surface' | 'authScope' | 'requiresAuth' | 'section'>
) =>
  withDefaults({
    ...entry,
    section: 'Settings',
    surface: 'staff',
    authScope: 'staff',
    requiresAuth: true,
  });

export const adminRoute = (
  entry: Omit<RouteCatalogSeed, 'surface' | 'authScope' | 'requiresAuth' | 'section'>
) =>
  withDefaults({
    ...entry,
    section: 'Settings',
    surface: 'staff',
    authScope: 'admin',
    requiresAuth: true,
  });

export const portalPublicRoute = (
  entry: Omit<RouteCatalogSeed, 'surface' | 'authScope' | 'requiresAuth' | 'section'>
) =>
  withDefaults({
    ...entry,
    section: 'Portal',
    surface: 'public',
    authScope: 'public',
    requiresAuth: false,
  });

export const portalRoute = (
  entry: Omit<RouteCatalogSeed, 'surface' | 'authScope' | 'requiresAuth' | 'section'>
) =>
  withDefaults({
    ...entry,
    section: 'Portal',
    surface: 'portal',
    authScope: 'portal',
    requiresAuth: true,
  });
