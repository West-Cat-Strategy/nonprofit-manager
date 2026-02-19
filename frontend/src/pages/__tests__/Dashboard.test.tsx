import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dashboard from '../Dashboard';
import { renderWithProviders } from '../../test/testUtils';
import { vi } from 'vitest';

const dispatchMock = vi.fn();

const mockState = {
  analytics: {
    summary: { engagement_distribution: { high: 3, medium: 2, low: 1, inactive: 0 } },
    summaryLoading: false,
    error: null,
  },
  cases: { items: [] },
};

vi.mock('../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock('../../store/slices/analyticsSlice', () => ({
  default: (state = { summary: null, summaryLoading: false, error: null }) => state,
  fetchAnalyticsSummary: () => ({ type: 'analytics/fetchSummary' }),
}));

vi.mock('../../store/slices/casesSlice', () => ({
  default: (state = { items: [] }) => state,
  fetchCases: () => ({ type: 'cases/fetch' }),
  selectActiveCases: () => [],
  selectUrgentCases: () => [],
  selectCasesDueThisWeek: () => [],
}));

vi.mock('../../hooks/useDashboardSettings', () => ({
  useDashboardSettings: () => ({
    settings: {
      showQuickLookup: true,
      showQuickActions: true,
      showModules: true,
      showEngagementChart: true,
      showVolunteerWidget: true,
      kpis: {},
    },
    setSettings: vi.fn(),
    resetSettings: vi.fn(),
  }),
}));

vi.mock('../../components/VolunteerWidget', () => ({ default: () => <div>Volunteer Widget</div> }));
vi.mock('../../components/dashboard', () => ({
  QuickLookupWidget: () => <div>Quick Lookup</div>,
  QuickActionsWidget: () => <div>Quick Actions</div>,
  KPISection: () => <div>KPI Section</div>,
  EngagementChart: () => <div>Engagement Chart</div>,
  ModulesGrid: () => <div>Modules Grid</div>,
  PriorityCards: () => <div>Priority Cards</div>,
  DashboardCustomizer: () => <div>Dashboard Customizer</div>,
}));

describe('Dashboard page', () => {
  beforeEach(() => {
    dispatchMock.mockClear();
  });

  it('dispatches dashboard fetch actions on mount', () => {
    renderWithProviders(<Dashboard />);
    expect(dispatchMock).toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('opens customizer panel when edit metrics is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Dashboard />);
    await user.click(screen.getByRole('button', { name: /edit metrics/i }));
    expect(screen.getByText('Dashboard Customizer')).toBeInTheDocument();
  });
});
