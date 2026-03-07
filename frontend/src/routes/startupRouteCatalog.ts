export type StartupRouteSection =
  | 'Auth'
  | 'Portal'
  | 'People'
  | 'Engagement'
  | 'Finance'
  | 'Analytics'
  | 'Settings'
  | 'Builder'
  | 'Core'
  | 'Demo'
  | 'Websites';

type StartupRouteEntry = {
  id: string;
  title: string;
  section: StartupRouteSection;
  path: string;
  href?: string;
  requiresAuth: boolean;
  staffNav?: {
    group: 'primary' | 'secondary' | 'utility';
    order: number;
    label?: string;
    shortLabel?: string;
    ariaLabel?: string;
    icon?: string;
  };
  portalNav?: {
    order: number;
    label?: string;
  };
};

type RouteMetaMatch = {
  title: string;
  section: StartupRouteSection;
  requiresAuth: boolean;
  path: string;
  primaryAction?: {
    label: string;
    href: string;
  };
};

const startupRoutes: readonly StartupRouteEntry[] = [
  { id: 'root', title: 'Workspace Redirect', section: 'Core', path: '/', requiresAuth: false },
  { id: 'setup', title: 'Workspace Setup', section: 'Auth', path: '/setup', requiresAuth: false },
  { id: 'login', title: 'Sign In', section: 'Auth', path: '/login', requiresAuth: false },
  { id: 'register', title: 'Register', section: 'Auth', path: '/register', requiresAuth: false },
  { id: 'accept-invitation', title: 'Accept Invitation', section: 'Auth', path: '/accept-invitation/:token', requiresAuth: false },
  { id: 'forgot-password', title: 'Forgot Password', section: 'Auth', path: '/forgot-password', requiresAuth: false },
  { id: 'reset-password', title: 'Reset Password', section: 'Auth', path: '/reset-password/:token', requiresAuth: false },
  { id: 'public-report-snapshot', title: 'Public Report Snapshot', section: 'Auth', path: '/public/reports/:token', requiresAuth: false },
  { id: 'public-events', title: 'Public Events', section: 'Builder', path: '/public/events/:site', requiresAuth: false },
  { id: 'public-event-check-in', title: 'Public Event Check-In', section: 'Builder', path: '/event-check-in/:id', requiresAuth: false },
  { id: 'portal-login', title: 'Portal Login', section: 'Portal', path: '/portal/login', requiresAuth: false },
  { id: 'portal-signup', title: 'Portal Signup', section: 'Portal', path: '/portal/signup', requiresAuth: false },
  { id: 'portal-accept-invitation', title: 'Portal Invitation', section: 'Portal', path: '/portal/accept-invitation/:token', requiresAuth: false },
  { id: 'portal-dashboard', title: 'Portal Dashboard', section: 'Portal', path: '/portal', requiresAuth: true, portalNav: { order: 10, label: 'Dashboard' } },
  { id: 'portal-profile', title: 'Your Profile', section: 'Portal', path: '/portal/profile', requiresAuth: true, portalNav: { order: 20, label: 'Profile' } },
  { id: 'portal-people', title: 'People', section: 'Portal', path: '/portal/people', requiresAuth: true, portalNav: { order: 30, label: 'People' } },
  { id: 'portal-events', title: 'Events', section: 'Portal', path: '/portal/events', requiresAuth: true, portalNav: { order: 40, label: 'Events' } },
  { id: 'portal-messages', title: 'Messages', section: 'Portal', path: '/portal/messages', requiresAuth: true, portalNav: { order: 50, label: 'Messages' } },
  { id: 'portal-cases', title: 'Cases', section: 'Portal', path: '/portal/cases', requiresAuth: true, portalNav: { order: 60, label: 'Cases' } },
  { id: 'portal-case-detail', title: 'Case Detail', section: 'Portal', path: '/portal/cases/:id', requiresAuth: true },
  { id: 'portal-appointments', title: 'Appointments', section: 'Portal', path: '/portal/appointments', requiresAuth: true, portalNav: { order: 70, label: 'Appointments' } },
  { id: 'portal-documents', title: 'Documents', section: 'Portal', path: '/portal/documents', requiresAuth: true, portalNav: { order: 80, label: 'Documents' } },
  { id: 'portal-notes', title: 'Notes', section: 'Portal', path: '/portal/notes', requiresAuth: true, portalNav: { order: 90, label: 'Notes' } },
  { id: 'portal-forms', title: 'Forms', section: 'Portal', path: '/portal/forms', requiresAuth: true, portalNav: { order: 100, label: 'Forms' } },
  { id: 'portal-reminders', title: 'Reminders', section: 'Portal', path: '/portal/reminders', requiresAuth: true, portalNav: { order: 110, label: 'Reminders' } },
  { id: 'dashboard', title: 'Dashboard', section: 'Core', path: '/dashboard', requiresAuth: true, staffNav: { group: 'primary', order: 10, label: 'Dashboard', shortLabel: 'Dashboard', ariaLabel: 'Dashboard', icon: '◼' } },
  { id: 'contacts', title: 'Contacts', section: 'People', path: '/contacts', requiresAuth: true, staffNav: { group: 'primary', order: 20, label: 'Contacts', shortLabel: 'Contacts', ariaLabel: 'Contacts', icon: '◎' } },
  { id: 'accounts', title: 'Accounts', section: 'People', path: '/accounts', requiresAuth: true, staffNav: { group: 'primary', order: 30, label: 'Accounts', shortLabel: 'Accounts', ariaLabel: 'Accounts', icon: '▣' } },
  { id: 'volunteers', title: 'Volunteers', section: 'People', path: '/volunteers', requiresAuth: true, staffNav: { group: 'primary', order: 40, label: 'Volunteers', shortLabel: 'Volunteers', ariaLabel: 'Volunteers', icon: '◇' } },
  { id: 'events', title: 'Events', section: 'Engagement', path: '/events', requiresAuth: true, staffNav: { group: 'primary', order: 50, label: 'Events', shortLabel: 'Events', ariaLabel: 'Events', icon: '✦' } },
  { id: 'tasks', title: 'Tasks', section: 'Engagement', path: '/tasks', requiresAuth: true, staffNav: { group: 'primary', order: 60, label: 'Tasks', shortLabel: 'Tasks', ariaLabel: 'Tasks', icon: '☷' } },
  { id: 'cases', title: 'Cases', section: 'Engagement', path: '/cases', requiresAuth: true, staffNav: { group: 'primary', order: 70, label: 'Cases', shortLabel: 'Cases', ariaLabel: 'Cases', icon: '◆' } },
  { id: 'follow-ups', title: 'Follow-Ups', section: 'Engagement', path: '/follow-ups', requiresAuth: true, staffNav: { group: 'secondary', order: 80, label: 'Follow-Ups', shortLabel: 'Follow-Ups', ariaLabel: 'Follow-Ups', icon: '↺' } },
  { id: 'opportunities', title: 'Opportunities', section: 'Engagement', path: '/opportunities', requiresAuth: true, staffNav: { group: 'secondary', order: 90, label: 'Opportunities', shortLabel: 'Opportunities', ariaLabel: 'Opportunities', icon: '△' } },
  { id: 'external-service-providers', title: 'Providers', section: 'Engagement', path: '/external-service-providers', requiresAuth: true, staffNav: { group: 'secondary', order: 100, label: 'Providers', shortLabel: 'Providers', ariaLabel: 'External Service Providers', icon: '⌘' } },
  { id: 'team-chat', title: 'Team Chat', section: 'Engagement', path: '/team-chat', requiresAuth: true, staffNav: { group: 'utility', order: 110, label: 'Team Chat', shortLabel: 'Chat', ariaLabel: 'Team chat', icon: '☰' } },
  { id: 'donations', title: 'Donations', section: 'Finance', path: '/donations', requiresAuth: true, staffNav: { group: 'primary', order: 120, label: 'Donations', shortLabel: 'Donations', ariaLabel: 'Donations', icon: '◈' } },
  { id: 'reconciliation', title: 'Reconciliation', section: 'Finance', path: '/reconciliation', requiresAuth: true, staffNav: { group: 'secondary', order: 130, label: 'Reconciliation', shortLabel: 'Reconcile', ariaLabel: 'Reconciliation', icon: '≋' } },
  { id: 'analytics', title: 'Analytics', section: 'Analytics', path: '/analytics', requiresAuth: true, staffNav: { group: 'primary', order: 140, label: 'Analytics', shortLabel: 'Analytics', ariaLabel: 'Analytics', icon: '⬢' } },
  { id: 'reports', title: 'Reports', section: 'Analytics', path: '/reports', requiresAuth: true, staffNav: { group: 'secondary', order: 150, label: 'Reports', shortLabel: 'Reports', ariaLabel: 'Reports', icon: '▤' } },
  { id: 'reports-scheduled', title: 'Scheduled Reports', section: 'Analytics', path: '/reports/scheduled', requiresAuth: true, staffNav: { group: 'secondary', order: 160, label: 'Scheduled', shortLabel: 'Scheduled', ariaLabel: 'Scheduled reports', icon: '◷' } },
  { id: 'alerts-overview', title: 'Alerts', section: 'Analytics', path: '/alerts', requiresAuth: true, staffNav: { group: 'utility', order: 170, label: 'Alerts', shortLabel: 'Alerts', ariaLabel: 'Alerts', icon: '⚑' } },
  { id: 'website-builder', title: 'Website Builder', section: 'Builder', path: '/website-builder', requiresAuth: true },
  { id: 'websites', title: 'Websites', section: 'Websites', path: '/websites', requiresAuth: true },
  { id: 'website-console-overview', title: 'Website Overview', section: 'Websites', path: '/websites/:siteId/overview', requiresAuth: true },
  { id: 'website-console-content', title: 'Website Content', section: 'Websites', path: '/websites/:siteId/content', requiresAuth: true },
  { id: 'website-console-forms', title: 'Website Forms', section: 'Websites', path: '/websites/:siteId/forms', requiresAuth: true },
  { id: 'website-console-integrations', title: 'Website Integrations', section: 'Websites', path: '/websites/:siteId/integrations', requiresAuth: true },
  { id: 'website-console-publishing', title: 'Website Publishing', section: 'Websites', path: '/websites/:siteId/publishing', requiresAuth: true },
  { id: 'website-console-builder', title: 'Website Builder (Site)', section: 'Websites', path: '/websites/:siteId/builder', requiresAuth: true },
  { id: 'user-settings', title: 'User Settings', section: 'Settings', path: '/settings/user', requiresAuth: true },
  { id: 'admin-settings', title: 'Admin Settings', section: 'Settings', path: '/settings/admin', requiresAuth: true },
  { id: 'api-settings', title: 'API Settings', section: 'Settings', path: '/settings/api', requiresAuth: true },
  { id: 'navigation-settings', title: 'Navigation Settings', section: 'Settings', path: '/settings/navigation', requiresAuth: true },
  { id: 'backup-settings', title: 'Data Backup', section: 'Settings', path: '/settings/backup', requiresAuth: true },
  { id: 'email-marketing', title: 'Email Marketing', section: 'Settings', path: '/settings/email-marketing', requiresAuth: true },
];

const getRouteHref = (entry: StartupRouteEntry): string => entry.href ?? entry.path;

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeTrailingSlash = (value: string): string => {
  if (!value || value === '/') {
    return '/';
  }

  return value.endsWith('/') ? value.slice(0, -1) : value;
};

export const normalizeStartupRouteLocation = (value: string): string => {
  try {
    const parsed = new URL(value, 'https://nonprofit-manager.local');
    const normalizedPath = normalizeTrailingSlash(parsed.pathname);
    return parsed.search ? `${normalizedPath}${parsed.search}` : normalizedPath;
  } catch {
    const [rawPath = '/', rawSearch = ''] = String(value).split('?');
    const normalizedPath = normalizeTrailingSlash(rawPath || '/');
    return rawSearch ? `${normalizedPath}?${rawSearch}` : normalizedPath;
  }
};

const matchesDynamicPath = (routePath: string, pathname: string): boolean => {
  const pattern = `^${escapeRegex(routePath).replace(/:[^/]+/g, '[^/]+')}$`;
  return new RegExp(pattern).test(pathname);
};

export const matchStartupRouteMeta = (value: string): RouteMetaMatch | null => {
  const normalized = normalizeStartupRouteLocation(value);
  const pathname = normalized.split('?')[0] || '/';

  const hrefMatch = startupRoutes.find(
    (entry) => normalizeStartupRouteLocation(getRouteHref(entry)) === normalized
  );
  if (hrefMatch) {
    return hrefMatch;
  }

  const exactPathMatch = startupRoutes.find(
    (entry) => !entry.path.includes(':') && normalizeStartupRouteLocation(entry.path) === pathname
  );
  if (exactPathMatch) {
    return exactPathMatch;
  }

  return (
    startupRoutes.find((entry) => entry.path.includes(':') && matchesDynamicPath(entry.path, pathname)) ??
    null
  );
};

export const getStartupPortalNavigationEntries = (): StartupRouteEntry[] =>
  startupRoutes
    .filter((entry) => entry.portalNav)
    .sort((left, right) => (left.portalNav?.order ?? Number.MAX_SAFE_INTEGER) - (right.portalNav?.order ?? Number.MAX_SAFE_INTEGER));

export const getStartupStaffNavigationEntries = (flags: {
  VITE_TEAM_CHAT_ENABLED?: string | boolean | undefined;
} = {}): StartupRouteEntry[] =>
  startupRoutes
    .filter((entry) => {
      if (!entry.staffNav) {
        return false;
      }
      if (entry.id === 'team-chat') {
        const enabled = flags.VITE_TEAM_CHAT_ENABLED;
        return enabled !== false && enabled !== 'false' && enabled !== '0';
      }
      return true;
    })
    .sort((left, right) => (left.staffNav?.order ?? Number.MAX_SAFE_INTEGER) - (right.staffNav?.order ?? Number.MAX_SAFE_INTEGER));

export const getStartupStaffUtilityEntries = (flags: {
  VITE_TEAM_CHAT_ENABLED?: string | boolean | undefined;
} = {}): StartupRouteEntry[] =>
  getStartupStaffNavigationEntries(flags).filter((entry) => entry.staffNav?.group === 'utility');
