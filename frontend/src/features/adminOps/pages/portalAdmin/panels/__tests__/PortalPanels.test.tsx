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

  it('surfaces intake request counts and manual contact-match cues', () => {
    const props = createBaseProps();
    props.portalRequests = [
      {
        id: 'request-1',
        email: 'pending@example.org',
        status: 'pending',
        resolution_status: 'needs_contact_resolution',
        requested_at: '2026-05-02T10:00:00.000Z',
        contact_id: null,
        first_name: 'Pending',
        last_name: 'Client',
      },
      {
        id: 'request-2',
        email: 'ready@example.org',
        status: 'pending',
        resolution_status: 'resolved',
        requested_at: '2026-05-02T11:00:00.000Z',
        contact_id: 'contact-1',
      },
    ];
    props.portalInvitations = [
      {
        id: 'invite-1',
        email: 'invited@example.org',
        created_at: '2026-05-01T00:00:00.000Z',
        expires_at: '2026-05-08T00:00:00.000Z',
        accepted_at: null,
      },
    ];

    render(<AccessPanel {...props} />);

    expect(screen.getByText('Pending requests')).toBeInTheDocument();
    expect(screen.getByText('Contact matches')).toBeInTheDocument();
    expect(screen.getByText('Pending invites')).toBeInTheDocument();
    expect(screen.getByText('Contact match needed')).toBeInTheDocument();
    expect(screen.getByText('Ready for approval')).toBeInTheDocument();
    expect(screen.getByText('Select a matching contact before approval')).toBeInTheDocument();
  });

  it('requires a selected contact before approving contact-resolution requests', async () => {
    const user = userEvent.setup();
    const props = createBaseProps();
    props.portalRequests = [
      {
        id: 'request-1',
        email: 'pending@example.org',
        status: 'pending',
        resolution_status: 'needs_contact_resolution',
        requested_at: '2026-05-02T10:00:00.000Z',
        contact_id: null,
        first_name: 'Pending',
        last_name: 'Client',
      },
    ];

    render(<AccessPanel {...props} />);

    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    const selectContactButton = screen.getByRole('button', { name: 'Select contact first' });

    expect(selectContactButton).toBeDisabled();
    await user.click(selectContactButton);
    expect(props.onApproveRequest).not.toHaveBeenCalled();
  });

  it('approves contact-resolution requests with the selected contact payload', async () => {
    const user = userEvent.setup();
    const props = createBaseProps();
    props.selectedPortalContact = {
      contact_id: 'contact-1',
      first_name: 'Pending',
      last_name: 'Client',
      email: 'pending@example.org',
    };
    props.portalRequests = [
      {
        id: 'request-1',
        email: 'pending@example.org',
        status: 'pending',
        resolution_status: 'needs_contact_resolution',
        requested_at: '2026-05-02T10:00:00.000Z',
        contact_id: null,
        first_name: 'Pending',
        last_name: 'Client',
      },
    ];

    render(<AccessPanel {...props} />);

    await user.click(screen.getByRole('button', { name: 'Approve with contact' }));

    expect(props.onApproveRequest).toHaveBeenCalledWith('request-1', {
      contact_id: 'contact-1',
    });
  });

  it('keeps resolved access requests on the normal approve path', async () => {
    const user = userEvent.setup();
    const props = createBaseProps();
    props.portalRequests = [
      {
        id: 'request-2',
        email: 'ready@example.org',
        status: 'pending',
        resolution_status: 'resolved',
        requested_at: '2026-05-02T11:00:00.000Z',
        contact_id: 'contact-2',
      },
    ];

    render(<AccessPanel {...props} />);

    await user.click(screen.getByRole('button', { name: 'Approve' }));

    expect(props.onApproveRequest).toHaveBeenCalledWith('request-2');
  });

  it('shows explicit access load failures instead of empty request and invitation queues', () => {
    const props = createBaseProps();
    props.portalRequestsError =
      'Could not load signup requests. Refresh this panel before treating the queue as empty.';
    props.portalInvitationsError =
      'Could not load portal invitations. Refresh this panel before treating the queue as empty.';

    render(<AccessPanel {...props} />);

    expect(screen.getAllByText('Load failed').length).toBeGreaterThan(0);
    expect(screen.getByText(/could not load signup requests/i)).toBeInTheDocument();
    expect(screen.getByText(/could not load portal invitations/i)).toBeInTheDocument();
    expect(screen.queryByText('No pending requests.')).not.toBeInTheDocument();
    expect(screen.queryByText('No portal invitations yet.')).not.toBeInTheDocument();
  });

  it('shows portal user load failures instead of an empty users list', () => {
    const props = createBaseProps();
    props.portalUsersError =
      'Could not load portal users. Refresh this panel before treating the queue as empty.';

    render(<UsersPanel {...props} />);

    expect(screen.getByText('Load failed')).toBeInTheDocument();
    expect(screen.getByText(/could not load portal users/i)).toBeInTheDocument();
    expect(screen.queryByText('No portal users found.')).not.toBeInTheDocument();
  });

  it('surfaces appointment queue counts and case-linked action cues', () => {
    const props = createBaseProps();
    props.portalAppointmentsPagination = {
      page: 1,
      limit: 25,
      total: 3,
      total_pages: 1,
    };
    props.portalAppointments = [
      {
        id: 'appointment-1',
        contact_id: 'contact-1',
        case_id: 'case-1',
        pointperson_user_id: 'user-1',
        slot_id: null,
        request_type: 'manual_request',
        title: 'Housing appointment',
        description: null,
        start_time: '2026-05-03T10:00:00.000Z',
        end_time: null,
        status: 'requested',
        location: 'Office',
        created_at: '2026-05-02T00:00:00.000Z',
        updated_at: '2026-05-02T00:00:00.000Z',
        pending_reminder_jobs: 2,
      },
      {
        id: 'appointment-2',
        contact_id: 'contact-2',
        case_id: null,
        pointperson_user_id: null,
        slot_id: null,
        request_type: 'slot_booking',
        title: 'Drop-in appointment',
        description: null,
        start_time: '2026-05-04T10:00:00.000Z',
        end_time: null,
        status: 'confirmed',
        location: null,
        created_at: '2026-05-02T00:00:00.000Z',
        updated_at: '2026-05-02T00:00:00.000Z',
      },
    ];

    render(<AppointmentsPanel {...props} />);

    expect(screen.getByText('Matching')).toBeInTheDocument();
    expect(screen.getByText('Showing 2')).toBeInTheDocument();
    expect(screen.getAllByText('Requested').length).toBeGreaterThan(0);
    expect(screen.getByText('Case linked')).toBeInTheDocument();
    expect(screen.getByText('Resolve in case')).toBeInTheDocument();
    expect(screen.getByText('Direct inbox action')).toBeInTheDocument();
    expect(screen.getByText('Confirmation needed')).toBeInTheDocument();
    expect(screen.getByText('2 reminders pending')).toBeInTheDocument();
  });

  it('shows appointment load failures instead of an empty filtered inbox', () => {
    const props = createBaseProps();
    props.portalAppointmentsError =
      'Could not load appointment inbox. Refresh this panel before treating the queue as empty.';

    render(<AppointmentsPanel {...props} />);

    expect(screen.getByText('Load failed')).toBeInTheDocument();
    expect(screen.getByText(/could not load appointment inbox/i)).toBeInTheDocument();
    expect(screen.queryByText('No appointments match current filters.')).not.toBeInTheDocument();
  });

  it('surfaces conversation queue counts and reply cues', () => {
    const props = createBaseProps();
    props.portalConversations = [
      {
        id: 'thread-1',
        subject: 'Case update',
        status: 'open',
        case_id: 'case-1',
        case_number: 'CASE-1',
        case_title: 'Housing Support',
        pointperson_user_id: 'user-1',
        pointperson_first_name: 'Staff',
        pointperson_last_name: 'Owner',
        portal_email: 'client@example.org',
        unread_count: 2,
        last_message_at: '2026-05-02T10:00:00.000Z',
      },
      {
        id: 'thread-2',
        subject: 'General question',
        status: 'closed',
        case_id: null,
        case_number: null,
        case_title: null,
        pointperson_user_id: null,
        pointperson_first_name: null,
        pointperson_last_name: null,
        portal_email: 'other@example.org',
        unread_count: 0,
        last_message_at: '2026-05-02T11:00:00.000Z',
      },
    ];
    props.selectedPortalConversation = {
      thread: props.portalConversations[0],
      messages: [],
    };

    render(<ConversationsPanel {...props} />);

    expect(screen.getByText('Visible')).toBeInTheDocument();
    expect(screen.getByText('Unread')).toBeInTheDocument();
    expect(screen.getAllByText('Case-linked').length).toBeGreaterThan(0);
    expect(screen.getByText('General portal thread')).toBeInTheDocument();
    expect(screen.getByText('Reply available')).toBeInTheDocument();
    expect(screen.getAllByText('2 unread').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /back to conversations/i })).toBeInTheDocument();
  });

  it('shows conversation load failures while preserving any loaded rows', () => {
    const props = createBaseProps();
    props.portalConversationsError =
      'Could not load portal conversations. Refresh this panel before treating the queue as empty.';
    props.portalConversations = [
      {
        id: 'thread-1',
        subject: 'Loaded thread',
        status: 'open',
        case_id: null,
        case_number: null,
        case_title: null,
        pointperson_user_id: null,
        pointperson_first_name: null,
        pointperson_last_name: null,
        portal_email: 'client@example.org',
        unread_count: 0,
        last_message_at: '2026-05-02T10:00:00.000Z',
      },
    ];

    render(<ConversationsPanel {...props} />);

    expect(screen.getByText('Partial load')).toBeInTheDocument();
    expect(screen.getByText(/could not load portal conversations/i)).toBeInTheDocument();
    expect(screen.getByText('Loaded thread')).toBeInTheDocument();
    expect(screen.queryByText('No portal conversations yet.')).not.toBeInTheDocument();
  });

  it('shows slot load failures instead of an empty slot list', () => {
    const props = createBaseProps();
    props.portalSlotsError =
      'Could not load appointment slots. Refresh this panel before treating the queue as empty.';

    render(<SlotsPanel {...props} />);

    expect(screen.getByText('Load failed')).toBeInTheDocument();
    expect(screen.getByText(/could not load appointment slots/i)).toBeInTheDocument();
    expect(screen.queryByText('No slots configured.')).not.toBeInTheDocument();
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
