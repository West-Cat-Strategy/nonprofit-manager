import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { vi } from 'vitest';
import EventList from '../../../engagement/events/EventList';
import { renderWithProviders } from '../../../../test/testUtils';

const dispatchMock = vi.fn();
const state = {
  eventsListV2: {
    events: [],
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
    loading: false,
    error: null,
  },
  eventDetailV2: {
    event: null,
    loading: false,
    error: null,
  },
  eventRegistrationV2: {
    registrations: [],
    loading: false,
    actionLoading: false,
    error: null,
  },
  eventRemindersV2: {
    sending: false,
    lastSummary: null,
    error: null,
  },
};

vi.mock('../../../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (s: typeof state) => unknown) => selector(state),
}));

vi.mock('../../../../features/events/state', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../features/events/state')>();
  return {
    ...actual,
    fetchEventsListV2: (payload: unknown) => ({ type: 'eventsListV2/fetch', payload }),
  };
});

vi.mock('../../../../components/neo-brutalist/NeoBrutalistLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

describe('EventList page', () => {
  it('renders events hub and dispatches list fetch on search update', async () => {
    const user = userEvent.setup();

    renderWithProviders(<EventList />);

    expect(screen.getByRole('heading', { name: 'Events' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Event' })).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Search events...'), 'gala');

    expect(dispatchMock).toHaveBeenCalled();
  });
});
