import type * as ReactRouterDom from 'react-router-dom';
import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { vi } from 'vitest';
import NeoBrutalistDashboard from '../NeoBrutalistDashboardPage';
import api from '../../../../services/api';
import { renderWithProviders, createTestStore } from '../../../../test/testUtils';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouterDom>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../../services/api');
vi.mock('../../../../features/dashboard/context/DashboardDataContext', () => ({
  DashboardDataProvider: ({ children }: { children: ReactNode }) => children,
  useDashboardData: () => ({
    analyticsSummary: {
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
    },
    caseSummary: {
      total_cases: 12,
      open_cases: 8,
      closed_cases: 4,
      by_priority: { low: 1, medium: 3, high: 2, urgent: 2 },
      by_status_type: { intake: 1, active: 5, review: 1, closed: 4, cancelled: 1 },
      by_case_type: {},
      cases_due_this_week: 3,
      overdue_cases: 1,
      unassigned_cases: 2,
    },
    taskSummary: {
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
    },
    followUpSummary: {
      total: 6,
      scheduled: 4,
      completed: 1,
      cancelled: 1,
      overdue: 1,
      due_today: 2,
      due_this_week: 3,
    },
    upcomingFollowUps: [],
    assignedCases: [
      {
        id: 'case-1',
        case_number: 'CASE-1',
        title: 'Review intake',
        priority: 'high',
        is_urgent: false,
        due_date: null,
      },
    ],
    assignedCasesTotal: 1,
    loading: {
      analytics: false,
      caseSummary: false,
      taskSummary: false,
      followUpSummary: false,
      upcomingFollowUps: false,
      assignedCases: false,
    },
    errors: {},
    hasStartedLoading: true,
  }),
}));
vi.mock('../../../../hooks/useDashboardSettings', () => ({
  useDashboardSettings: () => ({
    settings: {
      showWorkspaceSummary: true,
      showQuickLookup: true,
      showQuickActions: true,
      showFocusQueue: true,
      showPinnedWorkstreams: true,
      showModules: true,
      showInsightStrip: true,
    },
    setSettings: vi.fn(),
    resetSettings: vi.fn(),
    isLoading: false,
  }),
}));
vi.mock('../../../../hooks/useNavigationPreferences', () => ({
  useNavigationPreferences: () => ({
    pinnedItems: [
      {
        id: 'cases',
        name: 'Cases',
        path: '/cases',
        icon: '📋',
        enabled: true,
        pinned: true,
        isCore: false,
        shortLabel: 'Cases',
        ariaLabel: 'Cases',
      },
    ],
    enabledItems: [
      {
        id: 'dashboard',
        name: 'Dashboard',
        path: '/dashboard',
        icon: '📊',
        enabled: true,
        pinned: false,
        isCore: true,
        shortLabel: 'Home',
        ariaLabel: 'Dashboard',
      },
      {
        id: 'cases',
        name: 'Cases',
        path: '/cases',
        icon: '📋',
        enabled: true,
        pinned: true,
        isCore: false,
        shortLabel: 'Cases',
        ariaLabel: 'Cases',
      },
      {
        id: 'contacts',
        name: 'People',
        path: '/contacts',
        icon: '👤',
        enabled: true,
        pinned: false,
        isCore: false,
        shortLabel: 'People',
        ariaLabel: 'People',
      },
      {
        id: 'events',
        name: 'Events',
        path: '/events',
        icon: '📅',
        enabled: true,
        pinned: false,
        isCore: false,
        shortLabel: 'Events',
        ariaLabel: 'Events',
      },
    ],
  }),
}));
vi.mock('../../../../components/dashboard', () => ({
  QuickActionsWidget: () => <section>Quick Actions Widget</section>,
  QuickLookupWidget: () => <section>Quick Lookup Widget</section>,
}));

describe('NeoBrutalistDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the hybrid workbench without issuing startup API requests from the page shell', () => {
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

    renderWithProviders(<NeoBrutalistDashboard />, { store, route: '/dashboard' });

    expect(screen.getByRole('heading', { name: /workbench overview/i })).toBeInTheDocument();
    expect(screen.getByText('Workspace Summary')).toBeInTheDocument();
    expect(screen.getByText('Focus Queue')).toBeInTheDocument();
    expect(screen.getByText('Pinned Shortcuts')).toBeInTheDocument();
    expect(screen.getByText('Enabled Workstreams')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create intake/i })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /customize layout/i })).not.toHaveLength(0);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('opens the view settings panel from the query string', () => {
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

    renderWithProviders(<NeoBrutalistDashboard />, { store, route: '/dashboard?panel=settings' });

    expect(screen.getByRole('region', { name: /dashboard view settings/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/focus queue/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/insight strip/i)).toBeInTheDocument();
  });
});
