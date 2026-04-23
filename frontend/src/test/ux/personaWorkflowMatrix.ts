export type PersonaId =
  | 'executive-director'
  | 'fundraiser'
  | 'nonprofit-administrator'
  | 'board-member'
  | 'case-manager'
  | 'rehab-worker';

export type PersonaRolePosture =
  | 'admin-oversight'
  | 'manager-fundraising'
  | 'admin-operations'
  | 'viewer-read-only'
  | 'staff-case'
  | 'staff-rehab';

export type PersonaRouteContractId =
  | 'dashboard'
  | 'reports-home'
  | 'saved-reports'
  | 'scheduled-reports'
  | 'contacts'
  | 'opportunities'
  | 'donations'
  | 'admin-settings'
  | 'navigation-settings'
  | 'communications'
  | 'cases'
  | 'cases-new'
  | 'follow-ups'
  | 'case-detail';

export type PersonaRouteExpectation = {
  route: string;
  routeContractId: PersonaRouteContractId;
  workflowId: string;
  primarySurface: string;
};

export type PersonaMatrixEntry = {
  displayName: string;
  rolePosture: PersonaRolePosture;
  workflowIds: readonly string[];
  expectedRoutes: readonly PersonaRouteExpectation[];
  anchorRouteSequence: readonly string[];
};

export const personaWorkflowMatrix: Record<PersonaId, PersonaMatrixEntry> = {
  'executive-director': {
    displayName: 'Executive Director',
    rolePosture: 'admin-oversight',
    workflowIds: [
      'executive-director-monthly-strategic-board-pack',
      'executive-director-governance-risk-escalation',
    ],
    expectedRoutes: [
      {
        route: '/dashboard',
        routeContractId: 'dashboard',
        workflowId: 'executive-director-governance-risk-escalation',
        primarySurface: 'Workbench',
      },
      {
        route: '/reports/saved',
        routeContractId: 'saved-reports',
        workflowId: 'executive-director-monthly-strategic-board-pack',
        primarySurface: 'Saved Reports',
      },
      {
        route: '/reports/scheduled',
        routeContractId: 'scheduled-reports',
        workflowId: 'executive-director-monthly-strategic-board-pack',
        primarySurface: 'Scheduled Reports',
      },
    ],
    anchorRouteSequence: ['/dashboard', '/reports', '/reports/saved', '/reports/scheduled'],
  },
  fundraiser: {
    displayName: 'Fundraiser',
    rolePosture: 'manager-fundraising',
    workflowIds: [
      'fundraiser-prospect-research-to-pipeline',
      'fundraiser-gift-entry-verification-acknowledgment-handoff',
    ],
    expectedRoutes: [
      {
        route: '/contacts',
        routeContractId: 'contacts',
        workflowId: 'fundraiser-prospect-research-to-pipeline',
        primarySurface: 'People',
      },
      {
        route: '/opportunities',
        routeContractId: 'opportunities',
        workflowId: 'fundraiser-prospect-research-to-pipeline',
        primarySurface: 'Opportunities',
      },
      {
        route: '/donations',
        routeContractId: 'donations',
        workflowId: 'fundraiser-gift-entry-verification-acknowledgment-handoff',
        primarySurface: 'Donations',
      },
    ],
    anchorRouteSequence: ['/contacts', '/opportunities', '/donations', '/reports'],
  },
  'nonprofit-administrator': {
    displayName: 'Nonprofit Administrator',
    rolePosture: 'admin-operations',
    workflowIds: [
      'nonprofit-administrator-user-onboarding-offboarding-access-lifecycle',
      'nonprofit-administrator-board-ready-reporting-cycle',
    ],
    expectedRoutes: [
      {
        route: '/settings/admin/dashboard',
        routeContractId: 'admin-settings',
        workflowId: 'nonprofit-administrator-user-onboarding-offboarding-access-lifecycle',
        primarySurface: 'Admin Hub',
      },
      {
        route: '/settings/navigation',
        routeContractId: 'navigation-settings',
        workflowId: 'nonprofit-administrator-user-onboarding-offboarding-access-lifecycle',
        primarySurface: 'Navigation Settings',
      },
      {
        route: '/settings/communications',
        routeContractId: 'communications',
        workflowId: 'nonprofit-administrator-board-ready-reporting-cycle',
        primarySurface: 'Communications Settings',
      },
    ],
    anchorRouteSequence: [
      '/settings/admin/dashboard',
      '/settings/navigation',
      '/settings/communications',
      '/reports/scheduled',
    ],
  },
  'board-member': {
    displayName: 'Board Member',
    rolePosture: 'viewer-read-only',
    workflowIds: [
      'board-member-governance-meeting-cadence-and-packet-review',
      'board-member-board-governance-dashboard-kpis-and-compliance-risk',
    ],
    expectedRoutes: [
      {
        route: '/reports/saved',
        routeContractId: 'saved-reports',
        workflowId: 'board-member-governance-meeting-cadence-and-packet-review',
        primarySurface: 'Saved Reports',
      },
      {
        route: '/reports/scheduled',
        routeContractId: 'scheduled-reports',
        workflowId: 'board-member-governance-meeting-cadence-and-packet-review',
        primarySurface: 'Scheduled Reports',
      },
      {
        route: '/dashboard',
        routeContractId: 'dashboard',
        workflowId: 'board-member-board-governance-dashboard-kpis-and-compliance-risk',
        primarySurface: 'Workbench',
      },
    ],
    anchorRouteSequence: ['/dashboard', '/reports', '/reports/saved', '/reports/scheduled'],
  },
  'case-manager': {
    displayName: 'Case Manager',
    rolePosture: 'staff-case',
    workflowIds: [
      'case-manager-referral-and-eligibility-compliance-intake',
      'case-manager-handoff-and-transition-workflow',
    ],
    expectedRoutes: [
      {
        route: '/cases',
        routeContractId: 'cases',
        workflowId: 'case-manager-handoff-and-transition-workflow',
        primarySurface: 'Cases',
      },
      {
        route: '/follow-ups',
        routeContractId: 'follow-ups',
        workflowId: 'case-manager-handoff-and-transition-workflow',
        primarySurface: 'Follow-ups',
      },
      {
        route: '/cases/new',
        routeContractId: 'cases-new',
        workflowId: 'case-manager-referral-and-eligibility-compliance-intake',
        primarySurface: 'Case Intake',
      },
    ],
    anchorRouteSequence: ['/cases', '/cases/new', '/cases/:id', '/follow-ups'],
  },
  'rehab-worker': {
    displayName: 'Rehab Worker',
    rolePosture: 'staff-rehab',
    workflowIds: [
      'rehab-worker-follow-up-and-contact-cadence-for-compliance-windows',
      'rehab-worker-service-authorization-and-referral-transitions',
    ],
    expectedRoutes: [
      {
        route: '/cases',
        routeContractId: 'cases',
        workflowId: 'rehab-worker-service-authorization-and-referral-transitions',
        primarySurface: 'Cases',
      },
      {
        route: '/follow-ups',
        routeContractId: 'follow-ups',
        workflowId: 'rehab-worker-follow-up-and-contact-cadence-for-compliance-windows',
        primarySurface: 'Follow-ups',
      },
    ],
    anchorRouteSequence: ['/cases', '/cases/:id', '/follow-ups'],
  },
};
