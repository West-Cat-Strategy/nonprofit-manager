export type FeatureAccessStatus =
  | 'available'
  | 'hidden'
  | 'broken'
  | 'missing-ui'
  | 'role-gated'
  | 'flag-disabled';

export interface UiAuditScore {
  readability: number;
  accessibility: number;
  efficiency: number;
  workflowClarity: number;
}

export type RouteSection =
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

export type RouteSurface = 'public' | 'staff' | 'portal' | 'demo';
export type RouteAuthScope = 'public' | 'staff' | 'portal' | 'admin';
export type StaffNavGroup = 'primary' | 'secondary' | 'utility';
export type AdminNavigationMode = 'settings' | 'portal';
export type FeatureFlagValues = Partial<Record<string, string | boolean | undefined>>;

export interface RouteCatalogAlias {
  path: string;
  query?: Record<string, string>;
  exactQuery?: boolean;
}

export interface RouteCatalogAdminNavConfig {
  mode: AdminNavigationMode;
  order: number;
  label?: string;
  matchPrefixes?: string[];
}

export interface RouteCatalogEntry {
  id: string;
  title: string;
  section: RouteSection;
  surface: RouteSurface;
  path: string;
  href?: string;
  requiresAuth: boolean;
  authScope: RouteAuthScope;
  featureStatus?: FeatureAccessStatus;
  featureFlagEnv?: string;
  auditScore?: UiAuditScore;
  aliases?: readonly (string | RouteCatalogAlias)[];
  primaryAction?: {
    label: string;
    href: string;
  };
  staffNav?: {
    group: StaffNavGroup;
    order: number;
    label?: string;
    shortLabel?: string;
    ariaLabel?: string;
    icon?: string;
    pinnedEligible?: boolean;
  };
  portalNav?: {
    order: number;
    label?: string;
  };
  adminNav?: RouteCatalogAdminNavConfig | readonly RouteCatalogAdminNavConfig[];
}

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
  featureStatus: entry.featureStatus ?? (entry.authScope === 'admin' ? 'role-gated' : 'available'),
  auditScore: entry.auditScore ?? { ...defaultAuditScoresBySurface[entry.surface] },
});

const publicRoute = (entry: Omit<RouteCatalogSeed, 'surface' | 'authScope' | 'requiresAuth'>) =>
  withDefaults({
    ...entry,
    surface: 'public',
    authScope: 'public',
    requiresAuth: false,
  });

const demoRoute = (entry: Omit<RouteCatalogSeed, 'surface' | 'authScope' | 'requiresAuth' | 'section'>) =>
  withDefaults({
    ...entry,
    section: 'Demo',
    surface: 'demo',
    authScope: 'public',
    requiresAuth: false,
  });

const staffRoute = (entry: Omit<RouteCatalogSeed, 'surface' | 'authScope' | 'requiresAuth'>) =>
  withDefaults({
    ...entry,
    surface: 'staff',
    authScope: 'staff',
    requiresAuth: true,
  });

const settingsRoute = (entry: Omit<RouteCatalogSeed, 'surface' | 'authScope' | 'requiresAuth' | 'section'>) =>
  withDefaults({
    ...entry,
    section: 'Settings',
    surface: 'staff',
    authScope: 'staff',
    requiresAuth: true,
  });

const adminRoute = (entry: Omit<RouteCatalogSeed, 'surface' | 'authScope' | 'requiresAuth' | 'section'>) =>
  withDefaults({
    ...entry,
    section: 'Settings',
    surface: 'staff',
    authScope: 'admin',
    requiresAuth: true,
  });

const portalPublicRoute = (entry: Omit<RouteCatalogSeed, 'surface' | 'authScope' | 'requiresAuth' | 'section'>) =>
  withDefaults({
    ...entry,
    section: 'Portal',
    surface: 'public',
    authScope: 'public',
    requiresAuth: false,
  });

const portalRoute = (entry: Omit<RouteCatalogSeed, 'surface' | 'authScope' | 'requiresAuth' | 'section'>) =>
  withDefaults({
    ...entry,
    section: 'Portal',
    surface: 'portal',
    authScope: 'portal',
    requiresAuth: true,
  });

export const routeCatalog: readonly RouteCatalogEntry[] = [
  publicRoute({
    id: 'root',
    title: 'Workspace Redirect',
    section: 'Core',
    path: '/',
  }),
  publicRoute({
    id: 'setup',
    title: 'Workspace Setup',
    section: 'Auth',
    path: '/setup',
    primaryAction: { label: 'Create admin account', href: '/setup' },
  }),
  publicRoute({
    id: 'login',
    title: 'Sign In',
    section: 'Auth',
    path: '/login',
    primaryAction: { label: 'Sign in', href: '/login' },
  }),
  publicRoute({
    id: 'register',
    title: 'Register',
    section: 'Auth',
    path: '/register',
    primaryAction: { label: 'Create account', href: '/register' },
  }),
  publicRoute({
    id: 'accept-invitation',
    title: 'Accept Invitation',
    section: 'Auth',
    path: '/accept-invitation/:token',
    primaryAction: { label: 'Go to login', href: '/login' },
  }),
  publicRoute({
    id: 'forgot-password',
    title: 'Forgot Password',
    section: 'Auth',
    path: '/forgot-password',
    primaryAction: { label: 'Send reset link', href: '/forgot-password' },
  }),
  publicRoute({
    id: 'reset-password',
    title: 'Reset Password',
    section: 'Auth',
    path: '/reset-password/:token',
    primaryAction: { label: 'Request a new reset link', href: '/forgot-password' },
  }),
  publicRoute({
    id: 'public-report-snapshot',
    title: 'Public Report Snapshot',
    section: 'Auth',
    path: '/public/reports/:token',
  }),
  publicRoute({
    id: 'public-events',
    title: 'Public Events',
    section: 'Builder',
    path: '/public/events/:site',
  }),
  publicRoute({
    id: 'public-event-check-in',
    title: 'Public Event Check-In',
    section: 'Builder',
    path: '/event-check-in/:id',
  }),

  portalPublicRoute({
    id: 'portal-login',
    title: 'Portal Login',
    path: '/portal/login',
    primaryAction: { label: 'Sign in', href: '/portal/login' },
  }),
  portalPublicRoute({
    id: 'portal-signup',
    title: 'Portal Signup',
    path: '/portal/signup',
    primaryAction: { label: 'Submit request', href: '/portal/signup' },
  }),
  portalPublicRoute({
    id: 'portal-accept-invitation',
    title: 'Portal Invitation',
    path: '/portal/accept-invitation/:token',
    primaryAction: { label: 'Portal login', href: '/portal/login' },
  }),
  portalRoute({
    id: 'portal-dashboard',
    title: 'Portal Dashboard',
    path: '/portal',
    portalNav: { order: 10, label: 'Dashboard' },
  }),
  portalRoute({
    id: 'portal-profile',
    title: 'Your Profile',
    path: '/portal/profile',
    portalNav: { order: 20, label: 'Profile' },
  }),
  portalRoute({
    id: 'portal-people',
    title: 'People',
    path: '/portal/people',
    portalNav: { order: 30, label: 'People' },
  }),
  portalRoute({
    id: 'portal-events',
    title: 'Events',
    path: '/portal/events',
    portalNav: { order: 40, label: 'Events' },
  }),
  portalRoute({
    id: 'portal-messages',
    title: 'Messages',
    path: '/portal/messages',
    portalNav: { order: 50, label: 'Messages' },
  }),
  portalRoute({
    id: 'portal-cases',
    title: 'Cases',
    path: '/portal/cases',
    portalNav: { order: 60, label: 'Cases' },
  }),
  portalRoute({
    id: 'portal-case-detail',
    title: 'Case Detail',
    path: '/portal/cases/:id',
  }),
  portalRoute({
    id: 'portal-appointments',
    title: 'Appointments',
    path: '/portal/appointments',
    portalNav: { order: 70, label: 'Appointments' },
  }),
  portalRoute({
    id: 'portal-documents',
    title: 'Documents',
    path: '/portal/documents',
    portalNav: { order: 80, label: 'Documents' },
  }),
  portalRoute({
    id: 'portal-notes',
    title: 'Notes',
    path: '/portal/notes',
    portalNav: { order: 90, label: 'Notes' },
  }),
  portalRoute({
    id: 'portal-forms',
    title: 'Forms',
    path: '/portal/forms',
    portalNav: { order: 100, label: 'Forms' },
  }),
  portalRoute({
    id: 'portal-reminders',
    title: 'Reminders',
    path: '/portal/reminders',
    portalNav: { order: 110, label: 'Reminders' },
  }),

  staffRoute({
    id: 'dashboard',
    title: 'Dashboard',
    section: 'Core',
    path: '/dashboard',
    primaryAction: { label: 'Create intake', href: '/intake/new' },
    staffNav: {
      group: 'primary',
      order: 10,
      label: 'Dashboard',
      shortLabel: 'Home',
      ariaLabel: 'Go to dashboard',
      icon: '📊',
    },
  }),
  staffRoute({
    id: 'contacts',
    title: 'People',
    section: 'People',
    path: '/contacts',
    primaryAction: { label: 'New person', href: '/contacts/new' },
    staffNav: {
      group: 'primary',
      order: 20,
      label: 'People',
      shortLabel: 'People',
      ariaLabel: 'Go to contacts',
      icon: '👤',
      pinnedEligible: true,
    },
  }),
  staffRoute({
    id: 'contact-create',
    title: 'Create Person',
    section: 'People',
    path: '/contacts/new',
    primaryAction: { label: 'Save person', href: '/contacts/new' },
  }),
  staffRoute({
    id: 'contact-detail',
    title: 'Person Detail',
    section: 'People',
    path: '/contacts/:id',
  }),
  staffRoute({
    id: 'contact-edit',
    title: 'Edit Person',
    section: 'People',
    path: '/contacts/:id/edit',
  }),
  staffRoute({
    id: 'accounts',
    title: 'Accounts',
    section: 'People',
    path: '/accounts',
    primaryAction: { label: 'New account', href: '/accounts/new' },
    staffNav: {
      group: 'secondary',
      order: 30,
      label: 'Accounts',
      shortLabel: 'Accounts',
      ariaLabel: 'Go to accounts',
      icon: '🏢',
      pinnedEligible: true,
    },
  }),
  staffRoute({
    id: 'account-create',
    title: 'Create Account',
    section: 'People',
    path: '/accounts/new',
    primaryAction: { label: 'Save account', href: '/accounts/new' },
  }),
  staffRoute({
    id: 'account-detail',
    title: 'Account Detail',
    section: 'People',
    path: '/accounts/:id',
  }),
  staffRoute({
    id: 'account-edit',
    title: 'Edit Account',
    section: 'People',
    path: '/accounts/:id/edit',
  }),
  staffRoute({
    id: 'volunteers',
    title: 'Volunteers',
    section: 'People',
    path: '/volunteers',
    primaryAction: { label: 'New volunteer', href: '/volunteers/new' },
    staffNav: {
      group: 'secondary',
      order: 40,
      label: 'Volunteers',
      shortLabel: 'Volunteers',
      ariaLabel: 'Go to volunteers',
      icon: '🤝',
      pinnedEligible: true,
    },
  }),
  staffRoute({
    id: 'volunteer-create',
    title: 'Create Volunteer',
    section: 'People',
    path: '/volunteers/new',
    primaryAction: { label: 'Save volunteer', href: '/volunteers/new' },
  }),
  staffRoute({
    id: 'volunteer-detail',
    title: 'Volunteer Detail',
    section: 'People',
    path: '/volunteers/:id',
  }),
  staffRoute({
    id: 'volunteer-edit',
    title: 'Edit Volunteer',
    section: 'People',
    path: '/volunteers/:id/edit',
  }),
  staffRoute({
    id: 'volunteer-assignment-create',
    title: 'Create Assignment',
    section: 'People',
    path: '/volunteers/:volunteerId/assignments/new',
  }),
  staffRoute({
    id: 'volunteer-assignment-edit',
    title: 'Edit Assignment',
    section: 'People',
    path: '/volunteers/:volunteerId/assignments/:assignmentId/edit',
  }),

  staffRoute({
    id: 'events',
    title: 'Events',
    section: 'Engagement',
    path: '/events',
    primaryAction: { label: 'Create event', href: '/events/new' },
    staffNav: {
      group: 'primary',
      order: 50,
      label: 'Events',
      shortLabel: 'Events',
      ariaLabel: 'Go to events',
      icon: '📅',
      pinnedEligible: true,
    },
  }),
  staffRoute({
    id: 'events-calendar',
    title: 'Event Calendar',
    section: 'Engagement',
    path: '/events/calendar',
  }),
  staffRoute({
    id: 'events-check-in',
    title: 'Event Check-In',
    section: 'Engagement',
    path: '/events/check-in',
  }),
  staffRoute({
    id: 'event-create',
    title: 'Create Event',
    section: 'Engagement',
    path: '/events/new',
    primaryAction: { label: 'Create event', href: '/events/new' },
  }),
  staffRoute({
    id: 'event-detail',
    title: 'Event Detail',
    section: 'Engagement',
    path: '/events/:id',
  }),
  staffRoute({
    id: 'event-edit',
    title: 'Edit Event',
    section: 'Engagement',
    path: '/events/:id/edit',
  }),
  staffRoute({
    id: 'tasks',
    title: 'Tasks',
    section: 'Engagement',
    path: '/tasks',
    primaryAction: { label: 'New task', href: '/tasks/new' },
    staffNav: {
      group: 'primary',
      order: 60,
      label: 'Tasks',
      shortLabel: 'Tasks',
      ariaLabel: 'Go to tasks',
      icon: '✓',
      pinnedEligible: true,
    },
  }),
  staffRoute({
    id: 'task-create',
    title: 'Create Task',
    section: 'Engagement',
    path: '/tasks/new',
    primaryAction: { label: 'Save task', href: '/tasks/new' },
  }),
  staffRoute({
    id: 'task-detail',
    title: 'Task Detail',
    section: 'Engagement',
    path: '/tasks/:id',
  }),
  staffRoute({
    id: 'task-edit',
    title: 'Edit Task',
    section: 'Engagement',
    path: '/tasks/:id/edit',
  }),
  staffRoute({
    id: 'cases',
    title: 'Cases',
    section: 'Engagement',
    path: '/cases',
    primaryAction: { label: 'New case', href: '/cases/new' },
    staffNav: {
      group: 'primary',
      order: 70,
      label: 'Cases',
      shortLabel: 'Cases',
      ariaLabel: 'Go to cases',
      icon: '📋',
      pinnedEligible: true,
    },
  }),
  staffRoute({
    id: 'case-create',
    title: 'Create Case',
    section: 'Engagement',
    path: '/cases/new',
    primaryAction: { label: 'Save case', href: '/cases/new' },
  }),
  staffRoute({
    id: 'case-detail',
    title: 'Case Detail',
    section: 'Engagement',
    path: '/cases/:id',
  }),
  staffRoute({
    id: 'case-edit',
    title: 'Edit Case',
    section: 'Engagement',
    path: '/cases/:id/edit',
  }),
  staffRoute({
    id: 'follow-ups',
    title: 'Follow-Ups',
    section: 'Engagement',
    path: '/follow-ups',
    primaryAction: { label: 'Create follow-up', href: '/follow-ups' },
    staffNav: {
      group: 'secondary',
      order: 80,
      label: 'Follow-Ups',
      shortLabel: 'Follow-ups',
      ariaLabel: 'Go to follow-ups',
      icon: '🔔',
      pinnedEligible: true,
    },
  }),
  staffRoute({
    id: 'opportunities',
    title: 'Opportunities',
    section: 'Engagement',
    path: '/opportunities',
    primaryAction: { label: 'New opportunity', href: '/opportunities' },
    staffNav: {
      group: 'secondary',
      order: 90,
      label: 'Opportunities',
      shortLabel: 'Pipeline',
      ariaLabel: 'Go to opportunities',
      icon: '📈',
      pinnedEligible: true,
    },
  }),
  staffRoute({
    id: 'external-service-providers',
    title: 'External Service Providers',
    section: 'Engagement',
    path: '/external-service-providers',
    staffNav: {
      group: 'secondary',
      order: 100,
      label: 'Providers',
      shortLabel: 'Providers',
      ariaLabel: 'Go to external service providers',
      icon: '🩺',
      pinnedEligible: true,
    },
  }),
  staffRoute({
    id: 'team-chat',
    title: 'Team Chat',
    section: 'Engagement',
    path: '/team-chat',
    featureFlagEnv: 'VITE_TEAM_CHAT_ENABLED',
    staffNav: {
      group: 'secondary',
      order: 110,
      label: 'Team Chat',
      shortLabel: 'Team Chat',
      ariaLabel: 'Go to team chat',
      icon: '💬',
      pinnedEligible: true,
    },
  }),

  staffRoute({
    id: 'donations',
    title: 'Donations',
    section: 'Finance',
    path: '/donations',
    primaryAction: { label: 'Record donation', href: '/donations/new' },
    staffNav: {
      group: 'secondary',
      order: 120,
      label: 'Donations',
      shortLabel: 'Donations',
      ariaLabel: 'Go to donations',
      icon: '💰',
      pinnedEligible: true,
    },
  }),
  staffRoute({
    id: 'donation-create',
    title: 'Record Donation',
    section: 'Finance',
    path: '/donations/new',
  }),
  staffRoute({
    id: 'donation-detail',
    title: 'Donation Detail',
    section: 'Finance',
    path: '/donations/:id',
  }),
  staffRoute({
    id: 'donation-edit',
    title: 'Edit Donation',
    section: 'Finance',
    path: '/donations/:id/edit',
  }),
  staffRoute({
    id: 'donation-payment',
    title: 'Donation Payment',
    section: 'Finance',
    path: '/donations/payment',
  }),
  staffRoute({
    id: 'donation-payment-result',
    title: 'Donation Payment Result',
    section: 'Finance',
    path: '/donations/payment-result',
  }),
  staffRoute({
    id: 'reconciliation',
    title: 'Reconciliation',
    section: 'Finance',
    path: '/reconciliation',
    staffNav: {
      group: 'secondary',
      order: 130,
      label: 'Reconciliation',
      shortLabel: 'Reconciliation',
      ariaLabel: 'Go to reconciliation',
      icon: '🧮',
      pinnedEligible: true,
    },
  }),

  staffRoute({
    id: 'analytics',
    title: 'Analytics',
    section: 'Analytics',
    path: '/analytics',
    primaryAction: { label: 'Apply filters', href: '/analytics' },
    staffNav: {
      group: 'utility',
      order: 140,
      label: 'Analytics',
      shortLabel: 'Analytics',
      ariaLabel: 'Go to analytics',
      icon: '📉',
    },
  }),
  staffRoute({
    id: 'dashboard-custom',
    title: 'Custom Dashboard',
    section: 'Analytics',
    path: '/dashboard/custom',
  }),
  staffRoute({
    id: 'reports',
    title: 'Reports',
    section: 'Analytics',
    path: '/reports',
    href: '/reports/builder',
    primaryAction: { label: 'Generate report', href: '/reports/builder' },
    staffNav: {
      group: 'utility',
      order: 150,
      label: 'Reports',
      shortLabel: 'Reports',
      ariaLabel: 'Go to reports',
      icon: '🗂️',
    },
  }),
  staffRoute({
    id: 'reports-builder',
    title: 'Report Builder',
    section: 'Analytics',
    path: '/reports/builder',
    primaryAction: { label: 'Generate report', href: '/reports/builder' },
  }),
  staffRoute({
    id: 'reports-templates',
    title: 'Report Templates',
    section: 'Analytics',
    path: '/reports/templates',
    primaryAction: { label: 'Create custom report', href: '/reports/builder' },
  }),
  staffRoute({
    id: 'reports-saved',
    title: 'Saved Reports',
    section: 'Analytics',
    path: '/reports/saved',
  }),
  staffRoute({
    id: 'reports-scheduled',
    title: 'Scheduled Reports',
    section: 'Analytics',
    path: '/reports/scheduled',
    staffNav: {
      group: 'secondary',
      order: 160,
      label: 'Scheduled Reports',
      shortLabel: 'Schedules',
      ariaLabel: 'Go to scheduled reports',
      icon: '🗓️',
      pinnedEligible: true,
    },
  }),
  staffRoute({
    id: 'reports-outcomes',
    title: 'Outcomes Report',
    section: 'Analytics',
    path: '/reports/outcomes',
  }),
  staffRoute({
    id: 'alerts-overview',
    title: 'Alerts',
    section: 'Analytics',
    path: '/alerts',
    primaryAction: { label: 'Create alert', href: '/alerts' },
    staffNav: {
      group: 'utility',
      order: 170,
      label: 'Alerts',
      shortLabel: 'Alerts',
      ariaLabel: 'Go to alerts',
      icon: '🚨',
    },
  }),
  staffRoute({
    id: 'alerts-instances',
    title: 'Triggered Alerts',
    section: 'Analytics',
    path: '/alerts/instances',
  }),
  staffRoute({
    id: 'alerts-history',
    title: 'Alert History',
    section: 'Analytics',
    path: '/alerts/history',
  }),

  staffRoute({
    id: 'intake-create',
    title: 'New Intake',
    section: 'Core',
    path: '/intake/new',
    primaryAction: { label: 'Create contact', href: '/intake/new' },
  }),
  staffRoute({
    id: 'interaction-create',
    title: 'Note an Interaction',
    section: 'Core',
    path: '/interactions/new',
    primaryAction: { label: 'Create new person', href: '/contacts/new' },
  }),
  staffRoute({
    id: 'people-directory',
    title: 'People Directory',
    section: 'Core',
    path: '/people',
  }),
  staffRoute({
    id: 'linking',
    title: 'Linking',
    section: 'Core',
    path: '/linking',
  }),
  staffRoute({
    id: 'operations',
    title: 'Operations',
    section: 'Core',
    path: '/operations',
  }),
  staffRoute({
    id: 'outreach',
    title: 'Outreach',
    section: 'Core',
    path: '/outreach',
  }),

  settingsRoute({
    id: 'user-settings',
    title: 'User Settings',
    path: '/settings/user',
    featureStatus: 'available',
  }),
  adminRoute({
    id: 'admin-settings',
    title: 'Admin Settings',
    path: '/settings/admin/dashboard',
    aliases: [
      { path: '/settings/admin', exactQuery: true },
      { path: '/settings/admin', query: { section: 'dashboard' } },
    ],
    adminNav: [
      { mode: 'settings', order: 10, label: 'Admin Settings' },
      { mode: 'portal', order: 10, label: 'Admin Settings' },
    ],
  }),
  adminRoute({
    id: 'admin-settings-organization',
    title: 'Organization',
    path: '/settings/admin/organization',
    aliases: [
      '/settings/organization',
      { path: '/settings/admin', query: { section: 'organization' } },
    ],
  }),
  adminRoute({
    id: 'admin-settings-branding',
    title: 'Branding',
    path: '/settings/admin/branding',
    aliases: [{ path: '/settings/admin', query: { section: 'branding' } }],
  }),
  adminRoute({
    id: 'admin-settings-users',
    title: 'Users & Security',
    path: '/settings/admin/users',
    aliases: [{ path: '/settings/admin', query: { section: 'users' } }],
  }),
  adminRoute({
    id: 'admin-settings-email',
    title: 'Email Settings',
    path: '/settings/admin/email',
    aliases: [{ path: '/settings/admin', query: { section: 'email' } }],
  }),
  adminRoute({
    id: 'admin-settings-messaging',
    title: 'Messaging Settings',
    path: '/settings/admin/messaging',
    aliases: [{ path: '/settings/admin', query: { section: 'messaging' } }],
  }),
  adminRoute({
    id: 'admin-settings-outcomes',
    title: 'Outcome Definitions',
    path: '/settings/admin/outcomes',
    aliases: [{ path: '/settings/admin', query: { section: 'outcomes' } }],
  }),
  adminRoute({
    id: 'admin-settings-roles',
    title: 'Roles & Permissions',
    path: '/settings/admin/roles',
    aliases: [{ path: '/settings/admin', query: { section: 'roles' } }],
  }),
  adminRoute({
    id: 'admin-settings-audit-logs',
    title: 'Audit Logs',
    path: '/settings/admin/audit_logs',
    aliases: [
      '/admin/audit-logs',
      { path: '/settings/admin', query: { section: 'audit_logs' } },
    ],
  }),
  adminRoute({
    id: 'admin-settings-other',
    title: 'Other Settings',
    path: '/settings/admin/other',
    aliases: [{ path: '/settings/admin', query: { section: 'other' } }],
  }),
  settingsRoute({
    id: 'api-settings',
    title: 'API Settings',
    path: '/settings/api',
    adminNav: { mode: 'settings', order: 120, label: 'API Settings' },
    featureStatus: 'available',
  }),
  settingsRoute({
    id: 'navigation-settings',
    title: 'Navigation Settings',
    path: '/settings/navigation',
    adminNav: { mode: 'settings', order: 130, label: 'Navigation' },
    featureStatus: 'available',
  }),
  adminRoute({
    id: 'backup-settings',
    title: 'Data Backup',
    path: '/settings/backup',
    adminNav: { mode: 'settings', order: 140, label: 'Data Backup' },
  }),
  settingsRoute({
    id: 'email-marketing',
    title: 'Email Marketing',
    path: '/settings/email-marketing',
    aliases: ['/email-marketing'],
    adminNav: { mode: 'settings', order: 150, label: 'Email Marketing' },
    featureStatus: 'available',
  }),
  adminRoute({
    id: 'portal-admin-access',
    title: 'Portal Access',
    path: '/settings/admin/portal/access',
    aliases: ['/settings/admin/portal'],
    adminNav: [
      {
        mode: 'settings',
        order: 110,
        label: 'Portal Ops',
        matchPrefixes: ['/settings/admin/portal'],
      },
      {
        mode: 'portal',
        order: 20,
        label: 'Access',
      },
    ],
  }),
  adminRoute({
    id: 'portal-admin-users',
    title: 'Portal Users',
    path: '/settings/admin/portal/users',
    adminNav: { mode: 'portal', order: 30, label: 'Users' },
  }),
  adminRoute({
    id: 'portal-admin-conversations',
    title: 'Portal Conversations',
    path: '/settings/admin/portal/conversations',
    adminNav: { mode: 'portal', order: 40, label: 'Conversations' },
  }),
  adminRoute({
    id: 'portal-admin-appointments',
    title: 'Portal Appointments',
    path: '/settings/admin/portal/appointments',
    adminNav: { mode: 'portal', order: 50, label: 'Appointments' },
  }),
  adminRoute({
    id: 'portal-admin-slots',
    title: 'Portal Slots',
    path: '/settings/admin/portal/slots',
    adminNav: { mode: 'portal', order: 60, label: 'Slots' },
  }),

  staffRoute({
    id: 'website-builder',
    title: 'Website Builder',
    section: 'Builder',
    path: '/website-builder',
  }),
  staffRoute({
    id: 'websites',
    title: 'Websites',
    section: 'Websites',
    path: '/websites',
  }),
  staffRoute({
    id: 'website-console-redirect',
    title: 'Website Console',
    section: 'Websites',
    path: '/websites/:siteId',
  }),
  staffRoute({
    id: 'website-console-overview',
    title: 'Website Overview',
    section: 'Websites',
    path: '/websites/:siteId/overview',
  }),
  staffRoute({
    id: 'website-console-content',
    title: 'Website Content',
    section: 'Websites',
    path: '/websites/:siteId/content',
  }),
  staffRoute({
    id: 'website-console-forms',
    title: 'Website Forms',
    section: 'Websites',
    path: '/websites/:siteId/forms',
  }),
  staffRoute({
    id: 'website-console-integrations',
    title: 'Website Integrations',
    section: 'Websites',
    path: '/websites/:siteId/integrations',
  }),
  staffRoute({
    id: 'website-console-publishing',
    title: 'Website Publishing',
    section: 'Websites',
    path: '/websites/:siteId/publishing',
  }),
  staffRoute({
    id: 'website-console-builder',
    title: 'Website Builder (Site)',
    section: 'Websites',
    path: '/websites/:siteId/builder',
  }),
  staffRoute({
    id: 'website-builder-preview',
    title: 'Website Preview',
    section: 'Builder',
    path: '/website-builder/:templateId/preview',
  }),
  staffRoute({
    id: 'website-builder-editor',
    title: 'Website Editor',
    section: 'Builder',
    path: '/website-builder/:templateId',
  }),

  demoRoute({ id: 'demo-dashboard', title: 'Demo Dashboard', path: '/demo/dashboard' }),
  demoRoute({ id: 'demo-linking', title: 'Demo Linking', path: '/demo/linking' }),
  demoRoute({ id: 'demo-operations', title: 'Demo Operations', path: '/demo/operations' }),
  demoRoute({ id: 'demo-outreach', title: 'Demo Outreach', path: '/demo/outreach' }),
  demoRoute({ id: 'demo-people', title: 'Demo People', path: '/demo/people' }),
  demoRoute({ id: 'demo-audit', title: 'Demo Theme Audit', path: '/demo/audit' }),
] as const;

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
  if (normalizedAlias.exactQuery && currentLocation.searchParams.size !== aliasQueryEntries.length) {
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

export function getAdminNavigationEntries(mode: AdminNavigationMode): ResolvedAdminNavigationEntry[] {
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
