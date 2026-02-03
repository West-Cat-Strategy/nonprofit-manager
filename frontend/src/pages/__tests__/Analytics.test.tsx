import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Analytics from '../Analytics';
import analyticsReducer from '../../store/slices/analyticsSlice';
import authReducer from '../../store/slices/authSlice';
import api from '../../services/api';
import { vi } from 'vitest';
import type { AnalyticsSummary, DonationTrendPoint, VolunteerHoursTrendPoint } from '../../types/analytics';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

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

const mockSummary: AnalyticsSummary = {
  total_accounts: 50,
  active_accounts: 35,
  total_contacts: 120,
  active_contacts: 80,
  total_donations_ytd: 75000,
  donation_count_ytd: 150,
  average_donation_ytd: 500,
  total_events_ytd: 12,
  total_volunteers: 25,
  total_volunteer_hours_ytd: 450,
  engagement_distribution: {
    high: 30,
    medium: 45,
    low: 25,
    inactive: 20,
  },
};

const mockDonationTrends: DonationTrendPoint[] = [
  { month: 'Jan 2025', amount: 5000, count: 10 },
  { month: 'Feb 2025', amount: 7500, count: 15 },
  { month: 'Mar 2025', amount: 6000, count: 12 },
];

const mockVolunteerTrends: VolunteerHoursTrendPoint[] = [
  { month: 'Jan 2025', hours: 100, assignments: 10 },
  { month: 'Feb 2025', hours: 150, assignments: 15 },
  { month: 'Mar 2025', hours: 120, assignments: 12 },
];

const createTestStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      analytics: analyticsReducer,
    },
    preloadedState: {
      auth: {
        user: { id: '1', email: 'test@example.com', firstName: 'Test', lastName: 'User', role: 'user' },
        token: 'test-token',
        isAuthenticated: true,
        loading: false,
        error: null,
      },
    },
  });
};

const renderAnalytics = () => {
  const store = createTestStore();
  render(
    <Provider store={store}>
      <MemoryRouter>
        <Analytics />
      </MemoryRouter>
    </Provider>
  );
  return store;
};

const setupMocks = (options: {
  summary?: AnalyticsSummary | null;
  donationTrends?: DonationTrendPoint[];
  volunteerTrends?: VolunteerHoursTrendPoint[];
  shouldFail?: boolean;
} = {}) => {
  const {
    summary = mockSummary,
    donationTrends = mockDonationTrends,
    volunteerTrends = mockVolunteerTrends,
    shouldFail = false,
  } = options;

  const mockGet = api.get as ReturnType<typeof vi.fn>;

  mockGet.mockImplementation((url: string) => {
    if (shouldFail) {
      return Promise.reject(new Error('API Error'));
    }

    if (url === '/analytics/summary') {
      return Promise.resolve({ data: summary });
    }
    if (url === '/analytics/trends/donations') {
      return Promise.resolve({ data: donationTrends });
    }
    if (url === '/analytics/trends/volunteer-hours') {
      return Promise.resolve({ data: volunteerTrends });
    }
    return Promise.resolve({ data: null });
  });
};

describe('Analytics page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page header and navigation', async () => {
    setupMocks();
    renderAnalytics();

    await waitFor(() => {
      expect(screen.getByText('Analytics & Reports')).toBeInTheDocument();
      expect(screen.getByText('← Back')).toBeInTheDocument();
    });
  });

  it('displays loading state initially', async () => {
    const mockGet = api.get as ReturnType<typeof vi.fn>;
    mockGet.mockImplementation(() => new Promise(() => {}));
    renderAnalytics();

    await waitFor(() => {
      expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
    });
  });

  it('displays summary data after loading', async () => {
    setupMocks();
    renderAnalytics();

    await waitFor(() => {
      expect(screen.getByText('Key Performance Indicators')).toBeInTheDocument();
    });

    expect(screen.getByText('Total Donations (YTD)')).toBeInTheDocument();
    // Use getAllByText since the value may appear in multiple places (KPI and summary section)
    expect(screen.getAllByText('$75,000').length).toBeGreaterThan(0);
    expect(screen.getByText('150 donations')).toBeInTheDocument();
  });

  it('displays average donation in KPI section', async () => {
    setupMocks();
    renderAnalytics();

    await waitFor(() => {
      expect(screen.getByText('Key Performance Indicators')).toBeInTheDocument();
    });

    // Check that we have an average donation display - use getAllByText since it may appear multiple times
    const avgDonationElements = screen.getAllByText('Average Donation');
    expect(avgDonationElements.length).toBeGreaterThan(0);

    // Check for the dollar value
    const dollarValues = screen.getAllByText('$500');
    expect(dollarValues.length).toBeGreaterThan(0);
  });

  it('displays active constituents', async () => {
    setupMocks();
    renderAnalytics();

    await waitFor(() => {
      expect(screen.getByText('Active Constituents')).toBeInTheDocument();
    });

    expect(screen.getByText('35 accounts, 80 contacts')).toBeInTheDocument();
  });

  it('displays volunteer metrics', async () => {
    setupMocks();
    renderAnalytics();

    await waitFor(() => {
      expect(screen.getByText('Volunteer Hours (YTD)')).toBeInTheDocument();
    });

    expect(screen.getByText('25 active volunteers')).toBeInTheDocument();
  });

  it('displays engagement distribution chart', async () => {
    setupMocks();
    renderAnalytics();

    await waitFor(() => {
      expect(screen.getByText('Engagement Distribution')).toBeInTheDocument();
    });

    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getAllByText('Inactive').length).toBeGreaterThan(0);
  });

  it('displays constituent overview chart', async () => {
    setupMocks();
    renderAnalytics();

    await waitFor(() => {
      expect(screen.getByText('Constituent Overview')).toBeInTheDocument();
    });
  });

  it('displays activity summary chart', async () => {
    setupMocks();
    renderAnalytics();

    await waitFor(() => {
      expect(screen.getByText('Activity Summary (YTD)')).toBeInTheDocument();
    });
  });

  it('displays donation trends chart', async () => {
    setupMocks();
    renderAnalytics();

    await waitFor(() => {
      expect(screen.getByText('Donation Trends (12 Months)')).toBeInTheDocument();
    });
  });

  it('displays volunteer hours trends chart', async () => {
    setupMocks();
    renderAnalytics();

    await waitFor(() => {
      expect(screen.getByText('Volunteer Hours Trends (12 Months)')).toBeInTheDocument();
    });
  });

  it('displays empty trend data message when no trends', async () => {
    setupMocks({ donationTrends: [], volunteerTrends: [] });
    renderAnalytics();

    await waitFor(() => {
      expect(screen.getByText('No donation trend data available')).toBeInTheDocument();
    });

    expect(screen.getByText('No volunteer hours trend data available')).toBeInTheDocument();
  });

  it('displays accounts card with statistics', async () => {
    setupMocks();
    renderAnalytics();

    await waitFor(() => {
      expect(screen.getByText('Accounts')).toBeInTheDocument();
    });

    expect(screen.getByText('70.0% active')).toBeInTheDocument();
  });

  it('displays contacts card with statistics', async () => {
    setupMocks();
    renderAnalytics();

    await waitFor(() => {
      expect(screen.getByText('Contacts')).toBeInTheDocument();
    });

    expect(screen.getByText('66.7% active')).toBeInTheDocument();
  });

  it('displays volunteers card', async () => {
    setupMocks();
    renderAnalytics();

    await waitFor(() => {
      expect(screen.getByText('Volunteers')).toBeInTheDocument();
    });

    expect(screen.getByText('Registered')).toBeInTheDocument();
  });

  it('displays events summary section', async () => {
    setupMocks();
    renderAnalytics();

    await waitFor(() => {
      expect(screen.getByText('Events Summary')).toBeInTheDocument();
    });

    expect(screen.getByText('Total Events (YTD)')).toBeInTheDocument();
  });

  it('displays donations summary section', async () => {
    setupMocks();
    renderAnalytics();

    await waitFor(() => {
      expect(screen.getByText('Donations Summary')).toBeInTheDocument();
    });

    expect(screen.getByText('Total Amount (YTD)')).toBeInTheDocument();
    expect(screen.getByText('Number of Donations')).toBeInTheDocument();
  });

  it('has date filter inputs', async () => {
    setupMocks();
    renderAnalytics();

    await waitFor(() => {
      expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
      expect(screen.getByLabelText('End Date')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Apply Filters' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
    });
  });

  it('allows entering date filter values', async () => {
    const user = userEvent.setup();
    setupMocks();
    renderAnalytics();

    const startDateInput = screen.getByLabelText('Start Date');
    const endDateInput = screen.getByLabelText('End Date');

    await user.type(startDateInput, '2025-01-01');
    await user.type(endDateInput, '2025-12-31');

    expect(startDateInput).toHaveValue('2025-01-01');
    expect(endDateInput).toHaveValue('2025-12-31');
  });

  it('has export buttons when data is loaded', async () => {
    setupMocks();
    renderAnalytics();

    await waitFor(() => {
      expect(screen.getByText('CSV')).toBeInTheDocument();
    });

    expect(screen.getByText('PDF')).toBeInTheDocument();
  });

  it('navigates back when back button is clicked', async () => {
    const user = userEvent.setup();
    setupMocks();
    renderAnalytics();

    await user.click(screen.getByText('← Back'));

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('navigates to events module when link is clicked', async () => {
    const user = userEvent.setup();
    setupMocks();
    renderAnalytics();

    await waitFor(() => {
      expect(screen.getByText('Events module')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Events module'));

    expect(mockNavigate).toHaveBeenCalledWith('/events');
  });

  it('navigates to donations module when link is clicked', async () => {
    const user = userEvent.setup();
    setupMocks();
    renderAnalytics();

    await waitFor(() => {
      expect(screen.getByText('Donations module')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Donations module'));

    expect(mockNavigate).toHaveBeenCalledWith('/donations');
  });
});
