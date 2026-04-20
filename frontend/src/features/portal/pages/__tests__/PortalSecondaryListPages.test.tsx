import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import type { PortalNote, PortalReminder } from '../../types/contracts';
import { renderWithProviders } from '../../../../test/testUtils';
import PortalNotesPage from '../PortalNotesPage';
import PortalRemindersPage from '../PortalRemindersPage';

interface MockListState<TItem> {
  items: TItem[];
  total: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  refresh: ReturnType<typeof vi.fn>;
  loadMore: ReturnType<typeof vi.fn>;
}

const notesRefreshMock = vi.fn();
const notesLoadMoreMock = vi.fn();
const remindersRefreshMock = vi.fn();
const remindersLoadMoreMock = vi.fn();

let notesState: MockListState<PortalNote>;
let remindersState: MockListState<PortalReminder>;

vi.mock('../../client/usePortalNotesList', () => ({
  default: () => notesState,
}));

vi.mock('../../client/usePortalRemindersList', () => ({
  default: () => remindersState,
}));

describe('Portal secondary list pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notesState = {
      items: [],
      total: 0,
      hasMore: false,
      loading: false,
      loadingMore: false,
      error: null,
      refresh: notesRefreshMock,
      loadMore: notesLoadMoreMock,
    };
    remindersState = {
      items: [],
      total: 0,
      hasMore: false,
      loading: false,
      loadingMore: false,
      error: null,
      refresh: remindersRefreshMock,
      loadMore: remindersLoadMoreMock,
    };
  });

  it('renders portal notes and loads more results from the hook', async () => {
    const user = userEvent.setup();

    notesState = {
      ...notesState,
      items: [
        {
          id: 'note-1',
          note_type: 'casework',
          subject: 'Housing follow-up',
          content: 'Bring your ID to the next visit.',
          created_at: '2026-04-17T18:00:00.000Z',
        },
      ],
      total: 2,
      hasMore: true,
    };

    renderWithProviders(<PortalNotesPage />);

    expect(screen.getByText('Housing follow-up')).toBeInTheDocument();
    expect(screen.getByText('CASEWORK')).toBeInTheDocument();
    expect(screen.getByText('Bring your ID to the next visit.')).toBeInTheDocument();
    expect(screen.getByText('Showing 1 of 2 results')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /load more notes/i }));

    expect(notesLoadMoreMock).toHaveBeenCalledTimes(1);
  });

  it('retries portal notes failures through the shared page state', async () => {
    const user = userEvent.setup();

    notesState = {
      ...notesState,
      error: 'Unable to load this list right now.',
    };

    renderWithProviders(<PortalNotesPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load this list right now.');

    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(notesRefreshMock).toHaveBeenCalledTimes(1);
  });

  it('renders portal reminders and paginates through the hook', async () => {
    const user = userEvent.setup();

    remindersState = {
      ...remindersState,
      items: [
        {
          id: 'appointment-1',
          type: 'appointment',
          title: 'Case check-in reminder',
          date: '2026-04-18T17:00:00.000Z',
        },
      ],
      total: 3,
      hasMore: true,
    };

    renderWithProviders(<PortalRemindersPage />);

    expect(screen.getByText('Case check-in reminder')).toBeInTheDocument();
    expect(screen.getByText('APPOINTMENT')).toBeInTheDocument();
    expect(screen.getByText('Showing 1 of 3 results')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /load more reminders/i }));

    expect(remindersLoadMoreMock).toHaveBeenCalledTimes(1);
  });

  it('retries portal reminders failures through the shared page state', async () => {
    const user = userEvent.setup();

    remindersState = {
      ...remindersState,
      error: 'Unable to load this list right now.',
    };

    renderWithProviders(<PortalRemindersPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load this list right now.');

    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(remindersRefreshMock).toHaveBeenCalledTimes(1);
  });
});
