import type { ReactElement } from 'react';
import { vi } from 'vitest';
import AccountList from '../people/accounts/AccountList';
import ContactList from '../people/contacts/ContactList';
import VolunteerList from '../people/volunteers/VolunteerList';
import EventList from '../engagement/events/EventList';
import TaskList from '../engagement/tasks/TaskList';
import DonationList from '../finance/donations/DonationList';
import CaseList from '../engagement/cases/CaseList';
import FollowUpsPage from '../engagement/followUps/FollowUpsPage';
import OpportunitiesPage from '../engagement/opportunities/OpportunitiesPage';
import ScheduledReportsPage from '../analytics/ScheduledReports';
import api from '../../services/api';
import { assertRouteUxContract, createConsoleErrorSpy } from '../../test/uxRouteContract';

vi.mock('../../services/api');

const mockApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
};

type SmokeCase = {
  name: string;
  route: string;
  page: ReactElement;
  heading: string | RegExp;
  primaryActionPattern: RegExp;
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
];

describe('Route UX smoke', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = createConsoleErrorSpy();

    mockApi.get.mockImplementation((url: string) => {
      if (url.startsWith('/accounts')) {
        return Promise.resolve({
          data: {
            data: [],
            pagination: { total: 0, page: 1, limit: 20, total_pages: 0 },
          },
        });
      }
      if (url === '/v2/contacts/tags') {
        return Promise.resolve({ data: { tags: [] } });
      }
      if (url.startsWith('/v2/contacts')) {
        return Promise.resolve({
          data: {
            data: [],
            pagination: { total: 0, page: 1, limit: 20, total_pages: 0 },
          },
        });
      }
      if (url.startsWith('/volunteers')) {
        return Promise.resolve({
          data: {
            data: [],
            pagination: { total: 0, page: 1, limit: 20, total_pages: 0 },
          },
        });
      }
      if (url.startsWith('/events')) {
        return Promise.resolve({
          data: {
            data: [],
            pagination: { total: 0, page: 1, limit: 20, total_pages: 0 },
          },
        });
      }
      if (url.startsWith('/tasks')) {
        return Promise.resolve({
          data: {
            tasks: [],
            summary: null,
            pagination: { total: 0, page: 1, limit: 20, pages: 0 },
          },
        });
      }
      if (url.startsWith('/v2/cases/types')) {
        return Promise.resolve({
          data: {
            types: [{ id: 'type-1', name: 'Housing', category: 'support', is_active: true, display_order: 1 }],
          },
        });
      }
      if (url.startsWith('/v2/cases/statuses')) {
        return Promise.resolve({
          data: {
            statuses: [
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
      if (url.startsWith('/follow-ups/summary')) {
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
      if (url.startsWith('/follow-ups')) {
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
      if (url.startsWith('/scheduled-reports')) {
        return Promise.resolve({
          data: [],
        });
      }
      if (url.startsWith('/saved-reports')) {
        return Promise.resolve({
          data: [],
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
