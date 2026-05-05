import { screen, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { vi } from 'vitest';
import ContactList from '../../features/contacts/pages/ContactListPage';
import DonationList from '../../features/finance/pages/DonationListPage';
import OpportunitiesPage from '../../features/engagement/opportunities/pages/OpportunitiesPage';
import SavedReportsPage from '../../features/savedReports/pages/SavedReportsPage';
import ScheduledReportsPage from '../../features/scheduledReports/pages/ScheduledReportsPage';
import NeoBrutalistDashboard from '../../features/neoBrutalist/pages/NeoBrutalistDashboardPage';
import CaseList from '../../features/cases/pages/CaseListPage';
import CaseCreate from '../../features/cases/pages/CaseCreatePage';
import FollowUpsPage from '../../features/followUps/pages/FollowUpsPage';
import NavigationSettings from '../../features/adminOps/pages/NavigationSettingsPage';
import CommunicationsPage from '../../features/mailchimp/pages/EmailMarketingPage';
import AdminSettings from '../../features/adminOps/pages/AdminSettingsPage';
import {
  getTestApiCalls,
  registerTestApiGet,
  type TestApiMatcher,
} from '../setup';
import {
  assertRouteUxContract,
  createConsoleErrorSpy,
  type RouteUxCase,
} from '../uxRouteContract';
import {
  personaWorkflowMatrix,
  type PersonaId,
  type PersonaRolePosture,
  type PersonaRouteContractId,
} from './personaWorkflowMatrix';

vi.mock('recharts', () => {
  const Wrapper = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  return {
    ResponsiveContainer: Wrapper,
    PieChart: Wrapper,
    Pie: Wrapper,
    Cell: () => <div />,
    BarChart: Wrapper,
    Bar: Wrapper,
    LineChart: Wrapper,
    Line: Wrapper,
    XAxis: Wrapper,
    YAxis: Wrapper,
    CartesianGrid: Wrapper,
    Tooltip: Wrapper,
    Legend: () => null,
  };
});

vi.mock('../../contexts/BrandingContext', () => ({
  useBranding: () => ({
    branding: {
      organizationName: 'Test Org',
      logoUrl: null,
      primaryColor: '#0f172a',
      secondaryColor: '#475569',
      accentColor: '#10b981',
      faviconUrl: null,
      customDomain: null,
    },
    setBranding: vi.fn(),
    refreshBranding: vi.fn(),
  }),
}));

vi.mock('../../hooks/useUnsavedChangesGuard', () => ({
  useUnsavedChangesGuard: vi.fn(),
}));

type PersonaRouteTestCase = {
  personaId: PersonaId;
  displayName: string;
  rolePosture: PersonaRolePosture;
  route: string;
  routeContractId: PersonaRouteContractId;
  workflowId: string;
  primarySurface: string;
};

type PersonaRouteDefinition = Omit<RouteUxCase, 'route' | 'preloadedState'> & {
  page: ReactElement;
  roleAssertion?: (rolePosture: PersonaRolePosture) => Promise<void> | void;
};

const mockContactRoles = [
  { id: 'role-staff', name: 'Staff', description: 'Internal team member' },
  { id: 'role-client', name: 'Client', description: 'Client role' },
];

const sampleSavedReports = [
  {
    id: 'saved-report-1',
    name: 'Board oversight packet',
    description: 'Monthly board review snapshot',
    entity: 'donations',
    report_definition: {
      name: 'Board oversight packet',
      entity: 'donations',
      fields: ['amount', 'created_at'],
      filters: [],
    },
    created_at: '2026-04-01T12:00:00.000Z',
    updated_at: '2026-04-02T12:00:00.000Z',
    is_public: false,
    shared_with_users: [],
    shared_with_roles: [],
    share_settings: null,
    public_token: null,
  },
];

const sampleScheduledReports = [
  {
    id: 'schedule-1',
    organization_id: 'org-1',
    saved_report_id: 'saved-report-1',
    name: 'Board packet weekly send',
    recipients: ['board@example.org'],
    format: 'csv',
    frequency: 'weekly',
    timezone: 'UTC',
    hour: 9,
    minute: 0,
    day_of_week: 1,
    day_of_month: null,
    is_active: true,
    next_run_at: '2026-04-29T09:00:00.000Z',
    last_run_at: null,
    processing_started_at: null,
    last_error: null,
    created_at: '2026-04-01T12:00:00.000Z',
    updated_at: '2026-04-02T12:00:00.000Z',
  },
];

const apiMatchers = {
  accounts: /^\/(?:v2\/)?accounts(?:\?|$)/,
  analyticsSummary: /^\/v2\/analytics\/summary(?:\?|$)/,
  adminBranding: '/admin/branding',
  adminOrganizationSettings: '/admin/organization-settings',
  adminPermissions: '/admin/permissions',
  adminRoles: '/admin/roles',
  caseStatuses: /^\/v2\/cases\/statuses(?:\?|$)/,
  caseSummary: /^\/v2\/cases\/summary(?:\?|$)/,
  caseTypes: /^\/v2\/cases\/types(?:\?|$)/,
  cases: /^\/v2\/cases(?:\?|$)/,
  contactRoles: '/v2/contacts/roles',
  contactTags: '/v2/contacts/tags',
  contacts: /^\/v2\/contacts(?:\?|$)/,
  donations: /^\/donations(?:\?|$)/,
  followUps: /^\/(?:v2\/)?follow-ups(?:\?|$)/,
  followUpsUpcoming: /^\/v2\/follow-ups\/upcoming(?:\?|$)/,
  followUpsSummary: /^\/(?:v2\/)?follow-ups\/summary(?:\?|$)/,
  communicationsAudiences: /^\/communications\/audiences(?:\?|$)/,
  communicationsCampaignRuns: /^\/communications\/campaign-runs(?:\?|$)/,
  communicationsCampaigns: /^\/communications\/campaigns(?:\?|$)/,
  communicationsStatus: '/communications/status',
  opportunities: /^\/opportunities(?:\?|$)/,
  opportunitiesStages: /^\/opportunities\/stages(?:\?|$)/,
  opportunitiesSummary: /^\/opportunities\/summary(?:\?|$)/,
  savedReports: /^\/v2\/saved-reports(?:\?|$)/,
  scheduledReports: /^\/v2\/scheduled-reports(?:\?|$)/,
  tasksSummary: /^\/v2\/tasks\/summary(?:\?|$)/,
  usersActive: /^\/(?:v2\/)?users\?is_active=true(?:&.*)?$/,
} satisfies Record<string, TestApiMatcher>;

const emptyPagination = { total: 0, page: 1, limit: 20, total_pages: 0 };

const expectGetRequest = async (matcher: TestApiMatcher) => {
  await waitFor(() => {
    expect(getTestApiCalls('get', matcher).length).toBeGreaterThan(0);
  });
};

const buildAuthState = (rolePosture: PersonaRolePosture) => {
  const profiles: Record<
    PersonaRolePosture,
    { role: 'admin' | 'manager' | 'staff' | 'viewer'; permissions: string[]; email: string }
  > = {
    'admin-oversight': {
      role: 'admin',
      permissions: [
        'report:view',
        'report:create',
        'report:export',
        'scheduled_report:view',
        'scheduled_report:manage',
      ],
      email: 'executive@example.org',
    },
    'manager-fundraising': {
      role: 'manager',
      permissions: [
        'report:view',
        'report:create',
        'scheduled_report:view',
        'scheduled_report:manage',
      ],
      email: 'fundraiser@example.org',
    },
    'admin-operations': {
      role: 'admin',
      permissions: [
        'report:view',
        'report:create',
        'report:export',
        'scheduled_report:view',
        'scheduled_report:manage',
      ],
      email: 'admin-ops@example.org',
    },
    'viewer-read-only': {
      role: 'viewer',
      permissions: ['report:view', 'scheduled_report:view'],
      email: 'board@example.org',
    },
    'staff-case': {
      role: 'staff',
      permissions: ['report:view'],
      email: 'case-manager@example.org',
    },
    'staff-rehab': {
      role: 'staff',
      permissions: ['report:view'],
      email: 'rehab@example.org',
    },
  };

  const profile = profiles[rolePosture];

  return {
    auth: {
      user: {
        id: `user-${rolePosture}`,
        email: profile.email,
        firstName: 'Persona',
        lastName: 'User',
        role: profile.role,
        permissions: profile.permissions,
      },
      isAuthenticated: true,
      authLoading: false,
      loading: false,
    },
  };
};

const registerSharedPersonaRouteApi = () => {
  registerTestApiGet(apiMatchers.accounts, {
    data: {
      data: [],
      pagination: emptyPagination,
    },
  });
  registerTestApiGet(apiMatchers.adminBranding, { data: {} });
  registerTestApiGet(apiMatchers.adminOrganizationSettings, {
    data: {
      config: {
        workspaceModules: {
          contacts: true,
          accounts: true,
          volunteers: true,
          events: true,
          tasks: true,
          cases: true,
          followUps: true,
          opportunities: true,
          donations: true,
          reports: true,
          scheduledReports: true,
        },
      },
      updatedAt: '2026-04-20T12:00:00.000Z',
    },
  });
  registerTestApiGet(apiMatchers.adminPermissions, {
    data: { permissions: [] },
  });
  registerTestApiGet(apiMatchers.adminRoles, { data: { roles: [] } });
  registerTestApiGet(apiMatchers.contactRoles, {
    data: {
      success: true,
      data: mockContactRoles,
    },
  });
  registerTestApiGet(apiMatchers.contactTags, {
    data: {
      success: true,
      data: [],
    },
  });
  registerTestApiGet(apiMatchers.contacts, {
    data: {
      data: [],
      pagination: emptyPagination,
    },
  });
  registerTestApiGet(apiMatchers.caseTypes, {
    data: {
      success: true,
      data: [
        {
          id: 'type-1',
          name: 'Housing',
          category: 'support',
          is_active: true,
          display_order: 1,
        },
      ],
    },
  });
  registerTestApiGet(apiMatchers.caseStatuses, {
    data: {
      success: true,
      data: [
        {
          id: 'status-1',
          name: 'Open',
          status_type: 'active',
        },
      ],
    },
  });
  registerTestApiGet(apiMatchers.caseSummary, {
    data: {
      total_cases: 0,
      open_cases: 0,
      closed_cases: 0,
      by_priority: { low: 0, medium: 0, high: 0, urgent: 0 },
      by_status_type: { intake: 0, active: 0, review: 0, closed: 0, cancelled: 0 },
      by_case_type: {},
      overdue_cases: 0,
      cases_due_this_week: 0,
      unassigned_cases: 0,
    },
  });
  registerTestApiGet(apiMatchers.cases, {
    data: {
      success: true,
      data: {
        cases: [],
        total: 0,
        pagination: { page: 1, limit: 20 },
      },
    },
  });
  registerTestApiGet(apiMatchers.usersActive, {
    data: {
      users: [
        {
          id: 'user-1',
          firstName: 'Test',
          lastName: 'Assignee',
          email: 'assignee@example.com',
          isActive: true,
        },
      ],
    },
  });
  registerTestApiGet(apiMatchers.followUpsSummary, {
    data: {
      total: 0,
      scheduled: 0,
      completed: 0,
      cancelled: 0,
      due_today: 0,
      due_this_week: 0,
      overdue: 0,
    },
  });
  registerTestApiGet(apiMatchers.followUpsUpcoming, {
    data: [],
  });
  registerTestApiGet(apiMatchers.followUps, {
    data: {
      data: [],
      pagination: { total: 0, page: 1, limit: 20, pages: 0 },
    },
  });
  registerTestApiGet(apiMatchers.opportunitiesStages, {
    data: [],
  });
  registerTestApiGet(apiMatchers.opportunitiesSummary, {
    data: {
      total: 0,
      open: 0,
      won: 0,
      lost: 0,
      weighted_amount: 0,
      stage_totals: [],
    },
  });
  registerTestApiGet(apiMatchers.opportunities, {
    data: {
      data: [],
      pagination: { total: 0, page: 1, limit: 20, pages: 0 },
    },
  });
  registerTestApiGet(apiMatchers.donations, {
    data: {
      data: [],
      summary: { total_amount: 0, average_amount: 0 },
      pagination: { total: 0, page: 1, limit: 20, total_pages: 0 },
    },
  });
  registerTestApiGet(apiMatchers.savedReports, {
    data: {
      items: sampleSavedReports,
      pagination: { total: 1, page: 1, limit: 20, total_pages: 1 },
    },
  });
  registerTestApiGet(apiMatchers.scheduledReports, {
    data: sampleScheduledReports,
  });
  registerTestApiGet(apiMatchers.analyticsSummary, {
    data: {
      total_accounts: 0,
      active_accounts: 0,
      total_contacts: 0,
      active_contacts: 0,
      total_donations_ytd: 0,
      donation_count_ytd: 0,
      average_donation_ytd: 0,
      total_events_ytd: 0,
      total_volunteers: 0,
      total_volunteer_hours_ytd: 0,
      engagement_distribution: {
        high: 0,
        medium: 0,
        low: 0,
        inactive: 0,
      },
    },
  });
  registerTestApiGet(apiMatchers.tasksSummary, {
    data: {
      total: 0,
      by_status: {
        not_started: 0,
        in_progress: 0,
        waiting: 0,
        completed: 0,
        deferred: 0,
        cancelled: 0,
      },
      by_priority: {
        low: 0,
        normal: 0,
        high: 0,
        urgent: 0,
      },
      overdue: 0,
      due_today: 0,
      due_this_week: 0,
    },
  });
  registerTestApiGet(apiMatchers.communicationsStatus, {
    data: { configured: false, accountName: null, listCount: 0 },
  });
  registerTestApiGet(apiMatchers.communicationsAudiences, { data: [] });
  registerTestApiGet(apiMatchers.communicationsCampaigns, { data: [] });
  registerTestApiGet(apiMatchers.communicationsCampaignRuns, { data: [] });
};

const routeDefinitions: Record<PersonaRouteContractId, PersonaRouteDefinition> = {
  dashboard: {
    page: <NeoBrutalistDashboard />,
    heading: /^workbench$/i,
    primaryActionPattern: /create intake/i,
    primaryActionRole: 'link',
    contractAssertion: async () => {
      expect(await screen.findByRole('heading', { name: /focus queue/i })).toBeInTheDocument();
    },
  },
  'reports-home': {
    page: <div />,
    heading: /reports home/i,
    primaryActionPattern: /saved reports|scheduled reports/i,
    primaryActionRole: 'link',
  },
  'saved-reports': {
    page: <SavedReportsPage />,
    heading: /saved reports/i,
    primaryActionPattern: /create new report/i,
    contractAssertion: async () => {
      await expectGetRequest(apiMatchers.savedReports);
      expect(await screen.findByLabelText(/filter by entity/i)).toBeInTheDocument();
    },
    roleAssertion: async (rolePosture) => {
      if (rolePosture === 'viewer-read-only') {
        expect(
          screen.getByText(/creating, sharing, and scheduling are limited to report managers/i)
        ).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /create new report/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /load & run/i })).not.toBeInTheDocument();
        return;
      }

      expect(
        screen.getByText(/reuse, share, and schedule previously-defined report configurations/i)
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create new report/i })).toBeInTheDocument();
    },
  },
  'scheduled-reports': {
    page: <ScheduledReportsPage />,
    heading: /scheduled reports/i,
    primaryActionPattern: /new schedule|view runs/i,
    contractAssertion: async () => {
      await expectGetRequest(apiMatchers.scheduledReports);
      await expectGetRequest(apiMatchers.savedReports);
    },
    roleAssertion: async (rolePosture) => {
      if (rolePosture === 'viewer-read-only') {
        expect(
          screen.getByText(/creating or modifying schedules is limited to report managers/i)
        ).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /new schedule/i })).not.toBeInTheDocument();
        return;
      }

      expect(
        screen.getByText(/schedule recurring report delivery with run history and on-demand execution/i)
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /new schedule/i })).toBeInTheDocument();
    },
  },
  contacts: {
    page: <ContactList />,
    heading: 'People',
    primaryActionPattern: /new person/i,
    contractAssertion: async () => {
      expect(await screen.findByText(/no contacts found/i)).toBeInTheDocument();
    },
  },
  opportunities: {
    page: <OpportunitiesPage />,
    heading: /opportunities/i,
    primaryActionPattern: /new opportunity/i,
    contractAssertion: async () => {
      await expectGetRequest(apiMatchers.opportunitiesStages);
      expect(await screen.findByRole('link', { name: /reports workspace/i })).toBeInTheDocument();
    },
  },
  donations: {
    page: <DonationList />,
    heading: /^donations$/i,
    primaryActionPattern: /record donation/i,
    primaryActionRole: 'link',
    contractAssertion: async () => {
      await expectGetRequest(apiMatchers.donations);
      expect(await screen.findByRole('link', { name: /reports workspace/i })).toBeInTheDocument();
    },
  },
  'admin-settings': {
    page: <AdminSettings />,
    heading: /admin hub/i,
    primaryActionPattern: /admin hub/i,
    primaryActionRole: 'link',
    contractAssertion: async () => {
      await expectGetRequest(apiMatchers.adminOrganizationSettings);
      await expectGetRequest(apiMatchers.adminRoles);
    },
  },
  'navigation-settings': {
    page: <NavigationSettings />,
    heading: /my navigation/i,
    primaryActionPattern: /reset to defaults/i,
    contractAssertion: async () => {
      expect(await screen.findByText(/visible workspace modules/i)).toBeInTheDocument();
    },
  },
  communications: {
    page: <CommunicationsPage />,
    heading: /communications/i,
    primaryActionPattern: /local email/i,
    contractAssertion: async () => {
      await expectGetRequest(apiMatchers.communicationsStatus);
      expect(
        await screen.findByRole('heading', {
          name: /communications/i,
          level: 1,
        })
      ).toBeInTheDocument();
      expect(await screen.findByText(/mailchimp optional/i)).toBeInTheDocument();
    },
  },
  cases: {
    page: <CaseList />,
    heading: /^cases$/i,
    primaryActionPattern: /new case/i,
    contractAssertion: async () => {
      await expectGetRequest(apiMatchers.caseSummary);
      await expectGetRequest(apiMatchers.cases);
    },
  },
  'cases-new': {
    page: <CaseCreate />,
    heading: /create new case/i,
    primaryActionPattern: /save case/i,
    contractAssertion: async () => {
      await expectGetRequest(apiMatchers.caseTypes);
      await expectGetRequest(apiMatchers.usersActive);
      expect(await screen.findByText(/open a new case for a client/i)).toBeInTheDocument();
    },
  },
  'follow-ups': {
    page: <FollowUpsPage />,
    heading: /follow-ups/i,
    primaryActionPattern: /create follow-up/i,
    contractAssertion: async () => {
      await expectGetRequest(apiMatchers.followUpsSummary);
      await expectGetRequest(apiMatchers.followUps);
      const emptyStates = await screen.findAllByText(/no follow-ups found/i);
      expect(emptyStates.length).toBeGreaterThan(0);
    },
  },
  'case-detail': {
    page: <div />,
    heading: /case/i,
    primaryActionPattern: /back to cases/i,
    primaryActionRole: 'button',
  },
};

const resolveRouteDefinition = (
  routeContractId: PersonaRouteContractId,
  rolePosture: PersonaRolePosture
): PersonaRouteDefinition => {
  const routeDefinition = routeDefinitions[routeContractId];

  if (routeContractId === 'saved-reports' && rolePosture === 'viewer-read-only') {
    return {
      ...routeDefinition,
      primaryActionPattern: /filter by entity/i,
      primaryActionRole: 'combobox',
    };
  }

  if (routeContractId === 'scheduled-reports' && rolePosture === 'viewer-read-only') {
    return {
      ...routeDefinition,
      primaryActionPattern: /view runs/i,
    };
  }

  return routeDefinition;
};

const personaRouteCases: PersonaRouteTestCase[] = (
  Object.entries(personaWorkflowMatrix) as Array<[PersonaId, (typeof personaWorkflowMatrix)[PersonaId]]>
).flatMap(([personaId, persona]) =>
  persona.expectedRoutes.map((routeExpectation) => ({
    personaId,
    displayName: persona.displayName,
    rolePosture: persona.rolePosture,
    route: routeExpectation.route,
    routeContractId: routeExpectation.routeContractId,
    workflowId: routeExpectation.workflowId,
    primarySurface: routeExpectation.primarySurface,
  }))
);

describe('Persona route UX smoke', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = createConsoleErrorSpy();
    registerSharedPersonaRouteApi();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it.each(personaRouteCases)(
    'renders $displayName first-touch route for $workflowId on $route without console errors',
    async ({ rolePosture, route, routeContractId }) => {
      const routeDefinition = resolveRouteDefinition(routeContractId, rolePosture);

      await assertRouteUxContract({
        ...routeDefinition,
        route,
        preloadedState: buildAuthState(rolePosture),
      });

      await routeDefinition.roleAssertion?.(rolePosture);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    },
    15000
  );
});
