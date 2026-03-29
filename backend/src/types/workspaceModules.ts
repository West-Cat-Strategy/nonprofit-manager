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
  'websites',
] as const;

export type WorkspaceModuleKey = (typeof WORKSPACE_MODULE_KEYS)[number];

export type WorkspaceModulesConfig = Record<WorkspaceModuleKey, boolean>;

export type PartialWorkspaceModulesConfig = Partial<WorkspaceModulesConfig> | null | undefined;

export const createDefaultWorkspaceModulesConfig = (): WorkspaceModulesConfig => ({
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
  websites: true,
});

export const normalizeWorkspaceModulesConfig = (
  input: PartialWorkspaceModulesConfig
): WorkspaceModulesConfig => {
  const defaults = createDefaultWorkspaceModulesConfig();
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
