import { screen, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import type * as ReactRouterDomModule from 'react-router-dom';
import type * as DashboardStateModule from '../../state';
import { vi } from 'vitest';
import CustomDashboard from '../CustomDashboardPage';
import { renderWithProviders } from '../../../../test/testUtils';

const { dispatchMock, dashboardState } = vi.hoisted(() => ({
  dispatchMock: vi.fn(),
  dashboardState: {
    dashboard: {
      currentDashboard: null,
      dashboards: [],
      loading: false,
      saving: false,
      error: null,
      editMode: false,
    },
    auth: {
      isAuthenticated: true,
    },
  },
}));

const createDashboard = (overrides: Record<string, unknown> = {}) => ({
  id: 'dash-1',
  user_id: 'user-1',
  name: 'Primary',
  is_default: true,
  widgets: [],
  layout: [],
  created_at: '2026-03-01T00:00:00.000Z',
  updated_at: '2026-03-01T00:00:00.000Z',
  ...overrides,
});

vi.mock('../../../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (state: typeof dashboardState) => unknown) => selector(dashboardState),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouterDomModule>('react-router-dom');
  return {
    ...actual,
    Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
  };
});

vi.mock('react-grid-layout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../../../components/dashboard', () => ({
  DonationSummaryWidget: () => <div>Donation Summary</div>,
  RecentDonationsWidget: () => <div>Recent Donations</div>,
  DonationTrendsWidget: () => <div>Donation Trends</div>,
  VolunteerHoursWidget: () => <div>Volunteer Hours</div>,
  EventAttendanceWidget: () => <div>Event Attendance</div>,
  QuickActionsWidget: () => <div>Quick Actions</div>,
  CaseSummaryWidget: () => <div>Case Summary</div>,
  MyCasesWidget: () => <div>My Cases</div>,
  ActivityFeedWidget: () => <div>Activity Feed</div>,
  PlausibleStatsWidget: () => <div>Plausible Stats</div>,
}));

vi.mock('../../../../components/ConfirmDialog', () => ({ default: () => null }));

vi.mock('../../../../hooks/useConfirmDialog', () => ({
  default: () => ({
    dialogState: { isOpen: false },
    confirm: vi.fn().mockResolvedValue(false),
    handleConfirm: vi.fn(),
    handleCancel: vi.fn(),
  }),
}));

vi.mock('../../state', async () => {
  const actual = await vi.importActual<typeof DashboardStateModule>('../../state');
  return {
    ...actual,
    fetchDashboards: () => ({ type: 'dashboard/fetchDashboards' }),
    fetchDefaultDashboard: () => ({ type: 'dashboard/fetchDefaultDashboard' }),
    setEditMode: (payload: boolean) => ({ type: 'dashboard/setEditMode', payload }),
    updateLayout: (payload: unknown) => ({ type: 'dashboard/updateLayout', payload }),
    saveDashboardLayout: (payload: unknown) => ({ type: 'dashboard/saveDashboardLayout', payload }),
    addWidget: (payload: unknown) => ({ type: 'dashboard/addWidget', payload }),
    removeWidget: (payload: string) => ({ type: 'dashboard/removeWidget', payload }),
    resetToDefault: () => ({ type: 'dashboard/resetToDefault' }),
  };
});

describe('CustomDashboardPage', () => {
  beforeEach(() => {
    dispatchMock.mockReset();
    dashboardState.dashboard.currentDashboard = null;
    dashboardState.dashboard.dashboards = [];
    dashboardState.dashboard.loading = false;
    dashboardState.dashboard.saving = false;
    dashboardState.dashboard.error = null;
    dashboardState.dashboard.editMode = false;
    dashboardState.auth.isAuthenticated = true;
  });

  it('skips the default-dashboard bootstrap request when one already exists', async () => {
    dispatchMock.mockImplementation((action: { type: string }) => {
      if (action.type === 'dashboard/fetchDashboards') {
        return {
          unwrap: () => Promise.resolve([createDashboard()]),
        };
      }

      if (action.type === 'dashboard/fetchDefaultDashboard') {
        return {
          unwrap: () => Promise.resolve(createDashboard({ id: 'dash-created' })),
        };
      }

      return {
        unwrap: () => Promise.resolve(undefined),
      };
    });

    renderWithProviders(<CustomDashboard />, { route: '/dashboard' });

    await waitFor(() => expect(dispatchMock).toHaveBeenCalledTimes(1));
    expect(dispatchMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: 'dashboard/fetchDashboards' })
    );
    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
  });

  it('bootstraps the default dashboard when the fetched set has no default', async () => {
    dispatchMock.mockImplementation((action: { type: string }) => {
      if (action.type === 'dashboard/fetchDashboards') {
        return {
          unwrap: () => Promise.resolve([createDashboard({ id: 'dash-secondary', is_default: false })]),
        };
      }

      if (action.type === 'dashboard/fetchDefaultDashboard') {
        return {
          unwrap: () => Promise.resolve(createDashboard({ id: 'dash-created' })),
        };
      }

      return {
        unwrap: () => Promise.resolve(undefined),
      };
    });

    renderWithProviders(<CustomDashboard />, { route: '/dashboard' });

    await waitFor(() => expect(dispatchMock).toHaveBeenCalledTimes(2));
    expect(dispatchMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: 'dashboard/fetchDashboards' })
    );
    expect(dispatchMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ type: 'dashboard/fetchDefaultDashboard' })
    );
  });
});
