import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import DonationList from '../../../finance/donations/DonationList';
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
  useAppSelector: (selector: (s: any) => any) => selector(state),
}));

vi.mock('../../../../store/slices/donationsSlice', () => ({
  default: (state = { donations: [], pagination: { total: 0, page: 1, limit: 20, total_pages: 1 }, totalAmount: 0, averageAmount: 0, loading: false, error: null }) => state,
  fetchDonations: (payload: any) => ({ type: 'donations/fetch', payload }),
}));

describe('DonationList page', () => {
  it('renders donation summary and quick filter', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DonationList />);
    expect(screen.getByRole('heading', { name: 'Donations' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Completed' }));
    expect(dispatchMock).toHaveBeenCalled();
  });
});
