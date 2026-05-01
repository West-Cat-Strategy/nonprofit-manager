export type AdminSurface = 'core' | 'workspace';

export type AdminSettingsGroup =
  | 'approvals'
  | 'overview'
  | 'organization'
  | 'people_access'
  | 'communications'
  | 'governance'
  | 'other';

export type AdminSettingsSection =
  | 'approvals'
  | 'dashboard'
  | 'organization'
  | 'workspace_modules'
  | 'branding'
  | 'users'
  | 'groups'
  | 'communications'
  | 'messaging'
  | 'outcomes'
  | 'roles'
  | 'audit_logs'
  | 'other';

export type PortalAdminPanel = 'access' | 'users' | 'conversations' | 'appointments' | 'slots';

export type AdminSettingsSectionLevel = 'basic' | 'advanced';
export type AdminNavigationMode = 'settings' | 'portal';

export interface AdminNavigationConfig {
  mode: AdminNavigationMode;
  order: number;
  label: string;
  matchPrefixes?: string[];
}

export interface AdminSettingsSectionDefinition {
  id: AdminSettingsSection;
  routeId: string;
  path: string;
  label: string;
  title: string;
  routeTitle: string;
  description: string;
  level: AdminSettingsSectionLevel;
  group: AdminSettingsGroup;
  icon: string;
  surface: 'core';
}

export interface AdminWorkspaceDefinition {
  routeId: string;
  path: string;
  title: string;
  description: string;
  icon: string;
  surface: 'workspace';
  navigation: readonly AdminNavigationConfig[];
  panel?: PortalAdminPanel;
}

export type AdminRouteDefinition = AdminSettingsSectionDefinition | AdminWorkspaceDefinition;

export type AdminSettingsTabGroup = {
  id: AdminSettingsGroup;
  label: string;
  description: string;
  tabs: AdminSettingsSection[];
};

export const adminSettingsSectionDefinitions = [
  {
    id: 'approvals',
    routeId: 'admin-settings-approvals',
    path: '/settings/admin/approvals',
    label: 'Approvals',
    title: 'Pending Approvals',
    routeTitle: 'Pending Approvals',
    description: 'Review pending staff registrations and tune approval defaults.',
    level: 'basic',
    group: 'approvals',
    icon: '⏳',
    surface: 'core',
  },
  {
    id: 'dashboard',
    routeId: 'admin-settings',
    path: '/settings/admin/dashboard',
    label: 'Dashboard',
    title: 'Admin Hub',
    routeTitle: 'Admin Hub',
    description: 'Command center for organization health, access, delivery, and admin tooling.',
    level: 'basic',
    group: 'overview',
    icon: '🏛️',
    surface: 'core',
  },
  {
    id: 'organization',
    routeId: 'admin-settings-organization',
    path: '/settings/admin/organization',
    label: 'Organization',
    title: 'Organization',
    routeTitle: 'Organization',
    description: 'Core organization profile, preferences, and operational defaults.',
    level: 'basic',
    group: 'organization',
    icon: '🏢',
    surface: 'core',
  },
  {
    id: 'workspace_modules',
    routeId: 'admin-settings-workspace-modules',
    path: '/settings/admin/workspace_modules',
    label: 'Workspace Modules',
    title: 'Workspace Modules',
    routeTitle: 'Workspace Modules',
    description: 'Enable or disable staff-facing workspace modules for the organization.',
    level: 'basic',
    group: 'organization',
    icon: '🧱',
    surface: 'core',
  },
  {
    id: 'branding',
    routeId: 'admin-settings-branding',
    path: '/settings/admin/branding',
    label: 'Branding',
    title: 'Branding',
    routeTitle: 'Branding',
    description: 'Application name, colors, icons, and shared visual identity settings.',
    level: 'basic',
    group: 'organization',
    icon: '🎨',
    surface: 'core',
  },
  {
    id: 'users',
    routeId: 'admin-settings-users',
    path: '/settings/admin/users',
    label: 'Users & Security',
    title: 'Users & Security',
    routeTitle: 'Users & Security',
    description: 'Search accounts, manage invitations, review security state, and adjust access.',
    level: 'basic',
    group: 'people_access',
    icon: '👥',
    surface: 'core',
  },
  {
    id: 'groups',
    routeId: 'admin-settings-groups',
    path: '/settings/admin/groups',
    label: 'Groups & Policy',
    title: 'Groups & Policy',
    routeTitle: 'Groups & Policy',
    description: 'Bundle reusable access group definitions and shared policy assignments.',
    level: 'advanced',
    group: 'people_access',
    icon: '🪪',
    surface: 'core',
  },
  {
    id: 'communications',
    routeId: 'admin-settings-communications',
    path: '/settings/admin/communications',
    label: 'Email Delivery',
    title: 'Email Delivery',
    routeTitle: 'Email Delivery',
    description: 'Transactional email infrastructure, sender identity, and delivery readiness.',
    level: 'basic',
    group: 'communications',
    icon: '✉️',
    surface: 'core',
  },
  {
    id: 'messaging',
    routeId: 'admin-settings-messaging',
    path: '/settings/admin/messaging',
    label: 'SMS & Messaging',
    title: 'SMS & Messaging',
    routeTitle: 'SMS & Messaging',
    description: 'SMS provider credentials, messaging service routing, and delivery checks.',
    level: 'basic',
    group: 'communications',
    icon: '📱',
    surface: 'core',
  },
  {
    id: 'outcomes',
    routeId: 'admin-settings-outcomes',
    path: '/settings/admin/outcomes',
    label: 'Outcome Definitions',
    title: 'Outcome Definitions',
    routeTitle: 'Outcome Definitions',
    description: 'Maintain reporting-ready outcome definitions and operational taxonomy.',
    level: 'advanced',
    group: 'governance',
    icon: '📊',
    surface: 'core',
  },
  {
    id: 'roles',
    routeId: 'admin-settings-roles',
    path: '/settings/admin/roles',
    label: 'Roles & Permissions',
    title: 'Roles & Permissions',
    routeTitle: 'Roles & Permissions',
    description: 'Manage role catalog entries and the permission matrix backing staff access.',
    level: 'advanced',
    group: 'people_access',
    icon: '🛡️',
    surface: 'core',
  },
  {
    id: 'audit_logs',
    routeId: 'admin-settings-audit-logs',
    path: '/settings/admin/audit_logs',
    label: 'Audit Logs',
    title: 'Audit Logs',
    routeTitle: 'Audit Logs',
    description: 'Review administrative activity, access changes, and operational history.',
    level: 'advanced',
    group: 'governance',
    icon: '📜',
    surface: 'core',
  },
  {
    id: 'other',
    routeId: 'admin-settings-other',
    path: '/settings/admin/other',
    label: 'Admin Tools',
    title: 'Admin Tools',
    routeTitle: 'Admin Tools',
    description: 'Launch adjacent admin workspaces like backups, API tools, and navigation.',
    level: 'advanced',
    group: 'other',
    icon: '🧰',
    surface: 'core',
  },
] as const satisfies readonly AdminSettingsSectionDefinition[];

export const adminSettingsTabGroups: readonly AdminSettingsTabGroup[] = [
  {
    id: 'approvals',
    label: 'Approvals',
    description: 'Pending staff registrations and fast approval decisions.',
    tabs: ['approvals'],
  },
  {
    id: 'overview',
    label: 'Overview',
    description: 'Hub status, shortcuts, and shared admin health signals.',
    tabs: ['dashboard'],
  },
  {
    id: 'organization',
    label: 'Organization',
    description: 'Identity, defaults, branding, and enabled staff workspaces.',
    tabs: ['organization', 'workspace_modules', 'branding'],
  },
  {
    id: 'people_access',
    label: 'People & Access',
    description: 'Users, security, access groups, and permission models.',
    tabs: ['users', 'groups', 'roles'],
  },
  {
    id: 'communications',
    label: 'Communications',
    description: 'Transactional email, SMS readiness, and delivery tooling.',
    tabs: ['communications', 'messaging'],
  },
  {
    id: 'governance',
    label: 'Governance',
    description: 'Outcome taxonomy, audit visibility, and administrative oversight.',
    tabs: ['outcomes', 'audit_logs'],
  },
  {
    id: 'other',
    label: 'Admin Tools',
    description: 'Specialist workspaces that remain module-owned but admin-operated.',
    tabs: ['other'],
  },
] as const;

export const adminWorkspaceDefinitions = [
  {
    routeId: 'api-settings',
    path: '/settings/api',
    title: 'API & Webhooks',
    description: 'Manage API keys, webhook endpoints, delivery history, and integration access.',
    icon: '🧩',
    surface: 'workspace',
    navigation: [{ mode: 'settings', order: 120, label: 'API & Webhooks' }],
  },
  {
    routeId: 'navigation-settings',
    path: '/settings/navigation',
    title: 'My Navigation',
    description: 'Choose your staff menu order, pinned shortcuts, and visible workspace modules.',
    icon: '🧭',
    surface: 'workspace',
    navigation: [{ mode: 'settings', order: 130, label: 'My Navigation' }],
  },
  {
    routeId: 'backup-settings',
    path: '/settings/backup',
    title: 'Data Backup',
    description: 'Generate on-demand backup exports and review backup handling guidance.',
    icon: '🗄️',
    surface: 'workspace',
    navigation: [{ mode: 'settings', order: 140, label: 'Data Backup' }],
  },
  {
    routeId: 'communications',
    path: '/settings/communications',
    title: 'Communications',
    description: 'Manage local email campaigns, audiences, and optional Mailchimp sync.',
    icon: '📣',
    surface: 'workspace',
    navigation: [
      {
        mode: 'settings',
        order: 150,
        label: 'Communications',
        matchPrefixes: ['/settings/email-marketing'],
      },
    ],
  },
  {
    routeId: 'social-media',
    path: '/settings/social-media',
    title: 'Social Media',
    description: 'Configure social publishing credentials, snapshots, and website mappings.',
    icon: '🌐',
    surface: 'workspace',
    navigation: [{ mode: 'settings', order: 160, label: 'Social Media' }],
  },
  {
    routeId: 'portal-admin-access',
    path: '/settings/admin/portal/access',
    title: 'Portal Ops',
    description: 'Review portal requests and manage the client portal operations workspace.',
    icon: '🔐',
    surface: 'workspace',
    panel: 'access',
    navigation: [
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
  },
  {
    routeId: 'portal-admin-users',
    path: '/settings/admin/portal/users',
    title: 'Portal Users',
    description: 'Manage portal user status, activity history, and reset operations.',
    icon: '👤',
    surface: 'workspace',
    panel: 'users',
    navigation: [{ mode: 'portal', order: 30, label: 'Users' }],
  },
  {
    routeId: 'portal-admin-conversations',
    path: '/settings/admin/portal/conversations',
    title: 'Portal Conversations',
    description: 'Monitor live portal conversations and staff replies from one place.',
    icon: '💬',
    surface: 'workspace',
    panel: 'conversations',
    navigation: [{ mode: 'portal', order: 40, label: 'Conversations' }],
  },
  {
    routeId: 'portal-admin-appointments',
    path: '/settings/admin/portal/appointments',
    title: 'Portal Appointments',
    description: 'Triage appointment inbox items, reminders, and check-in workflows.',
    icon: '🗓️',
    surface: 'workspace',
    panel: 'appointments',
    navigation: [{ mode: 'portal', order: 50, label: 'Appointments' }],
  },
  {
    routeId: 'portal-admin-slots',
    path: '/settings/admin/portal/slots',
    title: 'Portal Slots',
    description: 'Create and manage appointment slots and portal availability windows.',
    icon: '🪟',
    surface: 'workspace',
    panel: 'slots',
    navigation: [{ mode: 'portal', order: 60, label: 'Slots' }],
  },
] as const satisfies readonly AdminWorkspaceDefinition[];

export const adminRouteDefinitions = [
  ...adminSettingsSectionDefinitions,
  ...adminWorkspaceDefinitions,
] as const satisfies readonly AdminRouteDefinition[];

export type AdminSettingsSectionDefinitionEntry = (typeof adminSettingsSectionDefinitions)[number];
export type AdminWorkspaceDefinitionEntry = (typeof adminWorkspaceDefinitions)[number];
export type AdminRouteDefinitionEntry = (typeof adminRouteDefinitions)[number];

export type AdminSettingsSectionRouteId = AdminSettingsSectionDefinitionEntry['routeId'];
export type AdminWorkspaceRouteId = AdminWorkspaceDefinitionEntry['routeId'];
export type AdminRouteId = AdminRouteDefinitionEntry['routeId'];

type AdminSettingsSectionDefinitionMap = {
  [Section in AdminSettingsSection]: Extract<AdminSettingsSectionDefinitionEntry, { id: Section }>;
};

type AdminSettingsSectionRouteDefinitionMap = {
  [RouteId in AdminSettingsSectionRouteId]: Extract<
    AdminSettingsSectionDefinitionEntry,
    { routeId: RouteId }
  >;
};

type AdminWorkspaceRouteDefinitionMap = {
  [RouteId in AdminWorkspaceRouteId]: Extract<AdminWorkspaceDefinitionEntry, { routeId: RouteId }>;
};

type AdminRouteDefinitionMap = {
  [RouteId in AdminRouteId]: Extract<AdminRouteDefinitionEntry, { routeId: RouteId }>;
};

type PortalAdminDefinitionMap = {
  [Panel in PortalAdminPanel]: Extract<AdminWorkspaceDefinitionEntry, { panel: Panel }>;
};

export const adminSettingsSectionDefinitionById = new Map<
  AdminSettingsSection,
  AdminSettingsSectionDefinitionEntry
>(adminSettingsSectionDefinitions.map((definition) => [definition.id, definition] as const));

export const adminSettingsSectionDefinitionByRouteId = new Map<
  AdminSettingsSectionRouteId,
  AdminSettingsSectionDefinitionEntry
>(adminSettingsSectionDefinitions.map((definition) => [definition.routeId, definition] as const));

export const adminWorkspaceDefinitionByRouteId = new Map<
  AdminWorkspaceRouteId,
  AdminWorkspaceDefinitionEntry
>(adminWorkspaceDefinitions.map((definition) => [definition.routeId, definition] as const));

export const adminRouteDefinitionByRouteId = new Map<AdminRouteId, AdminRouteDefinitionEntry>(
  adminRouteDefinitions.map((definition) => [definition.routeId, definition] as const)
);

export const portalAdminDefinitionByPanel = new Map(
  adminWorkspaceDefinitions
    .filter(
      (
        definition
      ): definition is Extract<AdminWorkspaceDefinitionEntry, { panel: PortalAdminPanel }> =>
        'panel' in definition && typeof definition.panel === 'string'
    )
    .map((definition) => [definition.panel, definition] as const)
);

export const adminSettingsSections: readonly AdminSettingsSection[] =
  adminSettingsSectionDefinitions.map((definition) => definition.id);

export const getAdminSettingsSectionDefinition = <Section extends AdminSettingsSection>(
  section: Section
): AdminSettingsSectionDefinitionMap[Section] => {
  const definition = adminSettingsSectionDefinitionById.get(section);
  if (!definition) {
    throw new Error(`Missing admin settings section definition for ${section}`);
  }

  return definition as AdminSettingsSectionDefinitionMap[Section];
};

export const getAdminSettingsSectionDefinitionByRouteId = <
  RouteId extends AdminSettingsSectionRouteId,
>(
  routeId: RouteId
): AdminSettingsSectionRouteDefinitionMap[RouteId] => {
  const definition = adminSettingsSectionDefinitionByRouteId.get(routeId);
  if (!definition) {
    throw new Error(`Missing admin settings route metadata for ${routeId}`);
  }

  return definition as AdminSettingsSectionRouteDefinitionMap[RouteId];
};

export const getAdminRouteDefinition = <RouteId extends AdminRouteId>(
  routeId: RouteId
): AdminRouteDefinitionMap[RouteId] => {
  const definition = adminRouteDefinitionByRouteId.get(routeId);
  if (!definition) {
    throw new Error(`Missing admin route metadata for ${routeId}`);
  }

  return definition as AdminRouteDefinitionMap[RouteId];
};

export const getAdminWorkspaceDefinitionByRouteId = <RouteId extends AdminWorkspaceRouteId>(
  routeId: RouteId
): AdminWorkspaceRouteDefinitionMap[RouteId] => {
  const definition = adminWorkspaceDefinitionByRouteId.get(routeId);
  if (!definition) {
    throw new Error(`Missing workspace admin route metadata for ${routeId}`);
  }

  return definition as AdminWorkspaceRouteDefinitionMap[RouteId];
};

export const getAdminWorkspaceDefinition = <RouteId extends AdminWorkspaceRouteId>(
  routeId: RouteId
): AdminWorkspaceRouteDefinitionMap[RouteId] => getAdminWorkspaceDefinitionByRouteId(routeId);

export const getPortalAdminDefinition = <Panel extends PortalAdminPanel>(
  panel: Panel
): PortalAdminDefinitionMap[Panel] => {
  const definition = portalAdminDefinitionByPanel.get(panel);
  if (!definition) {
    throw new Error(`Missing portal admin definition for ${panel}`);
  }

  return definition as PortalAdminDefinitionMap[Panel];
};
