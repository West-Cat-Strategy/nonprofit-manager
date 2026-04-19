import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import type * as ReactRouterDomModule from 'react-router-dom';
import type * as DashboardDataContextModule from '../../context/DashboardDataContext';
import type * as DashboardStateModule from '../../state';
import { vi } from 'vitest';
import CustomDashboard from '../CustomDashboardPage';

const { dispatchMock, dashboardState, gridLayoutPropsSpy } = vi.hoisted(() => ({
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
  gridLayoutPropsSpy: vi.fn(),
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
  const actual = await vi.importActual<typeof DashboardDataContextModule>(
    '../../../../features/dashboard/context/DashboardDataContext'
  );

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
  Responsive: (props: { children: ReactNode }) => {
    gridLayoutPropsSpy(props);
    return <div>{props.children}</div>;
  },
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

const getLatestGridProps = () =>
  (gridLayoutPropsSpy.mock.calls.at(-1)?.[0] as
    | {
        onLayoutChange?: (layout: unknown, layouts: unknown) => void;
        onDragStop?: (layout: unknown) => void;
        onResizeStop?: (layout: unknown) => void;
      }
    | undefined) ?? {};

describe('CustomDashboardPage', () => {
  beforeEach(() => {
    dispatchMock.mockReset();
    gridLayoutPropsSpy.mockReset();
    dispatchMock.mockImplementation((action: { type: string }) => ({
      unwrap: () =>
        Promise.resolve(action.type === 'dashboard/fetchDashboards' ? [createDashboard()] : undefined),
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

    render(<CustomDashboard />);

    expect(screen.getByText(/saved legacy widget/i)).toBeInTheDocument();
    expect(screen.getByText(/older dashboard layout/i)).toBeInTheDocument();
  });

  it('hides legacy-only widgets from the picker and groups supported widgets', async () => {
    dashboardState.dashboard.editMode = true;
    const user = userEvent.setup();

    render(<CustomDashboard />);

    await user.click(screen.getByRole('button', { name: /add widget/i }));

    expect(screen.getByRole('dialog', { name: /add a widget/i })).toBeInTheDocument();
    expect(screen.getByText('Quick Launch')).toBeInTheDocument();
    expect(screen.getByText('Workload Widgets')).toBeInTheDocument();
    expect(screen.getByText('Upcoming Follow-ups')).toBeInTheDocument();
    expect(screen.queryByText('Recent Contacts')).not.toBeInTheDocument();
    expect(screen.queryByText('Upcoming Events')).not.toBeInTheDocument();
  });

  it('keeps grid edits local until drag stop commits them to Redux', () => {
    dashboardState.dashboard.editMode = true;

    render(<CustomDashboard />);
    dispatchMock.mockClear();

    const nextLayout = [{ i: 'widget-quick-actions', x: 2, y: 1, w: 5, h: 3 }];

    act(() => {
      getLatestGridProps().onLayoutChange?.(nextLayout, {
        lg: nextLayout,
        md: nextLayout,
        sm: nextLayout,
        xs: nextLayout,
      });
    });

    expect(dispatchMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'dashboard/updateLayout' })
    );

    act(() => {
      getLatestGridProps().onDragStop?.(nextLayout);
    });

    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'dashboard/updateLayout',
        payload: nextLayout,
      })
    );
  });

  it('uses the local layout draft when saving before a drag-stop commit', async () => {
    dashboardState.dashboard.editMode = true;
    const user = userEvent.setup();

    render(<CustomDashboard />);
    dispatchMock.mockClear();

    const nextLayout = [{ i: 'widget-quick-actions', x: 3, y: 2, w: 6, h: 4 }];

    act(() => {
      getLatestGridProps().onLayoutChange?.(nextLayout, {
        lg: nextLayout,
        md: nextLayout,
        sm: nextLayout,
        xs: nextLayout,
      });
    });

    await user.click(screen.getByRole('button', { name: /save layout/i }));

    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'dashboard/updateLayout',
        payload: nextLayout,
      })
    );
    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'dashboard/updateDashboard',
        payload: expect.objectContaining({
          id: 'dash-1',
          config: expect.objectContaining({
            layout: nextLayout,
          }),
        }),
      })
    );
  });
});
