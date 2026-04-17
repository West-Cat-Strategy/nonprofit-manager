import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  widgets: [
    {
      id: 'widget-quick-actions',
      type: 'quick_actions',
      title: 'Quick Actions',
      enabled: true,
      layout: { i: 'widget-quick-actions', x: 0, y: 0, w: 4, h: 2 },
    },
  ],
  layout: [{ i: 'widget-quick-actions', x: 0, y: 0, w: 4, h: 2 }],
  breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480 },
  cols: { lg: 12, md: 10, sm: 6, xs: 4 },
  created_at: '2026-03-01T00:00:00.000Z',
  updated_at: '2026-03-01T00:00:00.000Z',
  ...overrides,
});

vi.mock('../../../../features/dashboard/context/DashboardDataContext', async () => {
  const actual = await vi.importActual<
    typeof import('../../../../features/dashboard/context/DashboardDataContext')
  >('../../../../features/dashboard/context/DashboardDataContext');

  return {
    ...actual,
    DashboardDataProvider: ({ children }: { children: ReactNode }) => children,
  };
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

vi.mock('react-grid-layout/legacy', () => ({
  Responsive: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  WidthProvider: (Component: React.ComponentType<{ children?: ReactNode }>) => Component,
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
  UpcomingFollowUpsWidget: () => <div>Upcoming Follow-ups</div>,
  WidgetContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
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
    fetchDashboard: (payload: string) => ({ type: 'dashboard/fetchDashboard', payload }),
    setEditMode: (payload: boolean) => ({ type: 'dashboard/setEditMode', payload }),
    updateLayout: (payload: unknown) => ({ type: 'dashboard/updateLayout', payload }),
    updateDashboard: (payload: unknown) => ({ type: 'dashboard/updateDashboard', payload }),
    addWidget: (payload: unknown) => ({ type: 'dashboard/addWidget', payload }),
    removeWidget: (payload: string) => ({ type: 'dashboard/removeWidget', payload }),
    resetToDefault: () => ({ type: 'dashboard/resetToDefault' }),
  };
});

describe('CustomDashboardPage', () => {
  beforeEach(() => {
    dispatchMock.mockReset();
    dispatchMock.mockImplementation((action: { type: string }) => ({
      unwrap: () => Promise.resolve(action.type === 'dashboard/fetchDashboards' ? [createDashboard()] : undefined),
    }));
    dashboardState.dashboard.currentDashboard = createDashboard();
    dashboardState.dashboard.dashboards = [createDashboard()];
    dashboardState.dashboard.loading = false;
    dashboardState.dashboard.saving = false;
    dashboardState.dashboard.error = null;
    dashboardState.dashboard.editMode = false;
    dashboardState.auth.isAuthenticated = true;
  });

  it('renders a safe fallback for legacy saved widgets', () => {
    dashboardState.dashboard.currentDashboard = createDashboard({
      widgets: [
        {
          id: 'legacy-recent-contacts',
          type: 'recent_contacts',
          title: 'Recent Contacts',
          enabled: true,
          layout: { i: 'legacy-recent-contacts', x: 0, y: 0, w: 4, h: 2 },
        },
      ],
      layout: [{ i: 'legacy-recent-contacts', x: 0, y: 0, w: 4, h: 2 }],
    });

    renderWithProviders(<CustomDashboard />, { route: '/dashboard/custom' });

    expect(screen.getByText(/saved legacy widget/i)).toBeInTheDocument();
    expect(screen.getByText(/older dashboard layout/i)).toBeInTheDocument();
  });

  it('hides legacy-only widgets from the picker and groups supported widgets', async () => {
    dashboardState.dashboard.editMode = true;
    const user = userEvent.setup();

    renderWithProviders(<CustomDashboard />, { route: '/dashboard/custom' });

    await user.click(screen.getByRole('button', { name: /add widget/i }));

    expect(screen.getByRole('dialog', { name: /add a widget/i })).toBeInTheDocument();
    expect(screen.getByText('Quick Launch')).toBeInTheDocument();
    expect(screen.getByText('Workload Widgets')).toBeInTheDocument();
    expect(screen.getByText('Upcoming Follow-ups')).toBeInTheDocument();
    expect(screen.queryByText('Recent Contacts')).not.toBeInTheDocument();
    expect(screen.queryByText('Upcoming Events')).not.toBeInTheDocument();
  });
});
