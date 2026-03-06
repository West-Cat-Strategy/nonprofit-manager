import type { ReactElement, ReactNode } from 'react';
import { vi } from 'vitest';
import AccountList from '../../features/accounts/pages/AccountListPage';
import ContactList from '../../features/contacts/pages/ContactListPage';
import VolunteerList from '../../features/volunteers/pages/VolunteerListPage';
import EventList from '../engagement/events/EventList';
import TaskList from '../../features/tasks/pages/TaskListPage';
import DonationList from '../finance/donations/DonationList';
import CaseList from '../../features/cases/pages/CaseListPage';
import CaseCreate from '../../features/cases/pages/CaseCreatePage';
import FollowUpsPage from '../../features/followUps/pages/FollowUpsPage';
import OpportunitiesPage from '../engagement/opportunities/OpportunitiesPage';
import AnalyticsPage from '../../features/analytics/pages/AnalyticsPage';
import AlertsConfigPage from '../../features/alerts/pages/AlertsConfigPage';
import AlertHistoryPage from '../../features/alerts/pages/AlertHistoryPage';
import AlertInstancesPage from '../../features/alerts/pages/AlertInstancesPage';
import OutcomesReportPage from '../../features/reports/pages/OutcomesReportPage';
import ReportBuilderPage from '../../features/reports/pages/ReportBuilderPage';
import SavedReportsPage from '../../features/savedReports/pages/SavedReportsPage';
import ScheduledReportsPage from '../../features/scheduledReports/pages/ScheduledReportsPage';
import ReportTemplatesPage from '../../features/reports/pages/ReportTemplatesPage';
import IntakeNew from '../workflows/IntakeNew';
import InteractionNote from '../workflows/InteractionNote';
import api from '../../services/api';
import { assertRouteUxContract, createConsoleErrorSpy } from '../../test/uxRouteContract';

vi.mock('../../services/api');
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

const mockApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
};

type SmokeCase = {
  name: string;
  route: string;
  page: ReactElement;
  heading: string | RegExp;
  primaryActionPattern: RegExp;
  primaryActionRole?: 'button' | 'link';
};

const smokeCases: SmokeCase[] = [
  {
    name: 'accounts',
    route: '/accounts',
    page: <AccountList />,
    heading: 'Accounts',
    primaryActionPattern: /new account/i,
  },
  {
    name: 'contacts',
    route: '/contacts',
    page: <ContactList />,
    heading: 'People',
    primaryActionPattern: /new person/i,
  },
  {
    name: 'volunteers',
    route: '/volunteers',
    page: <VolunteerList />,
    heading: 'Volunteers',
    primaryActionPattern: /new volunteer/i,
  },
  {
    name: 'events',
    route: '/events',
    page: <EventList />,
    heading: 'Events',
    primaryActionPattern: /create event/i,
  },
  {
    name: 'cases',
    route: '/cases',
    page: <CaseList />,
    heading: 'Cases',
    primaryActionPattern: /new case/i,
  },
  {
    name: 'cases-new',
    route: '/cases/new',
    page: <CaseCreate />,
    heading: /create new case/i,
    primaryActionPattern: /save case/i,
  },
  {
    name: 'tasks',
    route: '/tasks',
    page: <TaskList />,
    heading: 'Tasks',
    primaryActionPattern: /new task/i,
  },
  {
    name: 'donations',
    route: '/donations',
    page: <DonationList />,
    heading: 'Donations',
    primaryActionPattern: /record donation/i,
  },
  {
    name: 'follow-ups',
    route: '/follow-ups',
    page: <FollowUpsPage />,
    heading: /follow-ups/i,
    primaryActionPattern: /create follow-up/i,
  },
  {
    name: 'opportunities',
    route: '/opportunities',
    page: <OpportunitiesPage />,
    heading: /opportunities/i,
    primaryActionPattern: /new opportunity/i,
  },
  {
    name: 'scheduled-reports',
    route: '/reports/scheduled',
    page: <ScheduledReportsPage />,
    heading: /scheduled reports/i,
    primaryActionPattern: /new schedule/i,
  },
  {
    name: 'saved-reports',
    route: '/reports/saved',
    page: <SavedReportsPage />,
    heading: /saved reports/i,
    primaryActionPattern: /create new report/i,
  },
  {
    name: 'report-builder',
    route: '/reports/builder',
    page: <ReportBuilderPage />,
    heading: /report builder/i,
    primaryActionPattern: /generate report/i,
  },
  {
    name: 'report-templates',
    route: '/reports/templates',
    page: <ReportTemplatesPage />,
    heading: /report templates/i,
    primaryActionPattern: /create custom report/i,
  },
  {
    name: 'analytics-overview',
    route: '/analytics',
    page: <AnalyticsPage />,
    heading: /analytics & reports/i,
    primaryActionPattern: /apply filters/i,
  },
  {
    name: 'alerts-overview',
    route: '/alerts',
    page: <AlertsConfigPage />,
    heading: 'Alerts',
    primaryActionPattern: /create alert/i,
  },
  {
    name: 'alerts-instances',
    route: '/alerts/instances',
    page: <AlertInstancesPage />,
    heading: /triggered alerts/i,
    primaryActionPattern: /configure alerts/i,
    primaryActionRole: 'link',
  },
  {
    name: 'alerts-history',
    route: '/alerts/history',
    page: <AlertHistoryPage />,
    heading: /alert history/i,
    primaryActionPattern: /edit alert rules/i,
    primaryActionRole: 'link',
  },
  {
    name: 'outcomes-report',
    route: '/reports/outcomes',
    page: <OutcomesReportPage />,
    heading: /outcomes report/i,
    primaryActionPattern: /export csv/i,
  },
  {
    name: 'intake-new',
    route: '/intake/new',
    page: <IntakeNew />,
    heading: /new intake/i,
    primaryActionPattern: /create contact/i,
  },
  {
    name: 'interaction-note',
    route: '/interactions/new',
    page: <InteractionNote />,
    heading: /note an interaction/i,
    primaryActionPattern: /create new person/i,
  },
];

describe('Route UX smoke', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = createConsoleErrorSpy();

    mockApi.get.mockImplementation((url: string) => {
      if (url.startsWith('/accounts') || url.startsWith('/v2/accounts')) {
        return Promise.resolve({
          data: {
            data: [],
            pagination: { total: 0, page: 1, limit: 20, total_pages: 0 },
          },
        });
      }
      if (url === '/v2/contacts/tags') {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      if (url.startsWith('/v2/contacts')) {
        return Promise.resolve({
          data: {
            data: [],
            pagination: { total: 0, page: 1, limit: 20, total_pages: 0 },
          },
        });
      }
      if (url.startsWith('/volunteers') || url.startsWith('/v2/volunteers')) {
        return Promise.resolve({
          data: {
            data: [],
            pagination: { total: 0, page: 1, limit: 20, total_pages: 0 },
          },
        });
      }
      if (url.startsWith('/events') || url.startsWith('/v2/events')) {
        return Promise.resolve({
          data: {
            data: [],
            pagination: { total: 0, page: 1, limit: 20, total_pages: 0 },
          },
        });
      }
      if (url.startsWith('/tasks') || url.startsWith('/v2/tasks')) {
        return Promise.resolve({
          data: {
            tasks: [],
            summary: null,
            pagination: { total: 0, page: 1, limit: 20, pages: 0 },
          },
        });
      }
      if (url === '/alerts/configs') {
        return Promise.resolve({
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
      }
      if (url === '/alerts/instances' || url === '/alerts/instances?limit=100') {
        return Promise.resolve({
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
      }
      if (url === '/alerts/stats') {
        return Promise.resolve({
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
      }
      if (url.startsWith('/users?is_active=true') || url.startsWith('/v2/users?is_active=true')) {
        return Promise.resolve({
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
      }
      if (url.startsWith('/v2/cases/types')) {
        return Promise.resolve({
          data: {
            success: true,
            data: [{ id: 'type-1', name: 'Housing', category: 'support', is_active: true, display_order: 1 }],
          }
        });
      }
      if (url.startsWith('/v2/cases/statuses')) {
        return Promise.resolve({
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
          }
        });
      }
      if (url.startsWith('/v2/cases/summary')) {
        return Promise.resolve({
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
      }
      if (url.startsWith('/v2/cases')) {
        return Promise.resolve({
          data: {
            cases: [],
            total: 0,
            pagination: { page: 1, limit: 20 },
          },
        });
      }
      if (url.startsWith('/donations')) {
        return Promise.resolve({
          data: {
            data: [],
            summary: { total_amount: 0, average_amount: 0 },
            pagination: { total: 0, page: 1, limit: 20, total_pages: 0 },
          },
        });
      }
      if (url.startsWith('/follow-ups/summary') || url.startsWith('/v2/follow-ups/summary')) {
        return Promise.resolve({
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
      }
      if (url.startsWith('/follow-ups') || url.startsWith('/v2/follow-ups')) {
        return Promise.resolve({
          data: {
            data: [],
            pagination: { page: 1, limit: 20, total: 0, pages: 0 },
          },
        });
      }
      if (url.startsWith('/opportunities/summary')) {
        return Promise.resolve({
          data: {
            total: 0,
            open: 0,
            won: 0,
            lost: 0,
            weighted_amount: 0,
            stage_totals: [],
          },
        });
      }
      if (url.startsWith('/opportunities/stages')) {
        return Promise.resolve({
          data: [],
        });
      }
      if (url.startsWith('/opportunities')) {
        return Promise.resolve({
          data: {
            data: [],
            pagination: { page: 1, limit: 20, total: 0, pages: 0 },
          },
        });
      }
      if (url.startsWith('/scheduled-reports') || url.startsWith('/v2/scheduled-reports')) {
        return Promise.resolve({
          data: [],
        });
      }
      if (url.startsWith('/saved-reports') || url.startsWith('/v2/saved-reports')) {
        return Promise.resolve({
          data: [],
        });
      }
      if (url.startsWith('/reports/templates') || url.startsWith('/v2/reports/templates')) {
        return Promise.resolve({
          data: [],
        });
      }
      if (url.startsWith('/reports/outcomes')) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              totalsByOutcome: [],
              timeseries: [],
            },
          },
        });
      }
      if (url.startsWith('/v2/analytics/summary')) {
        return Promise.resolve({
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
      }
      if (url.startsWith('/v2/analytics/trends/donations')) {
        return Promise.resolve({ data: [] });
      }
      if (url.startsWith('/v2/analytics/trends/volunteer-hours')) {
        return Promise.resolve({ data: [] });
      }
      if (url.startsWith('/v2/analytics/trends/event-attendance')) {
        return Promise.resolve({ data: [] });
      }
      if (url.startsWith('/v2/analytics/comparative')) {
        return Promise.resolve({
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
      }

      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it.each(smokeCases)(
    'renders H1 and primary action without console errors for $name route',
    async (smokeCase) => {
      await assertRouteUxContract(smokeCase);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    }
  );
});
