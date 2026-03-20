import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TeamMessengerConversationPanel from '../components/TeamMessengerConversationPanel';

const sendMessage = vi.fn();
const markConversationRead = vi.fn();
const retryMessage = vi.fn();
const addConversationMember = vi.fn();
const removeConversationMember = vi.fn();
const updateConversation = vi.fn();
const updateTyping = vi.fn();
const clearDraft = vi.fn();
const setDraft = vi.fn();
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

vi.mock('../../../store/hooks', () => ({
  useAppSelector: (selector: (state: {
    auth: {
      user: {
        id: string;
        firstName: string;
        lastName: string;
        role: string;
      };
    };
  }) => unknown) =>
    selector({
      auth: {
        user: {
          id: 'user-1',
          firstName: 'Casey',
          lastName: 'Worker',
          role: 'staff',
        },
      },
    }),
}));

vi.mock('../../../contexts/useToast', () => ({
  useToast: () => ({
    showError,
  }),
}));

vi.mock('../../messaging/drafts', () => ({
  usePersistedMessageDraft: () => ({
    draft: 'Hello team',
    setDraft,
    clearDraft,
  }),
}));

vi.mock('../messenger/TeamMessengerContext', () => ({
  useTeamMessenger: () => ({
    contacts: [],
    conversationDetails: {
      'room-1': {
        room: {
          room_id: 'room-1',
          room_type: 'direct',
          title: 'Taylor Member',
          status: 'active',
          last_message_at: '2026-03-15T10:00:00.000Z',
          last_message_preview: null,
          message_count: 0,
          member_count: 2,
          unread_count: 0,
          unread_mentions_count: 0,
          counterpart_user_id: 'contact-1',
          counterpart_first_name: 'Taylor',
          counterpart_last_name: 'Member',
          counterpart_email: 'taylor@example.com',
        },
        members: [],
        messages: [],
      },
    },
    getPresenceStatus: () => 'offline',
    addConversationMember,
    markConversationRead,
    removeConversationMember,
    retryMessage,
    sendMessage,
    typingByRoomId: {},
    updateConversation,
    updateTyping,
  }),
}));

describe('TeamMessengerConversationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('disables the composer while sending and shows a toast on failure', async () => {
    const user = userEvent.setup();
    const deferred = createDeferred<void>();
    sendMessage.mockReturnValueOnce(deferred.promise);

    render(<TeamMessengerConversationPanel roomId="room-1" mode="page" />);

    const textarea = screen.getByPlaceholderText('Write a message...');
    const sendButton = screen.getByRole('button', { name: 'Send' });

    await user.click(sendButton);

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendButton).toBeDisabled();

    await user.click(sendButton);
    await user.click(textarea);
    await user.keyboard('{Enter}');
    expect(sendMessage).toHaveBeenCalledTimes(1);

    await act(async () => {
      deferred.reject(new Error('Unable to send message'));
      await Promise.resolve();
    });

    await waitFor(() => expect(showError).toHaveBeenCalledWith('Unable to send message'));
    await waitFor(() => expect(sendButton).not.toBeDisabled());
    expect(clearDraft).not.toHaveBeenCalled();
  });
});
