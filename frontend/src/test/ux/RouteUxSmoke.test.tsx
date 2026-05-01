import type { ReactElement, ReactNode } from 'react';
import { screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import AccountList from '../../features/accounts/pages/AccountListPage';
import ContactList from '../../features/contacts/pages/ContactListPage';
import VolunteerList from '../../features/volunteers/pages/VolunteerListPage';
import EventList from '../../features/events/pages/EventsHubPage';
import EventCalendarPage from '../../features/events/pages/EventCalendarPage';
import TaskList from '../../features/tasks/pages/TaskListPage';
import DonationList from '../../features/finance/pages/DonationListPage';
import CaseList from '../../features/cases/pages/CaseListPage';
import CaseCreate from '../../features/cases/pages/CaseCreatePage';
import NeoBrutalistDashboard from '../../features/neoBrutalist/pages/NeoBrutalistDashboardPage';
import FollowUpsPage from '../../features/followUps/pages/FollowUpsPage';
import OpportunitiesPage from '../../features/engagement/opportunities/pages/OpportunitiesPage';
import AnalyticsPage from '../../features/analytics/pages/AnalyticsPage';
import OutcomesReportPage from '../../features/reports/pages/OutcomesReportPage';
import ReportBuilderPage from '../../features/reports/pages/ReportBuilderPage';
import SavedReportsPage from '../../features/savedReports/pages/SavedReportsPage';
import ScheduledReportsPage from '../../features/scheduledReports/pages/ScheduledReportsPage';
import ReportTemplatesPage from '../../features/reports/pages/ReportTemplatesPage';
import WebsitesListPage from '../../features/websites/pages/WebsitesListPage';
import IntakeNew from '../../features/workflows/pages/IntakeNewPage';
import InteractionNote from '../../features/workflows/pages/InteractionNotePage';
import {
  getTestApiCalls,
  registerTestApiGet,
  type TestApiMatcher,
} from '../../test/setup';
import { assertRouteUxContract, createConsoleErrorSpy } from '../../test/uxRouteContract';
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

vi.mock('../../features/auth/state/adminAccess', () => ({
  canAccessAdminSettings: () => false,
}));

const mockContactRoles = [
  { id: 'role-staff', name: 'Staff', description: 'Internal team member' },
  { id: 'role-client', name: 'Client', description: 'Client role' },
];

const apiMatchers = {
  accounts: /^\/(?:v2\/)?accounts(?:\?|$)/,
  analyticsComparative: /^\/v2\/analytics\/comparative(?:\?|$)/,
  analyticsEventAttendance: /^\/v2\/analytics\/trends\/event-attendance(?:\?|$)/,
  analyticsSummary: /^\/v2\/analytics\/summary(?:\?|$)/,
  analyticsDonationTrends: /^\/v2\/analytics\/trends\/donations(?:\?|$)/,
  analyticsVolunteerTrends: /^\/v2\/analytics\/trends\/volunteer-hours(?:\?|$)/,
  alertConfigs: '/alerts/configs',
  alertInstances: /^\/alerts\/instances(?:\?|$)/,
  alertStats: '/alerts/stats',
  caseStatuses: /^\/v2\/cases\/statuses(?:\?|$)/,
  caseSummary: /^\/v2\/cases\/summary(?:\?|$)/,
  caseTypes: /^\/v2\/cases\/types(?:\?|$)/,
  cases: /^\/v2\/cases(?:\?|$)/,
  contacts: /^\/v2\/contacts(?:\?|$)/,
  contactRoles: '/v2/contacts/roles',
  contactTags: '/v2/contacts/tags',
  donations: /^\/donations(?:\?|$)/,
  events: /^\/(?:v2\/)?events(?:\?|$)/,
  eventOccurrences: /^\/v2\/events\/occurrences(?:\?|$)/,
  exportJobs: /^\/v2\/reports\/exports(?:\?|$)/,
  followUps: /^\/(?:v2\/)?follow-ups(?:\?|$)/,
  followUpsSummary: /^\/(?:v2\/)?follow-ups\/summary(?:\?|$)/,
  opportunities: /^\/opportunities(?:\?|$)/,
  opportunitiesStages: /^\/opportunities\/stages(?:\?|$)/,
  opportunitiesSummary: /^\/opportunities\/summary(?:\?|$)/,
  outcomeDefinitions: /^\/v2\/cases\/outcomes\/definitions(?:\?|$)/,
  outcomesReport: /^\/reports\/outcomes(?:\?|$)/,
  reportFields: /^\/v2\/reports\/fields\/[a-z_]+$/,
  reportTemplates: /^\/v2\/reports\/templates(?:\?|$)/,
  savedReports: /^\/v2\/saved-reports(?:\?|$)/,
  scheduledReports: /^\/v2\/scheduled-reports(?:\?|$)/,
  sites: /^\/sites(?:\?|$)/,
  tasks: /^\/(?:v2\/)?tasks(?:\?|$)/,
  usersActive: /^\/(?:v2\/)?users\?is_active=true(?:&.*)?$/,
  volunteers: /^\/(?:v2\/)?volunteers(?:\?|$)/,
} satisfies Record<string, TestApiMatcher>;

const emptyPagination = { total: 0, page: 1, limit: 20, total_pages: 0 };
const expectGetRequest = async (matcher: TestApiMatcher) => {
  await waitFor(() => {
    expect(getTestApiCalls('get', matcher).length).toBeGreaterThan(0);
  });
};

const reportManagerState = {
  auth: {
    user: {
      id: 'user-report-manager',
      email: 'reports@example.org',
      firstName: 'Report',
      lastName: 'Manager',
      role: 'manager',
      permissions: [
        'report:view',
        'report:create',
        'report:export',
        'scheduled_report:view',
        'scheduled_report:manage',
      ],
    },
    isAuthenticated: true,
    authLoading: false,
    loading: false,
  },
} as const;

const registerSharedRouteApi = () => {
  registerTestApiGet(apiMatchers.accounts, {
    data: {
      data: [],
      pagination: emptyPagination,
    },
  });
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
  registerTestApiGet(apiMatchers.volunteers, {
    data: {
      data: [],
      pagination: emptyPagination,
    },
  });
  registerTestApiGet(apiMatchers.events, {
    data: {
      data: [],
      pagination: emptyPagination,
    },
  });
  registerTestApiGet(apiMatchers.eventOccurrences, {
    data: {
      occurrences: [],
      total: 0,
    },
  });
  registerTestApiGet(apiMatchers.tasks, {
    data: {
      tasks: [],
      summary: null,
      pagination: { total: 0, page: 1, limit: 20, pages: 0 },
    },
  });
  registerTestApiGet(apiMatchers.alertConfigs, {
    data: [
      {
        id: 'alert-1',
        name: 'Donation threshold',
        metric_type: 'donation_amount',
        condition: 'drops_below',
        threshold: 100,
        frequency: 'daily',
        channels: ['email'],
        severity: 'high',
        enabled: true,
        last_triggered: '2026-03-05T18:00:00.000Z',
      },
    ],
  });
  registerTestApiGet(apiMatchers.alertInstances, {
    data: [
      {
        id: 'instance-1',
        alert_config_id: 'alert-1',
        alert_name: 'Donation threshold',
        metric_type: 'donation_amount',
        condition: 'drops_below',
        severity: 'high',
        status: 'triggered',
        triggered_at: '2026-03-05T18:00:00.000Z',
        current_value: 84,
        threshold_value: 100,
        message: 'Donation volume dropped below threshold',
      },
    ],
  });
  registerTestApiGet(apiMatchers.alertStats, {
    data: {
      total_alerts: 1,
      active_alerts: 1,
      triggered_today: 1,
      triggered_this_week: 2,
      triggered_this_month: 3,
      by_severity: {
        low: 0,
        medium: 0,
        high: 1,
        critical: 0,
      },
      by_metric: {
        donation_amount: 1,
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
          is_closed_status: false,
          color: '#000000',
          display_order: 1,
          is_active: true,
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
      cases_due_this_week: 0,
      overdue_cases: 0,
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
  registerTestApiGet(apiMatchers.donations, {
    data: {
      data: [],
      summary: { total_amount: 0, average_amount: 0 },
      pagination: emptyPagination,
    },
  });
  registerTestApiGet(apiMatchers.followUpsSummary, {
    data: {
      total: 0,
      scheduled: 0,
      completed: 0,
      cancelled: 0,
      overdue: 0,
      due_today: 0,
      due_this_week: 0,
    },
  });
  registerTestApiGet(apiMatchers.followUps, {
    data: {
      data: [],
      pagination: { page: 1, limit: 20, total: 0, pages: 0 },
    },
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
  registerTestApiGet(apiMatchers.opportunitiesStages, {
    data: [],
  });
  registerTestApiGet(apiMatchers.opportunities, {
    data: {
      data: [],
      pagination: { page: 1, limit: 20, total: 0, pages: 0 },
    },
  });
  registerTestApiGet(apiMatchers.scheduledReports, {
    data: [],
  });
  registerTestApiGet(apiMatchers.savedReports, {
    data: {
      items: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        total_pages: 0,
      },
    },
  });
  registerTestApiGet(apiMatchers.reportTemplates, {
    data: [],
  });
  registerTestApiGet(apiMatchers.outcomesReport, {
    data: {
      success: true,
      data: {
        totalsByOutcome: [],
        timeseries: [],
      },
    },
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
  registerTestApiGet(apiMatchers.analyticsDonationTrends, { data: [] });
  registerTestApiGet(apiMatchers.analyticsVolunteerTrends, { data: [] });
  registerTestApiGet(apiMatchers.analyticsEventAttendance, { data: [] });
  registerTestApiGet(apiMatchers.analyticsComparative, {
    data: {
      current_period: 'Current',
      previous_period: 'Previous',
      metrics: {
        total_donations: { current: 0, previous: 0, change: 0, change_percent: 0 },
        donation_count: { current: 0, previous: 0, change: 0, change_percent: 0 },
        average_donation: { current: 0, previous: 0, change: 0, change_percent: 0 },
        new_contacts: { current: 0, previous: 0, change: 0, change_percent: 0 },
        total_events: { current: 0, previous: 0, change: 0, change_percent: 0 },
        volunteer_hours: { current: 0, previous: 0, change: 0, change_percent: 0 },
      },
    },
  });
  registerTestApiGet(apiMatchers.sites, {
    data: {
      sites: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    },
  });
  registerTestApiGet(apiMatchers.reportFields, {
    data: {
      entity: 'contacts',
      fields: [
        { field: 'first_name', label: 'First Name', type: 'string' },
        { field: 'email', label: 'Email', type: 'string' },
      ],
    },
  });
  registerTestApiGet(apiMatchers.exportJobs, {
    data: [],
  });
  registerTestApiGet(apiMatchers.outcomeDefinitions, {
    data: {
      success: true,
      data: [],
    },
  });
};

type SmokeCase = {
  name: string;
  route: string;
  page: ReactElement;
  heading: string | RegExp;
  primaryActionPattern: RegExp;
  primaryActionRole?: 'button' | 'link';
  contractAssertion: () => Promise<void> | void;
};

const smokeCases: SmokeCase[] = [
  {
    name: 'dashboard',
    route: '/dashboard',
    page: <NeoBrutalistDashboard />,
    heading: /^workbench$/i,
    primaryActionPattern: /create intake/i,
    primaryActionRole: 'link',
    contractAssertion: async () => {
      expect(await screen.findByRole('heading', { name: /focus queue/i })).toBeInTheDocument();
    },
  },
  {
    name: 'accounts',
    route: '/accounts',
    page: <AccountList />,
    heading: 'Accounts',
    primaryActionPattern: /new account/i,
    contractAssertion: () => expectGetRequest(apiMatchers.accounts),
  },
  {
    name: 'contacts',
    route: '/contacts',
    page: <ContactList />,
    heading: 'People',
    primaryActionPattern: /new person/i,
    contractAssertion: async () => {
      expect(await screen.findByText(/no contacts found/i)).toBeInTheDocument();
    },
  },
  {
    name: 'volunteers',
    route: '/volunteers',
    page: <VolunteerList />,
    heading: 'Volunteers',
    primaryActionPattern: /new volunteer/i,
    contractAssertion: () => expectGetRequest(apiMatchers.volunteers),
  },
  {
    name: 'events',
    route: '/events',
    page: <EventList />,
    heading: 'Events',
    primaryActionPattern: /create event/i,
    primaryActionRole: 'link',
    contractAssertion: async () => {
      await expectGetRequest(apiMatchers.eventOccurrences);
      expect(await screen.findByRole('link', { name: /check-in desk/i })).toBeInTheDocument();
    },
  },
  {
    name: 'events-calendar',
    route: '/events/calendar',
    page: <EventCalendarPage />,
    heading: 'Events',
    primaryActionPattern: /create event/i,
    primaryActionRole: 'link',
    contractAssertion: async () => {
      expect(
        (await screen.findAllByText(/may 2026/i)).length
      ).toBeGreaterThan(0);
    },
  },
  {
    name: 'cases',
    route: '/cases',
    page: <CaseList />,
    heading: 'Cases',
    primaryActionPattern: /new case/i,
    contractAssertion: async () => {
      await expectGetRequest(apiMatchers.caseSummary);
      await expectGetRequest(apiMatchers.cases);
    },
  },
  {
    name: 'cases-new',
    route: '/cases/new',
    page: <CaseCreate />,
    heading: /create new case/i,
    primaryActionPattern: /save case/i,
    contractAssertion: async () => {
      await expectGetRequest(apiMatchers.caseTypes);
      await expectGetRequest(apiMatchers.usersActive);
      expect(await screen.findByText(/open a new case for a client/i)).toBeInTheDocument();
    },
  },
  {
    name: 'tasks',
    route: '/tasks',
    page: <TaskList />,
    heading: 'Tasks',
    primaryActionPattern: /new task/i,
    primaryActionRole: 'link',
    contractAssertion: () => expectGetRequest(apiMatchers.tasks),
  },
  {
    name: 'donations',
    route: '/donations',
    page: <DonationList />,
    heading: 'Donations',
    primaryActionPattern: /record donation/i,
    primaryActionRole: 'link',
    contractAssertion: () => expectGetRequest(apiMatchers.donations),
  },
  {
    name: 'follow-ups',
    route: '/follow-ups',
    page: <FollowUpsPage />,
    heading: /follow-ups/i,
    primaryActionPattern: /create follow-up/i,
    contractAssertion: async () => {
      await expectGetRequest(apiMatchers.followUpsSummary);
      await expectGetRequest(apiMatchers.followUps);
    },
  },
  {
    name: 'opportunities',
    route: '/opportunities',
    page: <OpportunitiesPage />,
    heading: /opportunities/i,
    primaryActionPattern: /new opportunity/i,
    contractAssertion: async () => {
      await expectGetRequest(apiMatchers.opportunitiesStages);
      await expectGetRequest(apiMatchers.opportunitiesSummary);
      await expectGetRequest(apiMatchers.opportunities);
    },
  },
  {
    name: 'scheduled-reports',
    route: '/reports/scheduled',
    page: <ScheduledReportsPage />,
    heading: /scheduled reports/i,
    primaryActionPattern: /new schedule/i,
    preloadedState: reportManagerState,
    contractAssertion: async () => {
      await expectGetRequest(apiMatchers.scheduledReports);
      await expectGetRequest(apiMatchers.savedReports);
    },
  },
  {
    name: 'saved-reports',
    route: '/reports/saved',
    page: <SavedReportsPage />,
    heading: /saved reports/i,
    primaryActionPattern: /create new report/i,
    preloadedState: reportManagerState,
    contractAssertion: () => expectGetRequest(apiMatchers.savedReports),
  },
  {
    name: 'report-builder',
    route: '/reports/builder',
    page: <ReportBuilderPage />,
    heading: /report builder/i,
    primaryActionPattern: /generate report/i,
    preloadedState: reportManagerState,
    contractAssertion: async () => {
      await expectGetRequest(apiMatchers.reportFields);
      await expectGetRequest(apiMatchers.exportJobs);
      expect(await screen.findByText(/no manual export jobs yet/i)).toBeInTheDocument();
    },
  },
  {
    name: 'report-templates',
    route: '/reports/templates',
    page: <ReportTemplatesPage />,
    heading: /report templates/i,
    primaryActionPattern: /create custom report/i,
    contractAssertion: async () => {
      await expectGetRequest(apiMatchers.reportTemplates);
      expect(await screen.findByText(/no templates found/i)).toBeInTheDocument();
    },
  },
  {
    name: 'analytics-overview',
    route: '/analytics',
    page: <AnalyticsPage />,
    heading: /analytics & reports/i,
    primaryActionPattern: /apply filters/i,
    contractAssertion: async () => {
      await expectGetRequest(apiMatchers.analyticsSummary);
      await expectGetRequest(apiMatchers.analyticsComparative);
    },
  },
  {
    name: 'websites',
    route: '/websites',
    page: <WebsitesListPage />,
    heading: 'Websites',
    primaryActionPattern: /open site builder/i,
    primaryActionRole: 'link',
    contractAssertion: () => expectGetRequest(apiMatchers.sites),
  },
  {
    name: 'outcomes-report',
    route: '/reports/outcomes',
    page: <OutcomesReportPage />,
    heading: /outcomes report/i,
    primaryActionPattern: /export csv/i,
    contractAssertion: () => expectGetRequest(apiMatchers.outcomesReport),
  },
  {
    name: 'intake-new',
    route: '/intake/new',
    page: <IntakeNew />,
    heading: /new intake/i,
    primaryActionPattern: /create contact/i,
    contractAssertion: async () => {
      expect(await screen.findByText(/create a new person contact file/i)).toBeInTheDocument();
    },
  },
  {
    name: 'interaction-note',
    route: '/interactions/new',
    page: <InteractionNote />,
    heading: /note an interaction/i,
    primaryActionPattern: /create new person/i,
    contractAssertion: async () => {
      await expectGetRequest(apiMatchers.outcomeDefinitions);
      expect(await screen.findByLabelText(/find a person/i)).toBeInTheDocument();
    },
  },
];

describe('Route UX smoke', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = createConsoleErrorSpy();
    registerSharedRouteApi();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it.each(smokeCases)(
    'renders H1 and primary action without console errors for $name route',
    async (smokeCase) => {
      await assertRouteUxContract(smokeCase);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    },
    15000
  );
});
