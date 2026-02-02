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

// Mock the API
vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('DonationSummaryWidget', () => {
  const mockWidget: DashboardWidget = {
    id: 'donation-summary-1',
    type: 'donation_summary',
    title: 'Donation Summary',
    position: { x: 0, y: 0, w: 2, h: 1 },
    config: {},
  };

  const mockDonationData = {
    total_donations: 1234,
    total_donation_amount: 567890,
    average_donation: 460,
    donations_month_over_month: 15.5,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      (api.get as any).mockResolvedValue({ data: mockDonationData });

      render(
        <DonationSummaryWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      expect(screen.getByText('Donation Summary')).toBeInTheDocument();
    });

    it('displays all four metrics', async () => {
      (api.get as any).mockResolvedValue({ data: mockDonationData });

      render(
        <DonationSummaryWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Total Donations')).toBeInTheDocument();
        expect(screen.getByText('Total Amount')).toBeInTheDocument();
        expect(screen.getByText('Avg. Donation')).toBeInTheDocument();
        expect(screen.getByText('MoM Change')).toBeInTheDocument();
      });
    });

    it('displays total donations count', async () => {
      (api.get as any).mockResolvedValue({ data: mockDonationData });

      render(
        <DonationSummaryWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('1234')).toBeInTheDocument();
      });
    });

    it('displays total amount with currency formatting', async () => {
      (api.get as any).mockResolvedValue({ data: mockDonationData });

      render(
        <DonationSummaryWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('$567,890')).toBeInTheDocument();
      });
    });

    it('displays average donation with currency formatting', async () => {
      (api.get as any).mockResolvedValue({ data: mockDonationData });

      render(
        <DonationSummaryWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('$460')).toBeInTheDocument();
      });
    });

    it('displays month-over-month change with percentage', async () => {
      (api.get as any).mockResolvedValue({ data: mockDonationData });

      render(
        <DonationSummaryWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('+15.5%')).toBeInTheDocument();
      });
    });
  });

  describe('API Integration', () => {
    it('calls analytics summary API on mount', async () => {
      (api.get as any).mockResolvedValue({ data: mockDonationData });

      render(
        <DonationSummaryWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/analytics/summary');
      });
    });

    it('handles API errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      (api.get as any).mockRejectedValue(new Error('API Error'));

      render(
        <DonationSummaryWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      await waitFor(() => {
        // Error state should be shown through WidgetContainer
      });

      consoleError.mockRestore();
    });

    it('handles missing data fields with defaults', async () => {
      (api.get as any).mockResolvedValue({ data: {} });

      render(
        <DonationSummaryWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      await waitFor(() => {
        // Should display 0 for missing values
        expect(screen.getByText('0')).toBeInTheDocument();
        expect(screen.getByText('$0')).toBeInTheDocument();
      });
    });
  });

  describe('Currency Formatting', () => {
    it('formats large amounts with commas', async () => {
      (api.get as any).mockResolvedValue({
        data: {
          ...mockDonationData,
          total_donation_amount: 1234567,
        },
      });

      render(
        <DonationSummaryWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('$1,234,567')).toBeInTheDocument();
      });
    });

    it('formats zero amounts correctly', async () => {
      (api.get as any).mockResolvedValue({
        data: {
          total_donations: 0,
          total_donation_amount: 0,
          average_donation: 0,
          donations_month_over_month: 0,
        },
      });

      render(
        <DonationSummaryWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('$0')).toBeInTheDocument();
      });
    });

    it('rounds amounts to nearest dollar', async () => {
      (api.get as any).mockResolvedValue({
        data: {
          ...mockDonationData,
          average_donation: 123.56,
        },
      });

      render(
        <DonationSummaryWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      await waitFor(() => {
        // Should round to $124
        expect(screen.getByText('$124')).toBeInTheDocument();
      });
    });
  });

  describe('Percentage Formatting', () => {
    it('shows positive change with plus sign', async () => {
      (api.get as any).mockResolvedValue({
        data: {
          ...mockDonationData,
          donations_month_over_month: 25.3,
        },
      });

      render(
        <DonationSummaryWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('+25.3%')).toBeInTheDocument();
      });
    });

    it('shows negative change without extra minus sign', async () => {
      (api.get as any).mockResolvedValue({
        data: {
          ...mockDonationData,
          donations_month_over_month: -12.5,
        },
      });

      render(
        <DonationSummaryWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('-12.5%')).toBeInTheDocument();
      });
    });

    it('shows zero change correctly', async () => {
      (api.get as any).mockResolvedValue({
        data: {
          ...mockDonationData,
          donations_month_over_month: 0,
        },
      });

      render(
        <DonationSummaryWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('+0.0%')).toBeInTheDocument();
      });
    });

    it('applies green color for positive change', async () => {
      (api.get as any).mockResolvedValue({
        data: {
          ...mockDonationData,
          donations_month_over_month: 15.5,
        },
      });

      render(
        <DonationSummaryWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      await waitFor(() => {
        const changeElement = screen.getByText('+15.5%');
        expect(changeElement).toHaveClass('text-green-600');
      });
    });

    it('applies red color for negative change', async () => {
      (api.get as any).mockResolvedValue({
        data: {
          ...mockDonationData,
          donations_month_over_month: -8.2,
        },
      });

      render(
        <DonationSummaryWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      await waitFor(() => {
        const changeElement = screen.getByText('-8.2%');
        expect(changeElement).toHaveClass('text-red-600');
      });
    });

    it('applies green color for zero change', async () => {
      (api.get as any).mockResolvedValue({
        data: {
          ...mockDonationData,
          donations_month_over_month: 0,
        },
      });

      render(
        <DonationSummaryWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      await waitFor(() => {
        const changeElement = screen.getByText('+0.0%');
        expect(changeElement).toHaveClass('text-green-600');
      });
    });
  });

  describe('Grid Layout', () => {
    it('displays metrics in 2x2 grid', async () => {
      (api.get as any).mockResolvedValue({ data: mockDonationData });

      const { container } = render(
        <DonationSummaryWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      await waitFor(() => {
        const grid = container.querySelector('.grid-cols-2');
        expect(grid).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles very large numbers', async () => {
      (api.get as any).mockResolvedValue({
        data: {
          total_donations: 999999,
          total_donation_amount: 99999999,
          average_donation: 100,
          donations_month_over_month: 999.9,
        },
      });

      render(
        <DonationSummaryWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('999999')).toBeInTheDocument();
        expect(screen.getByText('$99,999,999')).toBeInTheDocument();
        expect(screen.getByText('+999.9%')).toBeInTheDocument();
      });
    });

    it('handles decimal donation counts gracefully', async () => {
      (api.get as any).mockResolvedValue({
        data: {
          ...mockDonationData,
          total_donations: 123.5, // Shouldn't happen, but handle gracefully
        },
      });

      render(
        <DonationSummaryWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('123.5')).toBeInTheDocument();
      });
    });

    it('handles null donation data', async () => {
      (api.get as any).mockResolvedValue({ data: null });

      render(
        <DonationSummaryWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      // Should not crash
      expect(screen.getByText('Donation Summary')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('fetches data only once on mount', async () => {
      (api.get as any).mockResolvedValue({ data: mockDonationData });

      const { rerender } = render(
        <DonationSummaryWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

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
