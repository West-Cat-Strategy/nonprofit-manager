import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import EventList from '../../../engagement/events/EventList';
import { renderWithProviders } from '../../../../test/testUtils';

const dispatchMock = vi.fn();
const state = {
  events: {
    events: [],
    pagination: { total: 0, page: 1, limit: 20, total_pages: 1 },
    loading: false,
    error: null,
  },
};

vi.mock('../../../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (s: any) => any) => selector(state),
}));

vi.mock('../../../../store/slices/eventsSlice', () => ({
  default: (state = { events: [], pagination: { total: 0, page: 1, limit: 20, total_pages: 1 }, loading: false, error: null }) => state,
  fetchEvents: (payload: any) => ({ type: 'events/fetch', payload }),
}));

vi.mock('../../../../components/neo-brutalist/NeoBrutalistLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));

describe('EventList page', () => {
  it('renders event page and preset filter controls', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EventList />);
    expect(screen.getByRole('heading', { name: 'Events' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Upcoming' }));
    expect(dispatchMock).toHaveBeenCalled();
  });
});
