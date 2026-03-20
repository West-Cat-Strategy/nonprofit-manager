import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CaseTeamChatPanel from '../components/CaseTeamChatPanel';

const sendMessage = vi.fn();
const clearDraft = vi.fn();
const setPersistedDraft = vi.fn();
const showError = vi.fn();
const showSuccess = vi.fn();

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
          role: 'admin',
        },
      },
    }),
}));

vi.mock('../../../contexts/useToast', () => ({
  useToast: () => ({
    showError,
    showSuccess,
  }),
}));

vi.mock('../../messaging/drafts', () => ({
  usePersistedMessageDraft: () => ({
    draft: 'Hello case team',
    setDraft: setPersistedDraft,
    clearDraft,
  }),
}));

vi.mock('../hooks/useTeamChatCaseChat', () => ({
  useTeamChatCaseChat: () => ({
    room: {
      room_id: 'room-1',
      case_id: 'case-1',
      case_number: 'CASE-1',
      case_title: 'Case 1',
      status: 'active',
      last_message_at: '2026-03-15T10:00:00.000Z',
      last_message_preview: null,
      message_count: 0,
      member_count: 1,
      unread_count: 0,
      unread_mentions_count: 0,
    },
    members: [
      {
        room_id: 'room-1',
        user_id: 'user-1',
        membership_role: 'owner',
        source: 'manual',
        joined_at: '2026-03-15T10:00:00.000Z',
        last_read_at: null,
        last_read_message_id: null,
        muted: false,
        first_name: 'Casey',
        last_name: 'Worker',
        email: 'casey@example.com',
      },
    ],
    messages: [],
    loading: false,
    sending: true,
    error: null,
    streamStatus: 'connected',
    refresh: vi.fn(),
    pollLatestMessages: vi.fn(),
    loadOlderMessages: vi.fn(),
    sendMessage,
    retryMessage: vi.fn(),
    markRead: vi.fn(),
    addMember: vi.fn(),
    removeMember: vi.fn(),
  }),
}));

describe('CaseTeamChatPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('disables case chat submission while a send is in flight', async () => {
    const user = userEvent.setup();

    render(<CaseTeamChatPanel caseId="case-1" />);

    const textarea = screen.getByPlaceholderText('Write a message...');
    const sendButton = screen.getByRole('button', { name: 'Sending...' });

    expect(sendButton).toBeDisabled();

    await user.click(textarea);
    await user.keyboard('{Enter}');

    expect(sendMessage).not.toHaveBeenCalled();
    expect(clearDraft).not.toHaveBeenCalled();
    expect(showError).not.toHaveBeenCalled();
  });
});
