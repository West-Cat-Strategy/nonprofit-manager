import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TeamMessengerDock from '../components/TeamMessengerDock';
import { renderWithProviders } from '../../../test/testUtils';

const setLauncherOpen = vi.fn();
const startDirectConversation = vi.fn();
const openConversation = vi.fn();
const toggleMinimized = vi.fn();
const closeConversation = vi.fn();
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
  default: ({ roomId }: { roomId: string }) => <div>Panel {roomId}</div>,
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
        unread_count: 2,
        unread_mentions_count: 1,
        counterpart_user_id: 'contact-1',
        counterpart_first_name: 'Taylor',
        counterpart_last_name: 'Member',
        counterpart_email: 'taylor@example.com',
      },
    ],
    enabled: true,
    launcherOpen: true,
    openConversation,
    openRoomIds: ['room-1'],
    selectedRoomId: 'room-1',
    setLauncherOpen,
    startDirectConversation,
    toggleMinimized,
    closeConversation,
    unreadCount: 3,
    visibleRoomIds: ['room-1'],
  }),
}));

describe('TeamMessengerDock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.style.removeProperty('--team-messenger-toast-offset');
  });

  it('renders the launcher, unread badge, and conversation windows', () => {
    renderWithProviders(<TeamMessengerDock />);

    expect(screen.getAllByText('Team Messenger').length).toBeGreaterThan(0);
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Panel room-1').length).toBeGreaterThan(0);
    expect(document.documentElement.style.getPropertyValue('--team-messenger-toast-offset')).toBe('29rem');
  });

  it('starts chats from the launcher and closes open windows', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TeamMessengerDock />);

    await user.selectOptions(screen.getByRole('combobox'), 'contact-1');
    await user.click(screen.getByRole('button', { name: 'Start chat' }));
    expect(startDirectConversation).toHaveBeenCalledWith('contact-1');

    await user.click(screen.getAllByRole('button', { name: 'Close' })[0]);
    expect(closeConversation).toHaveBeenCalledWith('room-1');
  });

  it('disables the launcher while a direct chat is pending and surfaces failures', async () => {
    const user = userEvent.setup();
    const deferred = createDeferred<void>();
    startDirectConversation.mockReturnValueOnce(deferred.promise);

    renderWithProviders(<TeamMessengerDock />);

    await user.selectOptions(screen.getByRole('combobox'), 'contact-1');
    const startButton = screen.getByRole('button', { name: 'Start chat' });

    await user.click(startButton);
    expect(startDirectConversation).toHaveBeenCalledTimes(1);
    expect(startButton).toBeDisabled();

    await user.click(startButton);
    expect(startDirectConversation).toHaveBeenCalledTimes(1);

    await act(async () => {
      deferred.reject(new Error('Unable to start chat'));
      await Promise.resolve();
    });

    await waitFor(() => expect(showError).toHaveBeenCalledWith('Unable to start chat'));
    await waitFor(() => expect(startButton).not.toBeDisabled());
  });
});
