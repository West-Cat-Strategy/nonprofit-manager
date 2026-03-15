import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import type * as FinanceStateModule from '../../../../features/finance/state';
import DonationList from '../../../../features/finance/pages/DonationListPage';
import { renderWithProviders } from '../../../../test/testUtils';

const dispatchMock = vi.fn();
const state = {
  donations: {
    donations: [],
    pagination: { total: 0, page: 1, limit: 20, total_pages: 1 },
    totalAmount: 0,
    averageAmount: 0,
    loading: false,
    error: null,
  },
};

vi.mock('../../../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (s: typeof state) => unknown) => selector(state),
}));

vi.mock('../../../../features/finance/state', async (importOriginal) => {
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
});
