import { act, screen, waitFor } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CUSTOM_DASHBOARD_LANES,
  DashboardDataProvider,
  WORKBENCH_DASHBOARD_LANES,
  useDashboardCaseSummary,
  useDashboardData,
  useDashboardDonationTrends,
} from '../DashboardDataContext';
import { logout } from '../../../auth/state';
import { createTestStore, renderWithProviders } from '../../../../test/testUtils';
import { resetDashboardDataLoaderCacheForTests } from '../useDashboardDataLoader';

const analyticsSummaryMock = vi.fn();
const donationTrendsMock = vi.fn();
const caseSummaryMock = vi.fn();
const taskSummaryMock = vi.fn();
const followUpSummaryMock = vi.fn();
const upcomingFollowUpsMock = vi.fn();
const listCasesMock = vi.fn();

vi.mock('../../../analytics/api/analyticsApiClient', () => ({
  analyticsApiClient: {
    fetchSummary: (...args: unknown[]) => analyticsSummaryMock(...args),
    fetchDonationTrends: (...args: unknown[]) => donationTrendsMock(...args),
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

function DashboardCompatibilityConsumer() {
  const dashboardData = useDashboardData();

  return (
    <div>
      <div data-testid="urgent-cases">{dashboardData?.caseSummary?.by_priority.urgent ?? -1}</div>
      <div data-testid="trend-count">{dashboardData?.donationTrends.length ?? 0}</div>
      <div data-testid="trend-error">{dashboardData?.errors.donationTrends ?? 'none'}</div>
      <div data-testid="assigned-total">{dashboardData?.assignedCasesTotal ?? -1}</div>
      <div data-testid="task-error">{dashboardData?.errors.taskSummary ?? 'none'}</div>
      <div data-testid="loading-state">{dashboardData?.loading.caseSummary ? 'loading' : 'idle'}</div>
    </div>
  );
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe('DashboardDataContext', () => {
  beforeEach(() => {
    resetDashboardDataLoaderCacheForTests();
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
    donationTrendsMock.mockResolvedValue([
      { month: '2026-01', amount: 1800, count: 6 },
      { month: '2026-02', amount: 2400, count: 8 },
    ]);
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
    resetDashboardDataLoaderCacheForTests();
    vi.clearAllMocks();
  });

  it('loads the workbench lane set after first paint without fetching omitted lanes', async () => {
    renderWithProviders(
      <DashboardDataProvider lanes={WORKBENCH_DASHBOARD_LANES}>
        <DashboardCompatibilityConsumer />
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
    expect(screen.getByTestId('trend-count')).toHaveTextContent('0');
    expect(screen.getByTestId('assigned-total')).toHaveTextContent('4');
    expect(screen.getByTestId('loading-state')).toHaveTextContent('idle');
    expect(donationTrendsMock).not.toHaveBeenCalled();
  });

  it('resets loaded dashboard data when authentication is cleared', async () => {
    const store = createTestStore({
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
    });

    renderWithProviders(
      <DashboardDataProvider lanes={WORKBENCH_DASHBOARD_LANES}>
        <DashboardCompatibilityConsumer />
      </DashboardDataProvider>,
      { store }
    );

    await waitFor(() => expect(screen.getByTestId('urgent-cases')).toHaveTextContent('2'));

    await act(async () => {
      store.dispatch(logout());
    });

    await waitFor(() => expect(screen.getByTestId('urgent-cases')).toHaveTextContent('-1'));
    expect(screen.getByTestId('assigned-total')).toHaveTextContent('0');
    expect(screen.getByTestId('loading-state')).toHaveTextContent('idle');
    expect(screen.getByTestId('trend-error')).toHaveTextContent('none');
    expect(screen.getByTestId('task-error')).toHaveTextContent('none');
  });

  it('surfaces request errors per data lane', async () => {
    taskSummaryMock.mockRejectedValueOnce(new Error('Task summary failed'));

    renderWithProviders(
      <DashboardDataProvider lanes={CUSTOM_DASHBOARD_LANES}>
        <DashboardCompatibilityConsumer />
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

  it('keeps other dashboard lanes available when donation trends fail', async () => {
    donationTrendsMock.mockRejectedValueOnce(new Error('Trend service offline'));

    renderWithProviders(
      <DashboardDataProvider lanes={CUSTOM_DASHBOARD_LANES}>
        <DashboardCompatibilityConsumer />
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

    await waitFor(() => expect(screen.getByTestId('trend-error')).toHaveTextContent('Trend service offline'));
    expect(screen.getByTestId('urgent-cases')).toHaveTextContent('2');
    expect(screen.getByTestId('assigned-total')).toHaveTextContent('4');
  });

  it('does not rerender a case-only lane consumer when donation trends update', async () => {
    const donationTrendsDeferred = createDeferred<Array<{ month: string; amount: number; count: number }>>();

    donationTrendsMock.mockReset();
    donationTrendsMock.mockReturnValueOnce(donationTrendsDeferred.promise);

    function CaseSummaryLaneConsumer() {
      const caseConsumerRenderCount = useRef(0);
      caseConsumerRenderCount.current += 1;
      const caseSummaryLane = useDashboardCaseSummary();

      return (
        <div>
          <div data-testid="case-lane-renders">{caseConsumerRenderCount.current}</div>
          <div data-testid="case-lane-urgent">{caseSummaryLane?.caseSummary?.by_priority.urgent ?? -1}</div>
        </div>
      );
    }

    function DonationTrendsLaneConsumer() {
      const donationTrendsLane = useDashboardDonationTrends();

      return <div data-testid="donation-trend-count">{donationTrendsLane?.donationTrends.length ?? 0}</div>;
    }

    renderWithProviders(
      <DashboardDataProvider lanes={CUSTOM_DASHBOARD_LANES}>
        <CaseSummaryLaneConsumer />
        <DonationTrendsLaneConsumer />
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

    await waitFor(() => expect(screen.getByTestId('case-lane-urgent')).toHaveTextContent('2'));
    const rendersAfterCaseSettled = Number(screen.getByTestId('case-lane-renders').textContent);

    await act(async () => {
      donationTrendsDeferred.resolve([{ month: '2026-03', amount: 3200, count: 9 }]);
      await donationTrendsDeferred.promise;
    });

    await waitFor(() => expect(screen.getByTestId('donation-trend-count')).toHaveTextContent('1'));
    expect(screen.getByTestId('case-lane-renders')).toHaveTextContent(String(rendersAfterCaseSettled));
  });

  it('reuses recent workbench lane results across a short remount window', async () => {
    const preloadedState = {
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
    };

    const firstRender = renderWithProviders(
      <DashboardDataProvider lanes={WORKBENCH_DASHBOARD_LANES}>
        <DashboardCompatibilityConsumer />
      </DashboardDataProvider>,
      { preloadedState }
    );

    await waitFor(() => expect(screen.getByTestId('urgent-cases')).toHaveTextContent('2'));
    expect(analyticsSummaryMock).toHaveBeenCalledTimes(1);
    expect(taskSummaryMock).toHaveBeenCalledTimes(1);

    firstRender.unmount();

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 25));
    });

    renderWithProviders(
      <DashboardDataProvider lanes={WORKBENCH_DASHBOARD_LANES}>
        <DashboardCompatibilityConsumer />
      </DashboardDataProvider>,
      { preloadedState }
    );

    await waitFor(() => expect(screen.getByTestId('urgent-cases')).toHaveTextContent('2'));
    expect(analyticsSummaryMock).toHaveBeenCalledTimes(1);
    expect(taskSummaryMock).toHaveBeenCalledTimes(1);
  });
});
