export const WORKSPACE_MODULE_KEYS = [
  'contacts',
  'accounts',
  'volunteers',
  'events',
  'tasks',
  'cases',
  'followUps',
  'opportunities',
  'externalServiceProviders',
  'teamChat',
  'donations',
  'grants',
  'recurringDonations',
  'reconciliation',
  'analytics',
  'reports',
  'scheduledReports',
  'alerts',
] as const;

export type WorkspaceModuleKey = (typeof WORKSPACE_MODULE_KEYS)[number];

export type WorkspaceModuleSettings = Record<WorkspaceModuleKey, boolean>;

export type PartialWorkspaceModuleSettings = Partial<WorkspaceModuleSettings> | null | undefined;

export type WorkspaceModuleGroup = 'People' | 'Engagement' | 'Finance' | 'Insights';

export type WorkspaceModuleDefinition = {
  key: WorkspaceModuleKey;
  label: string;
  description: string;
  group: WorkspaceModuleGroup;
};

export const workspaceModuleDefinitions: readonly WorkspaceModuleDefinition[] = [
  {
    key: 'contacts',
    label: 'People',
    description: 'People directory, detail pages, and person records.',
    group: 'People',
  },
  {
    key: 'accounts',
    label: 'Accounts',
    description: 'Organization accounts and related account records.',
    group: 'People',
  },
  {
    key: 'volunteers',
    label: 'Volunteers',
    description: 'Volunteer profiles, assignments, and participation tracking.',
    group: 'People',
  },
  {
    key: 'events',
    label: 'Events',
    description: 'Event planning, calendars, detail pages, and check-in flows.',
    group: 'Engagement',
  },
  {
    key: 'tasks',
    label: 'Tasks',
    description: 'Staff task lists and follow-through workflows.',
    group: 'Engagement',
  },
  {
    key: 'cases',
    label: 'Cases',
    description: 'Case management workspaces, detail pages, and related workflows.',
    group: 'Engagement',
  },
  {
    key: 'followUps',
    label: 'Follow-Ups',
    description: 'Follow-up queues and downstream action management.',
    group: 'Engagement',
  },
  {
    key: 'opportunities',
    label: 'Opportunities',
    description: 'Pipeline tracking and opportunity management.',
    group: 'Engagement',
  },
  {
    key: 'externalServiceProviders',
    label: 'Providers',
    description: 'External service provider records and integrations.',
    group: 'Engagement',
  },
  {
    key: 'teamChat',
    label: 'Team Messenger',
    description: 'Internal team messaging and case-linked chat.',
    group: 'Engagement',
  },
  {
    key: 'donations',
    label: 'Donations',
    description: 'Donation records, donation detail pages, and payment entry.',
    group: 'Finance',
  },
  {
    key: 'grants',
    label: 'Grants',
    description: 'Grant funders, programs, applications, awards, and reporting.',
    group: 'Finance',
  },
  {
    key: 'recurringDonations',
    label: 'Monthly Plans',
    description: 'Recurring donation plans and subscriber management.',
    group: 'Finance',
  },
  {
    key: 'reconciliation',
    label: 'Reconciliation',
    description: 'Finance reconciliation dashboards and matching workflows.',
    group: 'Finance',
  },
  {
    key: 'analytics',
    label: 'Analytics',
    description: 'Analytics dashboards and custom dashboard views.',
    group: 'Insights',
  },
  {
    key: 'reports',
    label: 'Reports',
    description: 'Report builder, templates, saved reports, and outcome reports.',
    group: 'Insights',
  },
  {
    key: 'scheduledReports',
    label: 'Scheduled Reports',
    description: 'Scheduled report jobs and delivery management.',
    group: 'Insights',
  },
  {
    key: 'alerts',
    label: 'Alerts',
    description: 'Alerts overview, history, and triggered alert monitoring.',
    group: 'Insights',
  },
];

export const workspaceModuleGroupOrder: readonly WorkspaceModuleGroup[] = [
  'People',
  'Engagement',
  'Finance',
  'Insights',
];

export const createDefaultWorkspaceModuleSettings = (): WorkspaceModuleSettings => ({
  contacts: true,
  accounts: true,
  volunteers: true,
  events: true,
  tasks: true,
  cases: true,
  followUps: true,
  opportunities: true,
  externalServiceProviders: true,
  teamChat: true,
  donations: true,
  grants: true,
  recurringDonations: true,
  reconciliation: true,
  analytics: true,
  reports: true,
  scheduledReports: true,
  alerts: true,
});

export const normalizeWorkspaceModuleSettings = (
  input: PartialWorkspaceModuleSettings
): WorkspaceModuleSettings => {
  const defaults = createDefaultWorkspaceModuleSettings();
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return defaults;
  }

  const normalized = { ...defaults };
  for (const key of WORKSPACE_MODULE_KEYS) {
    if (typeof input[key] === 'boolean') {
      normalized[key] = input[key] as boolean;
    }
  }

  return normalized;
};

const exactRouteModuleMap: Partial<Record<string, WorkspaceModuleKey>> = {
  contacts: 'contacts',
  accounts: 'accounts',
  volunteers: 'volunteers',
  events: 'events',
  tasks: 'tasks',
  cases: 'cases',
  'follow-ups': 'followUps',
  opportunities: 'opportunities',
  'external-service-providers': 'externalServiceProviders',
  'team-chat': 'teamChat',
  donations: 'donations',
  grants: 'grants',
  'recurring-donations': 'recurringDonations',
  reconciliation: 'reconciliation',
  analytics: 'analytics',
  reports: 'reports',
  'reports-scheduled': 'scheduledReports',
  'alerts-overview': 'alerts',
  'dashboard-custom': 'analytics',
};

const prefixedRouteModuleMap: ReadonlyArray<[prefix: string, module: WorkspaceModuleKey]> = [
  ['account-', 'accounts'],
  ['volunteer-', 'volunteers'],
  ['events-', 'events'],
  ['event-', 'events'],
  ['task-', 'tasks'],
  ['case-', 'cases'],
  ['donation-', 'donations'],
  ['grants-', 'grants'],
  ['recurring-donation-', 'recurringDonations'],
  ['reports-builder', 'reports'],
  ['reports-templates', 'reports'],
  ['reports-saved', 'reports'],
  ['reports-outcomes', 'reports'],
  ['reports-workflow-coverage', 'reports'],
  ['alerts-', 'alerts'],
];

export const resolveWorkspaceModuleForRouteId = (
  routeId: string
): WorkspaceModuleKey | null => {
  const exact = exactRouteModuleMap[routeId];
  if (exact) {
    return exact;
  }

  for (const [prefix, moduleKey] of prefixedRouteModuleMap) {
    if (routeId.startsWith(prefix)) {
      return moduleKey;
    }
  }

  return null;
};
