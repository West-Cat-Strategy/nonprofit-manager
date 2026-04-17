/**
 * DonationSummaryWidget Tests
 * Tests for donation summary metrics widget
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DonationSummaryWidget from '../DonationSummaryWidget';
import type { DashboardWidget } from '../../../types/dashboard';
import api from '../../../services/api';
import { DashboardDataProvider } from '../../../features/dashboard/context/DashboardDataContext';
import { renderWithProviders } from '../../../test/testUtils';

// Mock the API
vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

const fetchSummaryMock = vi.fn();

vi.mock('../../../features/analytics/api/analyticsApiClient', () => ({
  analyticsApiClient: {
    fetchSummary: (...args: unknown[]) => fetchSummaryMock(...args),
  },
}));

const mockApi = api as { get: ReturnType<typeof vi.fn> };

describe('DonationSummaryWidget', () => {
  const mockWidget: DashboardWidget = {
    id: 'donation-summary-1',
    type: 'donation_summary',
    title: 'Donation Summary',
    position: { x: 0, y: 0, w: 2, h: 1 },
    config: {},
  };

  const mockDonationData = {
    donation_count_ytd: 1234,
    total_donations_ytd: 567890,
    average_donation_ytd: 460,
    engagement_distribution: {
      high: 10,
      medium: 6,
      low: 4,
      inactive: 2,
    },
  };

  const renderWidget = () =>
    render(
      <DonationSummaryWidget widget={mockWidget} editMode={false} onRemove={() => {}} />
    );

  const renderWidgetWithDashboardProvider = () =>
    renderWithProviders(
      <DashboardDataProvider lanes={['analytics']}>
        <DonationSummaryWidget widget={mockWidget} editMode={false} onRemove={() => {}} />
      </DashboardDataProvider>,
      {
        preloadedState: {
          auth: {
            user: {
              id: 'user-1',
              email: 'admin@example.com',
              firstName: 'Admin',
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

  beforeEach(() => {
    vi.clearAllMocks();
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
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      mockApi.get.mockReturnValue(new Promise(() => {}));

      renderWidget();

      expect(screen.getByText('Donation Summary')).toBeInTheDocument();
    });

    it('displays all four metrics', async () => {
      mockApi.get.mockResolvedValue({ data: mockDonationData });

      renderWidget();

      await waitFor(() => {
        expect(screen.getByText('Total Donations')).toBeInTheDocument();
        expect(screen.getByText('Total Amount')).toBeInTheDocument();
        expect(screen.getByText('Avg. Donation')).toBeInTheDocument();
        expect(screen.getByText('Engaged')).toBeInTheDocument();
      });
    });

    it('displays total donations count', async () => {
      mockApi.get.mockResolvedValue({ data: mockDonationData });

      renderWidget();

      await waitFor(() => {
        expect(screen.getByText('1234')).toBeInTheDocument();
      });
    });

    it('displays total amount with currency formatting', async () => {
      mockApi.get.mockResolvedValue({ data: mockDonationData });

      renderWidget();

      await waitFor(() => {
        expect(screen.getByText('$567,890')).toBeInTheDocument();
      });
    });

    it('displays average donation with currency formatting', async () => {
      mockApi.get.mockResolvedValue({ data: mockDonationData });

      renderWidget();

      await waitFor(() => {
        expect(screen.getByText('$460')).toBeInTheDocument();
      });
    });

    it('displays engaged supporters from analytics summary', async () => {
      mockApi.get.mockResolvedValue({ data: mockDonationData });

      renderWidget();

      await waitFor(() => {
        expect(screen.getByText('16')).toBeInTheDocument();
      });
    });
  });

  describe('API Integration', () => {
    it('calls analytics summary API on mount', async () => {
      mockApi.get.mockResolvedValue({ data: mockDonationData });

      renderWidget();

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/v2/analytics/summary');
      });
    });

    it('handles API errors gracefully', async () => {
      mockApi.get.mockRejectedValue(new Error('API Error'));

      renderWidget();

      await waitFor(() => {
        expect(screen.getByText('Error: Failed to load donation data')).toBeInTheDocument();
      });
    });

    it('handles missing data fields with defaults', async () => {
      mockApi.get.mockResolvedValue({ data: {} });

      renderWidget();

      await waitFor(() => {
        expect(screen.getAllByText('0').length).toBeGreaterThan(0);
        expect(screen.getAllByText('$0').length).toBeGreaterThan(0);
      });
    });

    it('uses shared dashboard data when provided and skips the API fetch', async () => {
      fetchSummaryMock.mockResolvedValue(mockDonationData);
      renderWidgetWithDashboardProvider();

      await waitFor(() => {
        expect(screen.getByText('$567,890')).toBeInTheDocument();
        expect(screen.getByText('16')).toBeInTheDocument();
      });

      expect(api.get).not.toHaveBeenCalled();
      expect(fetchSummaryMock).toHaveBeenCalledTimes(1);
    });

    it('surfaces provider loading and error states', async () => {
      fetchSummaryMock.mockRejectedValueOnce(new Error('Analytics unavailable'));
      renderWidgetWithDashboardProvider();

      expect(screen.getByText('Loading…')).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByText('Error: Analytics unavailable')).toBeInTheDocument();
      });
    });
  });

  describe('Formatting', () => {
    it('formats large amounts with commas', async () => {
      mockApi.get.mockResolvedValue({
        data: {
          ...mockDonationData,
          total_donations_ytd: 1234567,
        },
      });

      renderWidget();

      await waitFor(() => {
        expect(screen.getByText('$1,234,567')).toBeInTheDocument();
      });
    });

    it('formats zero amounts correctly', async () => {
      mockApi.get.mockResolvedValue({
        data: {
          donation_count_ytd: 0,
          total_donations_ytd: 0,
          average_donation_ytd: 0,
          engagement_distribution: {
            high: 0,
            medium: 0,
            low: 0,
            inactive: 0,
          },
        },
      });

      renderWidget();

      await waitFor(() => {
        expect(screen.getAllByText('$0').length).toBeGreaterThan(0);
      });
    });

    it('rounds amounts to nearest dollar', async () => {
      mockApi.get.mockResolvedValue({
        data: {
          ...mockDonationData,
          average_donation_ytd: 123.56,
        },
      });

      renderWidget();

      await waitFor(() => {
        expect(screen.getByText('$124')).toBeInTheDocument();
      });
    });
  });

  describe('Grid Layout', () => {
    it('displays metrics in 2x2 grid', async () => {
      mockApi.get.mockResolvedValue({ data: mockDonationData });

      const { container } = renderWidget();

      await waitFor(() => {
        const grid = container.querySelector('.grid-cols-2');
        expect(grid).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles very large numbers', async () => {
      mockApi.get.mockResolvedValue({
        data: {
          donation_count_ytd: 999999,
          total_donations_ytd: 99999999,
          average_donation_ytd: 100,
          engagement_distribution: {
            high: 600,
            medium: 400,
            low: 50,
            inactive: 25,
          },
        },
      });

      renderWidget();

      await waitFor(() => {
        expect(screen.getByText('999999')).toBeInTheDocument();
        expect(screen.getByText('$99,999,999')).toBeInTheDocument();
        expect(screen.getByText('1,000')).toBeInTheDocument();
      });
    });

    it('handles decimal donation counts gracefully', async () => {
      mockApi.get.mockResolvedValue({
        data: {
          ...mockDonationData,
          donation_count_ytd: 123.5, // Shouldn't happen, but handle gracefully
        },
      });

      renderWidget();

      await waitFor(() => {
        expect(screen.getByText('123.5')).toBeInTheDocument();
      });
    });

    it('handles null donation data', async () => {
      mockApi.get.mockResolvedValue({ data: null });

      renderWidget();

      await waitFor(() => {
        expect(screen.getByText('Donation Summary')).toBeInTheDocument();
        expect(screen.getAllByText('$0').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance', () => {
    it('fetches data only once on mount', async () => {
      mockApi.get.mockResolvedValue({ data: mockDonationData });

      const { rerender } = renderWidget();

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(1);
      });

      rerender(
        <DonationSummaryWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      expect(api.get).toHaveBeenCalledTimes(1);
    });
  });
});
