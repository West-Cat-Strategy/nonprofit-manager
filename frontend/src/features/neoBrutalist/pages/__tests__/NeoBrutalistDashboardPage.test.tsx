import type * as ReactRouterDom from 'react-router-dom';
import { screen } from '@testing-library/react';
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
vi.mock('../../../../hooks/useDashboardSettings', () => ({
  useDashboardSettings: () => ({
    settings: {
      showWorkspaceSummary: true,
      showQuickLookup: true,
      showQuickActions: true,
      showPinnedWorkstreams: true,
      showModules: true,
      showEngagementChart: true,
      showVolunteerWidget: true,
      kpis: {
        totalDonations: true,
        avgDonation: true,
        activeAccounts: true,
        activeContacts: true,
        activeCases: true,
        volunteers: true,
        volunteerHours: true,
        events: true,
        engagement: true,
      },
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
  DashboardCustomizer: () => <div>Dashboard Customizer</div>,
  QuickActionsWidget: () => <section>Quick Actions Widget</section>,
  QuickLookupWidget: () => <section>Quick Lookup Widget</section>,
}));

describe('NeoBrutalistDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not fetch analytics/task summaries on initial render', () => {
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
    expect(screen.getByText('Today at a Glance')).toBeInTheDocument();
    expect(screen.getByText('Pinned Shortcuts')).toBeInTheDocument();
    expect(screen.getByText('Enabled Workstreams')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create intake/i })).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });
});
