import type { ReactNode } from 'react';
import { screen, waitFor } from '@testing-library/react';
import { within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Analytics from '../AnalyticsPage';
import { renderWithProviders, createTestStore } from '../../../../test/testUtils';
import api from '../../../../services/api';
import { vi } from 'vitest';
import type {
  AnalyticsSummary,
  DonationTrendPoint,
  VolunteerHoursTrendPoint,
} from '../../../../types/analytics';
import * as exportUtils from '../../../../utils/exportUtils';

vi.mock('../../../../services/api');
vi.mock('../../../../utils/exportUtils', () => ({
  exportAnalyticsSummaryToCSV: vi.fn(),
  exportAnalyticsSummaryToPDF: vi.fn(),
  exportConstituentOverviewToCSV: vi.fn(),
  exportEngagementToCSV: vi.fn(),
  exportDonationTrendsToPDF: vi.fn(),
  exportVolunteerTrendsToPDF: vi.fn(),
}));

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

vi.mock('../../../../components/neo-brutalist/NeoBrutalistLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

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

const renderAnalytics = ({ route = '/analytics' }: { route?: string } = {}) => {
  const store = createTestStore({
    auth: {
      user: {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
      },
      token: 'test-token',
      isAuthenticated: true,
      loading: false,
      error: null,
    },
  });
  renderWithProviders(<Analytics />, { store, route });
  return store;
};

const createDeferred = () => {
  let resolve: (() => void) | null = null;
  const promise = new Promise<void>((innerResolve) => {
    resolve = innerResolve;
  });

  return {
    promise,
    resolve: () => resolve?.(),
  };
};

const setupMocks = (
  options: {
    summary?: AnalyticsSummary | null;
    donationTrends?: DonationTrendPoint[];
    volunteerTrends?: VolunteerHoursTrendPoint[];
    shouldFail?: boolean;
  } = {}
) => {
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

    if (url === '/v2/analytics/summary') {
      return Promise.resolve({ data: summary });
    }
    if (url === '/v2/analytics/trends/donations') {
      return Promise.resolve({ data: donationTrends });
    }
    if (url === '/v2/analytics/trends/volunteer-hours') {
      return Promise.resolve({ data: volunteerTrends });
    }
    return Promise.resolve({ data: null });
  });
};

const getAnalyticsRequests = (url: string) =>
  (api.get as ReturnType<typeof vi.fn>).mock.calls.filter(([requestUrl]) => requestUrl === url);

describe('Analytics page', () => {
  const mockExportAnalyticsSummaryToPDF = vi.mocked(exportUtils.exportAnalyticsSummaryToPDF);
  const mockExportDonationTrendsToPDF = vi.mocked(exportUtils.exportDonationTrendsToPDF);
  const mockExportVolunteerTrendsToPDF = vi.mocked(exportUtils.exportVolunteerTrendsToPDF);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page header and navigation', async () => {
    setupMocks();
    renderAnalytics();

    await waitFor(() => {
      expect(screen.getByText('Analytics & Reports')).toBeInTheDocument();
      expect(screen.getByText('Back')).toBeInTheDocument();
    });
  });

  it('links to the adjacent reports, alerts, and branding workspaces', async () => {
    setupMocks();
    renderAnalytics();

    const relatedWorkspacesSection = screen
      .getByRole('heading', {
        name: /related workspaces/i,
      })
      .closest('section');

    expect(relatedWorkspacesSection).not.toBeNull();

    await waitFor(() => {
      expect(
        within(relatedWorkspacesSection as HTMLElement).getByRole('link', {
          name: /reports home/i,
        })
      ).toHaveAttribute('href', '/reports');
    });

    expect(
      within(relatedWorkspacesSection as HTMLElement).getByRole('link', {
        name: /report builder/i,
      })
    ).toHaveAttribute('href', '/reports/builder');
    expect(
      within(relatedWorkspacesSection as HTMLElement).getByRole('link', {
        name: /alertsreview threshold rules/i,
      })
    ).toHaveAttribute('href', '/alerts');
    expect(
      within(relatedWorkspacesSection as HTMLElement).getByRole('link', {
        name: /branding/i,
      })
    ).toHaveAttribute('href', '/settings/admin/branding');
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
    expect(screen.getAllByText('$75,000').length).toBeGreaterThan(0);
    expect(screen.getByText('150 donations')).toBeInTheDocument();
  });

  it('displays average donation in KPI section', async () => {
    setupMocks();
    renderAnalytics();

    await waitFor(() => {
      expect(screen.getByText('Key Performance Indicators')).toBeInTheDocument();
    });

    const avgDonationElements = screen.getAllByText('Average Donation');
    expect(avgDonationElements.length).toBeGreaterThan(0);

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
      expect(screen.getByRole('button', { name: 'Apply filters' })).toBeInTheDocument();
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

  it('hydrates applied filters and comparison period from the URL', async () => {
    setupMocks();
    renderAnalytics({
      route: '/analytics?start_date=2025-01-01&end_date=2025-03-31&period=year',
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Start Date')).toHaveValue('2025-01-01');
    });

    expect(screen.getByLabelText('End Date')).toHaveValue('2025-03-31');
    expect(getAnalyticsRequests('/v2/analytics/summary').at(-1)?.[1]).toEqual(
      expect.objectContaining({
        params: {
          start_date: '2025-01-01',
          end_date: '2025-03-31',
        },
      })
    );
    expect(getAnalyticsRequests('/v2/analytics/comparative').at(-1)?.[1]).toEqual(
      expect.objectContaining({
        params: {
          period: 'year',
        },
      })
    );
  });

  it('sanitizes invalid URL filters before loading analytics', async () => {
    setupMocks();
    renderAnalytics({
      route: '/analytics?start_date=not-a-date&end_date=2025-03-31&period=weekly',
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Start Date')).toHaveValue('');
    });

    expect(screen.getByLabelText('End Date')).toHaveValue('2025-03-31');
    expect(getAnalyticsRequests('/v2/analytics/summary').at(-1)?.[1]).toEqual(
      expect.objectContaining({
        params: {
          start_date: undefined,
          end_date: '2025-03-31',
        },
      })
    );
    expect(getAnalyticsRequests('/v2/analytics/comparative').at(-1)?.[1]).toEqual(
      expect.objectContaining({
        params: {
          period: 'month',
        },
      })
    );
  });

  it('keeps analytics URL and fetches stable until filters are explicitly applied or cleared', async () => {
    const user = userEvent.setup();
    setupMocks();
    renderAnalytics();

    await waitFor(() => {
      expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
    });

    const initialSummaryRequestCount = getAnalyticsRequests('/v2/analytics/summary').length;

    await user.clear(screen.getByLabelText('Start Date'));
    await user.type(screen.getByLabelText('Start Date'), '2025-01-01');
    await user.clear(screen.getByLabelText('End Date'));
    await user.type(screen.getByLabelText('End Date'), '2025-12-31');

    expect(getAnalyticsRequests('/v2/analytics/summary')).toHaveLength(initialSummaryRequestCount);

    await user.click(screen.getByRole('button', { name: 'Apply filters' }));

    await waitFor(() => {
      expect(getAnalyticsRequests('/v2/analytics/summary')).toHaveLength(
        initialSummaryRequestCount + 1
      );
    });

    expect(getAnalyticsRequests('/v2/analytics/summary').at(-1)?.[1]).toEqual(
      expect.objectContaining({
        params: {
          start_date: '2025-01-01',
          end_date: '2025-12-31',
        },
      })
    );

    await user.click(screen.getByRole('button', { name: 'Clear' }));

    await waitFor(() => {
      expect(getAnalyticsRequests('/v2/analytics/summary')).toHaveLength(
        initialSummaryRequestCount + 2
      );
    });
  });

  it('has export buttons when data is loaded', async () => {
    setupMocks();
    renderAnalytics();

    await waitFor(() => {
      expect(screen.getByText('CSV')).toBeInTheDocument();
    });

    expect(screen.getByText('PDF')).toBeInTheDocument();
  });

  it('shows summary PDF button loading state while export is generating', async () => {
    const user = userEvent.setup();
    const deferred = createDeferred();
    mockExportAnalyticsSummaryToPDF.mockReturnValueOnce(deferred.promise);

    setupMocks();
    renderAnalytics();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'PDF' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'PDF' }));
    expect(screen.getByRole('button', { name: 'Generating PDF...' })).toBeDisabled();

    deferred.resolve();
    await waitFor(() => expect(screen.getByRole('button', { name: 'PDF' })).toBeEnabled());
    expect(mockExportAnalyticsSummaryToPDF).toHaveBeenCalled();
  }, 15000);

  it('shows donation trend PDF loading state while export is generating', async () => {
    const user = userEvent.setup();
    const deferred = createDeferred();
    mockExportDonationTrendsToPDF.mockReturnValueOnce(deferred.promise);

    setupMocks();
    renderAnalytics();

    await waitFor(() => {
      expect(screen.getByText('Donation Trends (12 Months)')).toBeInTheDocument();
    });

    const exportButtons = screen.getAllByTitle('Export to PDF');
    await user.click(exportButtons[0]);

    expect(screen.getByText('Generating...')).toBeInTheDocument();
    expect(exportButtons[0]).toBeDisabled();

    deferred.resolve();
    await waitFor(() => expect(exportButtons[0]).toBeEnabled());
    expect(mockExportDonationTrendsToPDF).toHaveBeenCalled();
  });

  it('shows volunteer trend PDF loading state while export is generating', async () => {
    const user = userEvent.setup();
    const deferred = createDeferred();
    mockExportVolunteerTrendsToPDF.mockReturnValueOnce(deferred.promise);

    setupMocks();
    renderAnalytics();

    await waitFor(() => {
      expect(screen.getByText('Volunteer Hours Trends (12 Months)')).toBeInTheDocument();
    });

    const exportButtons = screen.getAllByTitle('Export to PDF');
    await user.click(exportButtons[1]);

    expect(screen.getByText('Generating...')).toBeInTheDocument();
    expect(exportButtons[1]).toBeDisabled();

    deferred.resolve();
    await waitFor(() => expect(exportButtons[1]).toBeEnabled());
    expect(mockExportVolunteerTrendsToPDF).toHaveBeenCalled();
  });

  it('renders navigation-only analytics calls to action as links', async () => {
    setupMocks();
    renderAnalytics();

    await waitFor(() => {
      expect(screen.getByText('Events calendar')).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: 'Events calendar' })).toHaveAttribute(
      'href',
      '/events'
    );
    expect(screen.getByRole('link', { name: 'Donations list' })).toHaveAttribute(
      'href',
      '/donations'
    );
  });
});
