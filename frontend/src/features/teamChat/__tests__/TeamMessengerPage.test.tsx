import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import TeamMessengerPage from '../pages/TeamMessengerPage';
import { renderWithProviders } from '../../../test/testUtils';

const startDirectConversation = vi.fn();
const createGroupConversation = vi.fn();
const openConversation = vi.fn();
const setSelectedRoomId = vi.fn();
const showError = vi.fn();

const createDeferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

vi.mock('../components/TeamMessengerConversationPanel', () => ({
  default: ({ roomId }: { roomId: string }) => <div>Conversation panel for {roomId}</div>,
}));

vi.mock('../../../contexts/useToast', () => ({
  useToast: () => ({
    showError,
  }),
}));

vi.mock('../messenger/TeamMessengerContext', () => ({
  useTeamMessenger: () => ({
    contacts: [
      {
        user_id: 'contact-1',
        first_name: 'Taylor',
        last_name: 'Member',
        email: 'taylor@example.com',
        role: 'staff',
        presence_status: 'online',
      },
      {
        user_id: 'contact-2',
        first_name: 'Jordan',
        last_name: 'Owner',
        email: 'jordan@example.com',
        role: 'manager',
        presence_status: 'offline',
      },
      {
        user_id: 'contact-3',
        first_name: 'Morgan',
        last_name: 'Helper',
        email: 'morgan@example.com',
        role: 'staff',
        presence_status: 'offline',
      },
    ],
    conversations: [
      {
        room_id: 'room-1',
        room_type: 'direct',
        title: 'Taylor Member',
        status: 'active',
        last_message_at: '2026-03-15T10:00:00.000Z',
        last_message_preview: 'Hello there',
        message_count: 1,
        member_count: 2,
        unread_count: 1,
        unread_mentions_count: 0,
        counterpart_user_id: 'contact-1',
        counterpart_first_name: 'Taylor',
        counterpart_last_name: 'Member',
        counterpart_email: 'taylor@example.com',
      },
    ],
    loading: false,
    openConversation,
    selectedRoomId: null,
    setSelectedRoomId,
    startDirectConversation,
    createGroupConversation,
    streamStatus: 'connected',
    unreadCount: 1,
  }),
}));

describe('TeamMessengerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Team Messenger copy for teammate threads', () => {
    renderWithProviders(<TeamMessengerPage />);

    expect(screen.getByRole('heading', { name: 'Team Messenger' })).toBeInTheDocument();
    expect(
      screen.getByText(/without mixing those notes into client conversations/i)
    ).toBeInTheDocument();
    expect(setSelectedRoomId).toHaveBeenCalledWith('room-1');
  });

  it('starts direct and group conversations from the page controls', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TeamMessengerPage />);

    await user.selectOptions(screen.getByRole('combobox'), 'contact-1');
    await user.click(screen.getByRole('button', { name: 'Message teammate' }));

    expect(startDirectConversation).toHaveBeenCalledWith('contact-1');

    await user.type(screen.getByPlaceholderText('Group name'), 'Coverage Crew');
    await user.selectOptions(screen.getByRole('listbox'), ['contact-1', 'contact-2']);
    await user.click(screen.getByRole('button', { name: 'Create group chat' }));

    expect(createGroupConversation).toHaveBeenCalledWith({
      title: 'Coverage Crew',
      participant_user_ids: ['contact-1', 'contact-2'],
    });
  });

  it('disables the group launcher while pending and surfaces failures', async () => {
    const user = userEvent.setup();
    const deferred = createDeferred<void>();
    createGroupConversation.mockReturnValueOnce(deferred.promise);

    renderWithProviders(<TeamMessengerPage />);

    await user.type(screen.getByPlaceholderText('Group name'), 'Coverage Crew');
    await user.selectOptions(screen.getByRole('listbox'), ['contact-1', 'contact-2']);

    const createButton = screen.getByRole('button', { name: 'Create group chat' });
    await user.click(createButton);

    expect(createGroupConversation).toHaveBeenCalledTimes(1);
    expect(createButton).toBeDisabled();

    await user.click(createButton);
    expect(createGroupConversation).toHaveBeenCalledTimes(1);

    await act(async () => {
      deferred.reject(new Error('Unable to create group conversation'));
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(showError).toHaveBeenCalledWith('Unable to create group conversation')
    );
    await waitFor(() => expect(createButton).not.toBeDisabled());
  });
});
