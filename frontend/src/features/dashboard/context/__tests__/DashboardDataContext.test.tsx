import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardDataProvider, useDashboardData } from '../DashboardDataContext';
import { renderWithProviders } from '../../../../test/testUtils';

const analyticsSummaryMock = vi.fn();
const caseSummaryMock = vi.fn();
const taskSummaryMock = vi.fn();
const followUpSummaryMock = vi.fn();
const upcomingFollowUpsMock = vi.fn();
const listCasesMock = vi.fn();

vi.mock('../../../analytics/api/analyticsApiClient', () => ({
  analyticsApiClient: {
    fetchSummary: (...args: unknown[]) => analyticsSummaryMock(...args),
  },
}));

vi.mock('../../../cases/api/casesApiClient', () => ({
  casesApiClient: {
    getCaseSummary: (...args: unknown[]) => caseSummaryMock(...args),
    listCases: (...args: unknown[]) => listCasesMock(...args),
  },
}));

vi.mock('../../../tasks/api/tasksApiClient', () => ({
  tasksApiClient: {
    getTaskSummary: (...args: unknown[]) => taskSummaryMock(...args),
  },
}));

vi.mock('../../../followUps/api/followUpsApiClient', () => ({
  followUpsApiClient: {
    fetchFollowUpSummary: (...args: unknown[]) => followUpSummaryMock(...args),
    fetchUpcomingFollowUps: (...args: unknown[]) => upcomingFollowUpsMock(...args),
  },
}));

function DashboardConsumer() {
  const dashboardData = useDashboardData();

  return (
    <div>
      <div data-testid="urgent-cases">{dashboardData?.caseSummary?.by_priority.urgent ?? -1}</div>
      <div data-testid="assigned-total">{dashboardData?.assignedCasesTotal ?? -1}</div>
      <div data-testid="task-error">{dashboardData?.errors.taskSummary ?? 'none'}</div>
      <div data-testid="loading-state">{dashboardData?.loading.caseSummary ? 'loading' : 'idle'}</div>
    </div>
  );
}

describe('DashboardDataContext', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'requestIdleCallback', {
      value: (callback: () => void) => {
        callback();
        return 1;
      },
      configurable: true,
      writable: true,
    });
    Object.defineProperty(window, 'cancelIdleCallback', {
      value: () => undefined,
      configurable: true,
      writable: true,
    });
    analyticsSummaryMock.mockResolvedValue({
      total_accounts: 24,
      active_accounts: 18,
      total_contacts: 81,
      active_contacts: 60,
      total_donations_ytd: 12000,
      donation_count_ytd: 42,
      average_donation_ytd: 285,
      total_events_ytd: 14,
      total_volunteers: 10,
      total_volunteer_hours_ytd: 88,
      engagement_distribution: { high: 12, medium: 16, low: 8, inactive: 24 },
    });
    caseSummaryMock.mockResolvedValue({
      total_cases: 12,
      open_cases: 8,
      closed_cases: 4,
      by_priority: { low: 1, medium: 3, high: 2, urgent: 2 },
      by_status_type: { intake: 1, active: 5, review: 1, closed: 4, cancelled: 1 },
      by_case_type: {},
      cases_due_this_week: 3,
      overdue_cases: 1,
      unassigned_cases: 2,
    });
    taskSummaryMock.mockResolvedValue({
      total: 9,
      by_status: {
        not_started: 2,
        in_progress: 3,
        waiting: 1,
        completed: 2,
        deferred: 0,
        cancelled: 1,
      },
      by_priority: { low: 1, normal: 4, high: 2, urgent: 2 },
      overdue: 1,
      due_today: 2,
      due_this_week: 4,
    });
    followUpSummaryMock.mockResolvedValue({
      total: 6,
      scheduled: 4,
      completed: 1,
      cancelled: 1,
      overdue: 1,
      due_today: 2,
      due_this_week: 3,
    });
    upcomingFollowUpsMock.mockResolvedValue([]);
    listCasesMock.mockResolvedValue({
      cases: [],
      total: 4,
      pagination: {
        page: 1,
        limit: 5,
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('loads dashboard workload data after first paint without blocking the initial render', async () => {
    renderWithProviders(
      <DashboardDataProvider>
        <DashboardConsumer />
      </DashboardDataProvider>,
      {
        preloadedState: {
          auth: {
            user: {
              id: 'user-1',
              email: 'test@example.com',
              firstName: 'Test',
              lastName: 'User',
              role: 'admin',
            },
            isAuthenticated: true,
            authLoading: false,
            loading: false,
          },
        },
      }
    );

    expect(screen.getByTestId('urgent-cases')).toHaveTextContent('-1');

    await waitFor(() => expect(screen.getByTestId('urgent-cases')).toHaveTextContent('2'));
    expect(screen.getByTestId('assigned-total')).toHaveTextContent('4');
    expect(screen.getByTestId('loading-state')).toHaveTextContent('idle');
  });

  it('surfaces request errors per data lane', async () => {
    taskSummaryMock.mockRejectedValueOnce(new Error('Task summary failed'));

    renderWithProviders(
      <DashboardDataProvider>
        <DashboardConsumer />
      </DashboardDataProvider>,
      {
        preloadedState: {
          auth: {
            user: {
              id: 'user-1',
              email: 'test@example.com',
              firstName: 'Test',
              lastName: 'User',
              role: 'admin',
            },
            isAuthenticated: true,
            authLoading: false,
            loading: false,
          },
        },
      }
    );

    await waitFor(() => expect(screen.getByTestId('task-error')).toHaveTextContent('Task summary failed'));
  });
});
