import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import TeamMessengerPage from '../pages/TeamMessengerPage';
import { renderWithProviders } from '../../../test/testUtils';

const startDirectConversation = vi.fn();
const createGroupConversation = vi.fn();
const openConversation = vi.fn();
const setSelectedRoomId = vi.fn();

vi.mock('../components/TeamMessengerConversationPanel', () => ({
  default: ({ roomId }: { roomId: string }) => <div>Conversation panel for {roomId}</div>,
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

  it('renders Team Messenger copy distinct from case and portal chat surfaces', () => {
    renderWithProviders(<TeamMessengerPage />);

    expect(screen.getByRole('heading', { name: 'Team Messenger' })).toBeInTheDocument();
    expect(
      screen.getByText(/kept distinct from Case Chat and Portal Conversations/i)
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
});
