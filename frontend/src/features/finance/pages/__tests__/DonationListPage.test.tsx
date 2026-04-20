import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import type * as FinanceStateModule from '../../state';
import DonationList from '../DonationListPage';
import { renderWithProviders } from '../../../../test/testUtils';

const dispatchMock = vi.fn();
const fundraiserWorkflowLinks = [
  ['/reports', /reports workspace/i],
  [
    '/reports/templates?category=fundraising&tag=fundraising-cadence',
    /fundraising cadence templates/i,
  ],
  ['/reports/scheduled', /scheduled reports/i],
  ['/opportunities', /opportunity pipeline/i],
  ['/settings/communications', /communications settings/i],
] as const;
const state = {
  finance: {
    donations: {
      donations: [],
      pagination: { total: 0, page: 1, limit: 20, total_pages: 1 },
      totalAmount: 0,
      averageAmount: 0,
      loading: false,
      error: null,
    },
  },
};

vi.mock('../../../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (s: typeof state) => unknown) => selector(state),
}));

vi.mock('../../state', async (importOriginal) => {
  const actual = await importOriginal<typeof FinanceStateModule>();
  return {
    ...actual,
    fetchDonations: (payload: unknown) => ({ type: 'donations/fetch', payload }),
  };
});

describe('DonationList page', () => {
  beforeEach(() => {
    dispatchMock.mockClear();
    localStorage.clear();
  });

  it('renders donation summary and quick filter', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DonationList />);
    expect(screen.getByRole('heading', { name: 'Donations' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /fundraiser workflow/i })).toBeInTheDocument();
    fundraiserWorkflowLinks.forEach(([href, name]) => {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
    });
    await user.click(screen.getByRole('button', { name: 'Completed' }));
    expect(dispatchMock).toHaveBeenCalled();
  });

  it('sanitizes stale local storage filters before dispatching the initial load', () => {
    localStorage.setItem(
      'donations_list_filters_v1',
      JSON.stringify({
        search: 'appeal',
        paymentStatus: 'broken',
        paymentMethod: 'wire',
      })
    );

    renderWithProviders(<DonationList />, { route: '/donations?page=0' });

    expect(dispatchMock).toHaveBeenCalledWith({
      type: 'donations/fetch',
      payload: {
        filters: {
          search: 'appeal',
          payment_status: undefined,
          payment_method: undefined,
        },
        pagination: {
          page: 1,
          limit: 20,
          sort_by: 'donation_date',
          sort_order: 'desc',
        },
      },
    });
  });

  it('renders donation navigation actions as links while keeping receipt actions as buttons', () => {
    state.finance.donations.donations = [
      {
        donation_id: 'don-1',
        donation_number: 'DON-001',
        account_id: null,
        contact_id: null,
        amount: 125,
        currency: 'CAD',
        donation_date: '2026-04-01',
        payment_method: 'credit_card',
        payment_status: 'pending',
        transaction_id: null,
        campaign_name: null,
        designation: null,
        is_recurring: false,
        recurring_frequency: null,
        notes: null,
        receipt_sent: false,
        receipt_sent_date: null,
        created_at: '2026-04-01T00:00:00.000Z',
        updated_at: '2026-04-01T00:00:00.000Z',
        created_by: 'user-1',
        modified_by: 'user-1',
        account_name: 'Northside Mutual Aid',
        official_tax_receipt_id: null,
      },
    ];

    renderWithProviders(<DonationList />);

    expect(screen.getAllByRole('link', { name: 'View' })[0]).toHaveAttribute(
      'href',
      '/donations/don-1'
    );
    expect(screen.getAllByRole('link', { name: 'Edit' })[0]).toHaveAttribute(
      'href',
      '/donations/don-1/edit'
    );
    expect(screen.getAllByRole('button', { name: 'Issue Receipt' }).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0);

    state.finance.donations.donations = [];
  });
});
