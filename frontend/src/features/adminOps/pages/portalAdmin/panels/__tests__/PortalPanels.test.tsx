import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PortalSectionProps } from '../../../adminSettings/sections/PortalSection';
import PortalSection from '../../../adminSettings/sections/PortalSection';
import AccessPanel from '../AccessPanel';
import AppointmentsPanel from '../AppointmentsPanel';
import ConversationsPanel from '../ConversationsPanel';
import SlotsPanel from '../SlotsPanel';
import UsersPanel from '../UsersPanel';

const createBaseProps = (): Omit<PortalSectionProps, 'visiblePanels'> => ({
  portalInviteUrl: null,
  portalLoading: false,
  portalRequests: [],
  portalInviteEmail: '',
  portalContactSearch: '',
  portalContactLoading: false,
  portalContactResults: [],
  selectedPortalContact: null,
  portalInvitations: [],
  portalUsers: [],
  portalUsersLoading: false,
  portalUserSearch: '',
  selectedPortalUser: null,
  portalUserActivity: [],
  portalActivityLoading: false,
  formError: null,
  onRefreshPortal: vi.fn(),
  onApproveRequest: vi.fn(),
  onRejectRequest: vi.fn(),
  onPortalInviteEmailChange: vi.fn(),
  onPortalContactSearchChange: vi.fn(),
  onSelectPortalContact: vi.fn(),
  onClearPortalContact: vi.fn(),
  onCreateInvitation: vi.fn(),
  onPortalUserSearchChange: vi.fn(),
  onRefreshUsers: vi.fn(),
  onViewUserActivity: vi.fn(),
  onToggleUserStatus: vi.fn(),
  onOpenResetModal: vi.fn(),
  portalStreamStatus: 'disabled',
  portalConversationFilters: {
    status: 'all',
    caseId: '',
    pointpersonUserId: '',
    search: '',
  },
  onPortalConversationFilterChange: vi.fn(),
  portalConversationsLoading: false,
  portalConversationsLoadingMore: false,
  portalConversationsHasMore: false,
  portalConversations: [],
  selectedPortalConversation: null,
  portalConversationReply: '',
  portalConversationReplyInternal: false,
  portalConversationReplyLoading: false,
  onRefreshPortalConversations: vi.fn(),
  onLoadMorePortalConversations: vi.fn(),
  onOpenPortalConversation: vi.fn(),
  onPortalConversationReplyChange: vi.fn(),
  onPortalConversationReplyInternalChange: vi.fn(),
  onSendPortalConversationReply: vi.fn(),
  onRetryPortalConversationReply: vi.fn(),
  onUpdatePortalConversationStatus: vi.fn(),
  portalSlotFilters: {
    status: 'all',
    caseId: '',
    pointpersonUserId: '',
    from: '',
    to: '',
  },
  onPortalSlotFilterChange: vi.fn(),
  portalSlotsLoading: false,
  portalSlotsLoadingMore: false,
  portalSlotsHasMore: false,
  portalSlots: [],
  portalSlotSaving: false,
  portalSlotForm: {
    pointperson_user_id: '',
    case_id: '',
    title: '',
    details: '',
    location: '',
    start_time: '',
    end_time: '',
    capacity: 1,
  },
  onPortalSlotFormChange: vi.fn(),
  onCreatePortalSlot: vi.fn(),
  onRefreshPortalSlots: vi.fn(),
  onLoadMorePortalSlots: vi.fn(),
  onUpdatePortalSlotStatus: vi.fn(),
  onDeletePortalSlot: vi.fn(),
  portalAppointments: [],
  portalAppointmentsLoading: false,
  portalAppointmentsPagination: {
    page: 1,
    limit: 25,
    total: 0,
    total_pages: 1,
  },
  portalAppointmentFilters: {
    status: 'all',
    requestType: 'all',
    caseId: '',
    pointpersonUserId: '',
    dateFrom: '',
    dateTo: '',
  },
  onPortalAppointmentFilterChange: vi.fn(),
  onPortalAppointmentPageChange: vi.fn(),
  onRefreshPortalAppointments: vi.fn(),
  onPortalAppointmentStatusChange: vi.fn(),
  onPortalAppointmentCheckIn: vi.fn(),
  selectedPortalAppointmentId: null,
  portalAppointmentReminders: null,
  portalAppointmentRemindersLoading: false,
  portalAppointmentActionLoading: false,
  onPortalAppointmentReminderHistory: vi.fn(),
  portalReminderCustomMessage: '',
  onPortalReminderCustomMessageChange: vi.fn(),
  onPortalSendAppointmentReminder: vi.fn(),
});

describe('portal admin panels', () => {
  it.each([
    ['Client Portal Access', AccessPanel],
    ['Portal Users', UsersPanel],
    ['Portal Conversations', ConversationsPanel],
    ['Appointment Inbox', AppointmentsPanel],
    ['Appointment Slots', SlotsPanel],
  ])('renders %s as a standalone panel', (heading, PanelComponent) => {
    render(<PanelComponent {...createBaseProps()} />);

    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
  });

  it('renders only the requested panels through PortalSection', () => {
    render(<PortalSection {...createBaseProps()} visiblePanels={['users', 'slots']} />);

    expect(screen.getByRole('heading', { name: 'Portal Users' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Appointment Slots' })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Client Portal Access' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Portal Conversations' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Appointment Inbox' })
    ).not.toBeInTheDocument();
  });

  it('exposes retry actions for failed portal replies', async () => {
    const user = userEvent.setup();
    const props = createBaseProps();
    props.selectedPortalConversation = {
      thread: {
        id: 'thread-1',
        subject: 'Portal help',
        status: 'open',
        case_id: null,
        case_number: null,
        case_title: null,
        pointperson_user_id: null,
        pointperson_first_name: null,
        pointperson_last_name: null,
        portal_email: 'client@example.com',
        unread_count: 0,
        last_message_at: '2026-03-15T10:00:00.000Z',
      },
      messages: [
        {
          id: 'message-1',
          sender_type: 'staff',
          sender_display_name: 'Staff',
          message_text: 'Retry me',
          is_internal: false,
          created_at: '2026-03-15T10:00:00.000Z',
          send_state: 'failed',
          send_error: 'Network error',
          optimistic: true,
        },
      ],
    };

    render(<ConversationsPanel {...props} />);

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(props.onRetryPortalConversationReply).toHaveBeenCalledWith('message-1');
  });
});
