import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import type * as EventsStateModule from '../../../../features/events/state';
import { vi } from 'vitest';
<<<<<<< HEAD
import EventList from '../../../../features/events/pages/EventsHubPage';
=======
import EventList from '../../../engagement/events/EventList';
>>>>>>> origin/main
import { renderWithProviders } from '../../../../test/testUtils';

const dispatchMock = vi.fn();
const state = {
  eventsList: {
    events: [],
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
    loading: false,
    error: null,
  },
  eventDetail: {
    event: null,
    loading: false,
    error: null,
  },
  eventRegistration: {
    registrations: [],
    loading: false,
    actionLoading: false,
    error: null,
  },
  eventReminders: {
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
  const actual = await importOriginal<typeof EventsStateModule>();
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
    renderWithProviders(<EventList />);

    expect(screen.getByRole('heading', { name: 'Events' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Event' })).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search events...'), {
      target: { value: 'gala' },
    });

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalled();
    });
  });
});
