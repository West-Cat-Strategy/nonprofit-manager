import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import PaymentHistory from '../PaymentHistory';
import { renderWithProviders } from '../../test/testUtils';
import api from '../../services/api';

// Mock the API
vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockApi = api as { get: ReturnType<typeof vi.fn> };

describe('PaymentHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('shows loading skeleton while fetching data', async () => {
      mockApi.get.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithProviders(<PaymentHistory contactId="contact-123" />);

      expect(screen.getByText('Payment History')).toBeInTheDocument();
      // Should show loading skeleton (3 placeholder divs)
      const loadingSkeletons = document.querySelectorAll('.animate-pulse .bg-app-surface-muted');
      expect(loadingSkeletons.length).toBe(3);
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no donations exist', async () => {
      mockApi.get.mockResolvedValue({
        data: {
          data: [],
          pagination: { total: 0, page: 1, limit: 5, total_pages: 0 },
          summary: { total_amount: 0, count: 0, average_amount: 0 },
        },
      });

      renderWithProviders(<PaymentHistory contactId="contact-123" />);

      await waitFor(() => {
        expect(screen.getByText('No donations yet')).toBeInTheDocument();
      });

      expect(screen.getByText('Make a Donation')).toBeInTheDocument();
    });

    it('does not fetch data when no contactId or accountId provided', async () => {
      renderWithProviders(<PaymentHistory />);

      await waitFor(() => {
        expect(mockApi.get).not.toHaveBeenCalled();
      });
    });
  });

  describe('With Donations', () => {
    const mockDonations = [
      {
        donation_id: 'don-1',
        donation_number: 'DON-240101-00001',
        amount: 100,
        currency: 'USD',
        donation_date: '2024-01-15T10:00:00Z',
        payment_status: 'completed',
        payment_method: 'credit_card',
        is_recurring: false,
      },
      {
        donation_id: 'don-2',
        donation_number: 'DON-240115-00002',
        amount: 250,
        currency: 'USD',
        donation_date: '2024-01-20T10:00:00Z',
        payment_status: 'pending',
        payment_method: 'bank_transfer',
        is_recurring: true,
      },
      {
        donation_id: 'don-3',
        donation_number: 'DON-240120-00003',
        amount: 50,
        currency: 'USD',
        donation_date: '2024-01-25T10:00:00Z',
        payment_status: 'failed',
        payment_method: 'credit_card',
        is_recurring: false,
      },
    ];

    it('displays donations in a table', async () => {
      mockApi.get.mockResolvedValue({
        data: {
          data: mockDonations,
          pagination: { total: 3, page: 1, limit: 5, total_pages: 1 },
          summary: { total_amount: 400, count: 3, average_amount: 133.33 },
        },
      });

      renderWithProviders(<PaymentHistory contactId="contact-123" />);

      await waitFor(() => {
        expect(screen.getByText('$100')).toBeInTheDocument();
        expect(screen.getByText('$250')).toBeInTheDocument();
        expect(screen.getByText('$50')).toBeInTheDocument();
      });

      // Check status badges
      expect(screen.getByText('completed')).toBeInTheDocument();
      expect(screen.getByText('pending')).toBeInTheDocument();
      expect(screen.getByText('failed')).toBeInTheDocument();

      // Check payment methods (may have duplicates, so use getAllByText)
      expect(screen.getAllByText('credit card').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('bank transfer')).toBeInTheDocument();

      // Check recurring indicator
      expect(screen.getByText('(recurring)')).toBeInTheDocument();
    });

    it('shows total count and amount in header', async () => {
      mockApi.get.mockResolvedValue({
        data: {
          data: mockDonations,
          pagination: { total: 3, page: 1, limit: 5, total_pages: 1 },
          summary: { total_amount: 400, count: 3, average_amount: 133.33 },
        },
      });

      renderWithProviders(<PaymentHistory contactId="contact-123" />);

      await waitFor(() => {
        expect(screen.getByText(/3 donations totaling/)).toBeInTheDocument();
        expect(screen.getByText('$400')).toBeInTheDocument();
      });
    });

    it('shows View All link when showViewAll is true', async () => {
      mockApi.get.mockResolvedValue({
        data: {
          data: mockDonations,
          pagination: { total: 3, page: 1, limit: 5, total_pages: 1 },
          summary: { total_amount: 400, count: 3, average_amount: 133.33 },
        },
      });

      renderWithProviders(<PaymentHistory contactId="contact-123" showViewAll={true} />);

      await waitFor(() => {
        const viewAllLink = screen.getByText('View All');
        expect(viewAllLink).toBeInTheDocument();
        expect(viewAllLink.getAttribute('href')).toBe('/donations?contact_id=contact-123');
      });
    });

    it('shows View links for each donation', async () => {
      mockApi.get.mockResolvedValue({
        data: {
          data: mockDonations,
          pagination: { total: 3, page: 1, limit: 5, total_pages: 1 },
          summary: { total_amount: 400, count: 3, average_amount: 133.33 },
        },
      });

      renderWithProviders(<PaymentHistory contactId="contact-123" />);

      await waitFor(() => {
        const viewLinks = screen.getAllByText('View');
        expect(viewLinks).toHaveLength(3);
      });
    });

    it('shows message when more donations exist than displayed', async () => {
      mockApi.get.mockResolvedValue({
        data: {
          data: mockDonations.slice(0, 2),
          pagination: { total: 10, page: 1, limit: 2, total_pages: 5 },
          summary: { total_amount: 1000, count: 10, average_amount: 100 },
        },
      });

      renderWithProviders(<PaymentHistory contactId="contact-123" limit={2} />);

      await waitFor(() => {
        expect(screen.getByText('Showing 2 of 10 donations')).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('shows error message when API call fails', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockApi.get.mockRejectedValue(new Error('Network error'));

      renderWithProviders(<PaymentHistory contactId="contact-123" />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load payment history')).toBeInTheDocument();
      });

      consoleError.mockRestore();
    });
  });

  describe('API Calls', () => {
    it('calls API with correct parameters for contactId', async () => {
      mockApi.get.mockResolvedValue({
        data: {
          data: [],
          pagination: { total: 0, page: 1, limit: 5, total_pages: 0 },
        },
      });

      renderWithProviders(<PaymentHistory contactId="contact-123" limit={10} />);

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith(
          expect.stringContaining('contact_id=contact-123')
        );
        expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('limit=10'));
        expect(mockApi.get).toHaveBeenCalledWith(
          expect.stringContaining('sort_by=donation_date')
        );
        expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('sort_order=desc'));
      });
    });

    it('calls API with correct parameters for accountId', async () => {
      mockApi.get.mockResolvedValue({
        data: {
          data: [],
          pagination: { total: 0, page: 1, limit: 5, total_pages: 0 },
        },
      });

      renderWithProviders(<PaymentHistory accountId="account-456" />);

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith(
          expect.stringContaining('account_id=account-456')
        );
      });
    });
  });

  describe('Status Badge Styling', () => {
    it('applies correct styling for different payment statuses', async () => {
      const donationsWithAllStatuses = [
        { donation_id: '1', amount: 100, currency: 'USD', donation_date: '2024-01-01', payment_status: 'completed', payment_method: null, is_recurring: false },
        { donation_id: '2', amount: 100, currency: 'USD', donation_date: '2024-01-01', payment_status: 'pending', payment_method: null, is_recurring: false },
        { donation_id: '3', amount: 100, currency: 'USD', donation_date: '2024-01-01', payment_status: 'failed', payment_method: null, is_recurring: false },
        { donation_id: '4', amount: 100, currency: 'USD', donation_date: '2024-01-01', payment_status: 'refunded', payment_method: null, is_recurring: false },
        { donation_id: '5', amount: 100, currency: 'USD', donation_date: '2024-01-01', payment_status: 'cancelled', payment_method: null, is_recurring: false },
      ];

      mockApi.get.mockResolvedValue({
        data: {
          data: donationsWithAllStatuses,
          pagination: { total: 5, page: 1, limit: 10, total_pages: 1 },
          summary: { total_amount: 500, count: 5, average_amount: 100 },
        },
      });

      renderWithProviders(<PaymentHistory contactId="contact-123" />);

      await waitFor(() => {
        expect(screen.getByText('completed')).toHaveClass('bg-green-100');
        expect(screen.getByText('pending')).toHaveClass('bg-yellow-100');
        expect(screen.getByText('failed')).toHaveClass('bg-red-100');
        expect(screen.getByText('refunded')).toHaveClass('bg-purple-100');
        expect(screen.getByText('cancelled')).toHaveClass('bg-app-surface-muted');
      });
    });
  });
});
