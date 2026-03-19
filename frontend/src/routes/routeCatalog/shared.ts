import type {
  RouteArea,
  RouteCatalogEntry,
  RouteNavKind,
  RouteSection,
  RouteSurface,
  UiAuditScore,
} from './types';

type RouteCatalogSeed = Omit<
  RouteCatalogEntry,
  'href' | 'featureStatus' | 'auditScore' | 'area' | 'navKind' | 'parentId' | 'breadcrumbLabel'
> &
  Partial<
    Pick<
      RouteCatalogEntry,
      'href' | 'featureStatus' | 'auditScore' | 'area' | 'navKind' | 'parentId' | 'breadcrumbLabel'
    >
  >;

const defaultAuditScoresBySurface: Record<RouteSurface, UiAuditScore> = {
  public: { readability: 4, accessibility: 4, efficiency: 4, workflowClarity: 4 },
  staff: { readability: 4, accessibility: 4, efficiency: 4, workflowClarity: 4 },
  portal: { readability: 4, accessibility: 4, efficiency: 4, workflowClarity: 4 },
  demo: { readability: 3, accessibility: 3, efficiency: 3, workflowClarity: 3 },
};

const isPrefixedRoute = (id: string, prefix: string): boolean =>
  id === prefix || id.startsWith(`${prefix}-`);

const resolvePortalArea = (id: string): RouteArea => {
  if (id === 'portal-dashboard') return 'Home';
  if (id === 'portal-cases' || id === 'portal-case-detail') return 'Cases';
  if (id === 'portal-messages') return 'Messages';
  if (id === 'portal-calendar') return 'Appointments';
  if (id === 'portal-events') return 'Events';
  if (id === 'portal-documents') return 'Documents';
  if (id === 'portal-forms') return 'Forms';
  if (id === 'portal-appointments') return 'Appointments';
  return 'Account';
};

const resolvePublicArea = (id: string, section: RouteSection): RouteArea => {
  if (id === 'public-events') return 'Events';
  if (id === 'public-event-check-in') return 'Check-In';
  if (id === 'public-report-snapshot') return 'Reports';
  if (
    section === 'Auth' ||
    id === 'root' ||
    id === 'portal-login' ||
    id === 'portal-signup' ||
    id === 'portal-accept-invitation'
  ) {
    return 'Access';
  }
  return 'Access';
};

const resolveStaffArea = (id: string, section: RouteSection): RouteArea => {
  if (
    isPrefixedRoute(id, 'contacts') ||
    isPrefixedRoute(id, 'contact') ||
    isPrefixedRoute(id, 'accounts') ||
    isPrefixedRoute(id, 'account') ||
    isPrefixedRoute(id, 'volunteers') ||
    isPrefixedRoute(id, 'volunteer')
  ) {
    return 'People';
  }

  if (
    isPrefixedRoute(id, 'cases') ||
    isPrefixedRoute(id, 'case') ||
    id === 'follow-ups' ||
    id === 'external-service-providers' ||
    id === 'intake-create' ||
    id === 'interaction-create'
  ) {
    return 'Service';
  }

  if (
    isPrefixedRoute(id, 'events') ||
    isPrefixedRoute(id, 'event') ||
    isPrefixedRoute(id, 'tasks') ||
    isPrefixedRoute(id, 'task') ||
    id === 'opportunities' ||
    id === 'team-chat'
  ) {
    return 'Engagement';
  }

  if (isPrefixedRoute(id, 'donations') || isPrefixedRoute(id, 'donation') || id === 'reconciliation') {
    return 'Finance';
  }

  if (
    id === 'analytics' ||
    id === 'dashboard-custom' ||
    isPrefixedRoute(id, 'reports') ||
    id.startsWith('alerts-')
  ) {
    return 'Insights';
  }

  if (
    id === 'website-builder' ||
    id === 'websites' ||
    id.startsWith('website-')
  ) {
    return 'Publishing';
  }

  if (
    id === 'user-settings' ||
    id === 'admin-settings' ||
    id.startsWith('admin-settings-') ||
    id === 'api-settings' ||
    id === 'navigation-settings' ||
    id === 'backup-settings' ||
    id === 'email-marketing' ||
    id === 'social-media' ||
    id.startsWith('portal-admin-')
  ) {
    return 'Admin';
  }

  if (id === 'dashboard') {
    return 'Home';
  }

  if (section === 'Settings') {
    return 'Admin';
  }
  if (section === 'Analytics') {
    return 'Insights';
  }
  if (section === 'Builder' || section === 'Websites') {
    return 'Publishing';
  }
  if (section === 'Finance') {
    return 'Finance';
  }
  if (section === 'Engagement') {
    return 'Engagement';
  }
  if (section === 'People') {
    return 'People';
  }

  return 'Home';
};

const inferRouteArea = (entry: RouteCatalogSeed): RouteArea => {
  if (entry.surface === 'demo') {
    return 'Demo';
  }
  if (entry.surface === 'portal') {
    return resolvePortalArea(entry.id);
  }
  if (entry.surface === 'public') {
    return resolvePublicArea(entry.id, entry.section);
  }
  return resolveStaffArea(entry.id, entry.section);
};

const inferRouteNavKind = (entry: RouteCatalogSeed): RouteNavKind => {
  if (entry.staffNav?.group === 'utility') {
    return 'utility';
  }
  if (entry.staffNav || entry.portalNav) {
    return 'hub';
  }
  return 'leaf';
};

const routeParentIds: Record<string, string> = {
  'contact-create': 'contacts',
  'contact-detail': 'contacts',
  'contact-edit': 'contacts',
  'account-create': 'accounts',
  'account-detail': 'accounts',
  'account-edit': 'accounts',
  'volunteer-create': 'volunteers',
  'volunteer-detail': 'volunteers',
  'volunteer-edit': 'volunteers',
  'volunteer-assignment-create': 'volunteers',
  'volunteer-assignment-edit': 'volunteers',
  'events-calendar': 'events',
  'events-check-in': 'events',
  'event-create': 'events',
  'event-detail': 'events',
  'event-edit': 'events',
  'task-create': 'tasks',
  'task-detail': 'tasks',
  'task-edit': 'tasks',
  'case-create': 'cases',
  'case-detail': 'cases',
  'case-edit': 'cases',
  'donation-create': 'donations',
  'donation-detail': 'donations',
  'donation-edit': 'donations',
  'donation-payment': 'donations',
  'donation-payment-result': 'donations',
  'recurring-donation-detail': 'recurring-donations',
  'recurring-donation-edit': 'recurring-donations',
  'reports-builder': 'reports',
  'reports-templates': 'reports',
  'reports-saved': 'reports',
  'reports-scheduled': 'reports',
  'reports-outcomes': 'reports',
  'reports-workflow-coverage': 'reports',
  'alerts-instances': 'alerts-overview',
  'alerts-history': 'alerts-overview',
  'admin-settings-organization': 'admin-settings',
  'admin-settings-workspace-modules': 'admin-settings',
  'admin-settings-branding': 'admin-settings',
  'admin-settings-users': 'admin-settings',
  'admin-settings-email': 'admin-settings',
  'admin-settings-messaging': 'admin-settings',
  'admin-settings-outcomes': 'admin-settings',
  'admin-settings-roles': 'admin-settings',
  'admin-settings-audit-logs': 'admin-settings',
  'admin-settings-other': 'admin-settings',
  'portal-admin-access': 'admin-settings',
  'portal-admin-users': 'portal-admin-access',
  'portal-admin-conversations': 'portal-admin-access',
  'portal-admin-appointments': 'portal-admin-access',
  'portal-admin-slots': 'portal-admin-access',
  'website-console-redirect': 'websites',
  'website-console-overview': 'websites',
  'website-console-content': 'websites',
  'website-console-forms': 'websites',
  'website-console-integrations': 'websites',
  'website-console-publishing': 'websites',
  'website-console-builder': 'websites',
  'website-builder-preview': 'website-builder',
  'website-builder-editor': 'website-builder',
  'portal-case-detail': 'portal-cases',
  'accept-invitation': 'login',
  'forgot-password': 'login',
  'reset-password': 'login',
  'portal-signup': 'portal-login',
  'portal-accept-invitation': 'portal-login',
};

const withDefaults = (entry: RouteCatalogSeed): RouteCatalogEntry => ({
  ...entry,
  area: entry.area ?? inferRouteArea(entry),
  href: entry.href ?? entry.path,
  navKind: entry.navKind ?? inferRouteNavKind(entry),
  parentId: entry.parentId ?? routeParentIds[entry.id],
  breadcrumbLabel: entry.breadcrumbLabel ?? entry.title,
  featureStatus: entry.featureStatus ?? (entry.authScope === 'admin' ? 'role-gated' : 'available'),
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
