import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DonationTrendsWidget from '../DonationTrendsWidget';
import type { DashboardWidget } from '../../../types/dashboard';
import { DashboardDataContext } from '../../../features/dashboard/context/DashboardDataContext';
import type { DashboardDataContextValue } from '../../../features/dashboard/context/DashboardDataContext';

const fetchDonationTrendsMock = vi.fn();

vi.mock('../../../features/analytics/api/analyticsApiClient', () => ({
  analyticsApiClient: {
    fetchDonationTrends: (...args: unknown[]) => fetchDonationTrendsMock(...args),
  },
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children?: ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({
    children,
    data,
  }: {
    children?: ReactNode;
    data?: Array<{ monthLabel?: string }>;
  }) => <div data-testid="line-chart" data-months={data?.map((point) => point.monthLabel).join('|')}>{children}</div>,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  XAxis: ({ dataKey }: { dataKey?: string }) => <div data-testid="x-axis">{dataKey}</div>,
  YAxis: ({
    tickFormatter,
  }: {
    tickFormatter?: (value: number) => string;
  }) => <div data-testid="y-axis">{tickFormatter ? tickFormatter(1234) : 'no-formatter'}</div>,
  Tooltip: ({
    formatter,
    labelFormatter,
  }: {
    formatter?: (value: number) => [string, string];
    labelFormatter?: (label: string, payload?: Array<{ payload?: { monthHeading?: string } }>) => string;
  }) => (
    <div data-testid="tooltip">
      <span data-testid="tooltip-value">{formatter ? formatter(1234)[0] : 'no-tooltip'}</span>
      <span data-testid="tooltip-label">
        {labelFormatter
          ? labelFormatter('', [{ payload: { monthHeading: 'Mar 2026' } }])
          : 'no-label'}
      </span>
    </div>
  ),
  Line: ({ dataKey, name }: { dataKey?: string; name?: string }) => (
    <div data-testid={`line-${String(dataKey)}`}>{name ?? dataKey}</div>
  ),
}));

describe('DonationTrendsWidget', () => {
  const mockWidget: DashboardWidget = {
    id: 'donation-trends-1',
    type: 'donation_trends',
    title: 'Donation Trends',
    position: { x: 0, y: 0, w: 8, h: 3 },
    config: {},
  };

  const mockTrends = [
    { month: '2026-01', amount: 1800, count: 6 },
    { month: '2026-02', amount: 2400, count: 8 },
    { month: '2026-03', amount: 900, count: 3 },
  ];

  const mockDashboardData = {
    analyticsSummary: null,
    donationTrends: mockTrends,
    caseSummary: null,
    taskSummary: null,
    followUpSummary: null,
    upcomingFollowUps: [],
    assignedCases: [],
    assignedCasesTotal: 0,
    loading: {
      analytics: false,
      donationTrends: false,
      caseSummary: false,
      taskSummary: false,
      followUpSummary: false,
      upcomingFollowUps: false,
      assignedCases: false,
    },
    errors: {},
    hasStartedLoading: true,
  } satisfies DashboardDataContextValue;

  const renderWidget = (contextValue?: DashboardDataContextValue) =>
    render(
      contextValue ? (
        <DashboardDataContext.Provider value={contextValue}>
          <DonationTrendsWidget widget={mockWidget} editMode={false} onRemove={() => {}} />
        </DashboardDataContext.Provider>
      ) : (
        <DonationTrendsWidget widget={mockWidget} editMode={false} onRemove={() => {}} />
      )
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches donation trends in standalone mode and renders chart summaries', async () => {
    fetchDonationTrendsMock.mockResolvedValue(mockTrends);

    renderWidget();

    await waitFor(() => {
      expect(fetchDonationTrendsMock).toHaveBeenCalledWith(12);
      expect(screen.getByText('$5,100')).toBeInTheDocument();
      expect(screen.getByText('17')).toBeInTheDocument();
      expect(screen.getByText('Feb 2026')).toBeInTheDocument();
    });

    expect(screen.getByTestId('line-chart')).toHaveAttribute('data-months', 'Jan|Feb|Mar');
    expect(screen.getByTestId('y-axis')).toHaveTextContent('$1,234');
    expect(screen.getByTestId('tooltip-value')).toHaveTextContent('$1,234');
    expect(screen.getByTestId('tooltip-label')).toHaveTextContent('Mar 2026');
  });

  it('uses provider data and skips standalone fetching', async () => {
    renderWidget(mockDashboardData);

    await waitFor(() => {
      expect(screen.getByText('$5,100')).toBeInTheDocument();
      expect(screen.getByText('17')).toBeInTheDocument();
    });

    expect(fetchDonationTrendsMock).not.toHaveBeenCalled();
  });

  it('shows an empty state when no donation trends are available', async () => {
    fetchDonationTrendsMock.mockResolvedValue([]);

    renderWidget();

    await waitFor(() => {
      expect(screen.getByText('No donation trends available yet')).toBeInTheDocument();
    });
  });

  it('surfaces provider loading and error states through the widget container', () => {
    renderWidget({
      ...mockDashboardData,
      loading: { ...mockDashboardData.loading, donationTrends: true },
      errors: { donationTrends: 'Trend data unavailable' },
    });

    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('shows a standalone fetch error when the analytics request fails', async () => {
    fetchDonationTrendsMock.mockRejectedValue(new Error('API Error'));

    renderWidget();

    await waitFor(() => {
      expect(screen.getByText('Error: Failed to load donation trend data')).toBeInTheDocument();
    });
  });
});
