import type { ReactNode } from 'react';
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PortalAdminPage from './PortalAdminPage';

let currentPath = '/settings/admin/portal/access';

const usePortalSettingsMock = vi.fn();
const portalAdminRealtimeMock = vi.fn();
const accessPanelMock = vi.fn(() => <div>panel:access</div>);

vi.mock('react-router-dom', () => ({
  useLocation: () => ({
    pathname: currentPath,
    search: '',
    hash: '',
    state: null,
    key: 'test',
  }),
}));

vi.mock('../../components/AdminPanelLayout', () => ({
  default: ({
    title,
    description,
    sidebar,
    children,
  }: {
    title: string;
    description?: string;
    sidebar?: ReactNode;
    children: ReactNode;
  }) => (
    <section>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
      <div data-testid="portal-admin-sidebar">{sidebar}</div>
      <div data-testid="portal-admin-content">{children}</div>
    </section>
  ),
}));

vi.mock('../../components/AdminPanelNav', () => ({
  default: ({
    currentPath: path,
    mode,
  }: {
    currentPath: string;
    mode: string;
  }) => <div>{`nav:${mode}:${path}`}</div>,
}));

vi.mock('../../components/AdminQuickActionsBar', () => ({
  default: () => <div data-testid="portal-admin-quick-actions" />,
}));

vi.mock('../../../../contexts/useToast', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

vi.mock('../../../../hooks/useApiError', () => ({
  useApiError: () => ({
    error: null,
    setFromError: vi.fn(),
    clear: vi.fn(),
  }),
}));

vi.mock('../../../../hooks/useConfirmDialog', () => ({
  default: () => ({
    dialogState: {},
    confirm: vi.fn().mockResolvedValue(true),
    handleConfirm: vi.fn(),
    handleCancel: vi.fn(),
  }),
}));

vi.mock('../../../portal/admin/usePortalAdminRealtime', () => ({
  default: (...args: unknown[]) => portalAdminRealtimeMock(...args),
}));

vi.mock('../adminSettings/hooks/usePortalSettings', () => ({
  usePortalSettings: (...args: unknown[]) => usePortalSettingsMock(...args),
}));

vi.mock('../adminSettings/components/PortalResetPasswordModal', () => ({
  default: () => <div data-testid="portal-reset-modal" />,
}));

vi.mock('../../../../components/ConfirmDialog', () => ({
  default: () => <div data-testid="confirm-dialog" />,
}));

vi.mock('./panels/AccessPanel', () => ({
  default: (props: unknown) => accessPanelMock(props),
}));

vi.mock('./panels/UsersPanel', () => ({
  default: () => <div>panel:users</div>,
}));

vi.mock('./panels/ConversationsPanel', () => ({
  default: () => <div>panel:conversations</div>,
}));

vi.mock('./panels/AppointmentsPanel', () => ({
  default: () => <div>panel:appointments</div>,
}));

vi.mock('./panels/SlotsPanel', () => ({
  default: () => <div>panel:slots</div>,
}));

const createPortalSettingsState = () => ({
  portalRequests: [],
  portalRequestsError: null,
  portalInvitations: [],
  portalInvitationsError: null,
  portalInviteEmail: '',
  setPortalInviteEmail: vi.fn(),
  setPortalInviteContactId: vi.fn(),
  portalInviteUrl: null,
  portalLoading: false,
  portalUsers: [],
  portalUsersLoading: false,
  portalUsersError: null,
  portalUserSearch: '',
  setPortalUserSearch: vi.fn(),
  portalUserActivity: [],
  portalActivityLoading: false,
  portalActivityError: null,
  selectedPortalUser: null,
  portalResetTarget: null,
  setPortalResetTarget: vi.fn(),
  portalResetPassword: '',
  setPortalResetPassword: vi.fn(),
  portalResetConfirmPassword: '',
  setPortalResetConfirmPassword: vi.fn(),
  portalResetLoading: false,
  showPortalResetModal: false,
  setShowPortalResetModal: vi.fn(),
  portalContactSearch: '',
  setPortalContactSearch: vi.fn(),
  portalContactResults: [],
  setPortalContactResults: vi.fn(),
  portalContactLoading: false,
  selectedPortalContact: null,
  setSelectedPortalContact: vi.fn(),
  portalAppointments: [],
  portalAppointmentsLoading: false,
  portalAppointmentsError: null,
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
  portalSelectedAppointmentId: null,
  portalAppointmentReminders: null,
  portalAppointmentRemindersLoading: false,
  portalAppointmentActionLoading: false,
  portalReminderCustomMessage: '',
  setPortalReminderCustomMessage: vi.fn(),
  onAppointmentUpdated: vi.fn(),
  refreshPortalData: vi.fn().mockResolvedValue(undefined),
  fetchPortalUsers: vi.fn(),
  fetchPortalAppointments: vi.fn(),
  handleApprovePortalRequest: vi.fn(),
  handleRejectPortalRequest: vi.fn(),
  handleCreatePortalInvite: vi.fn(),
  handlePortalAppointmentFilterChange: vi.fn(),
  handlePortalAppointmentStatusChange: vi.fn(),
  handlePortalAppointmentCheckIn: vi.fn(),
  handlePortalAppointmentReminderHistory: vi.fn(),
  handlePortalSendAppointmentReminder: vi.fn(),
  handlePortalUserStatusChange: vi.fn(),
  handlePortalUserActivity: vi.fn(),
  handlePortalPasswordReset: vi.fn(),
});

const createPortalAdminRealtimeState = () => ({
  streamStatus: 'disabled',
  conversationFilters: {
    status: 'all',
    caseId: '',
    pointpersonUserId: '',
    search: '',
  },
  onConversationFilterChange: vi.fn(),
  portalConversationsLoading: false,
  portalConversationsLoadingMore: false,
  portalConversationsHasMore: false,
  portalConversations: [],
  selectedPortalConversation: null,
  portalConversationReply: '',
  setPortalConversationReply: vi.fn(),
  portalConversationReplyInternal: false,
  setPortalConversationReplyInternal: vi.fn(),
  portalConversationReplyLoading: false,
  fetchPortalConversations: vi.fn(),
  loadMorePortalConversations: vi.fn(),
  openPortalConversation: vi.fn(),
  sendPortalConversationReply: vi.fn(),
  retryPortalConversationReply: vi.fn(),
  updatePortalConversationStatus: vi.fn(),
  slotFilters: {
    status: 'all',
    caseId: '',
    pointpersonUserId: '',
    from: '',
    to: '',
  },
  onSlotFilterChange: vi.fn(),
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
  fetchPortalSlots: vi.fn(),
  loadMorePortalSlots: vi.fn(),
  createPortalSlot: vi.fn(),
  updatePortalSlotStatus: vi.fn(),
  deletePortalSlot: vi.fn(),
});

describe('PortalAdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePortalSettingsMock.mockReturnValue(createPortalSettingsState());
    portalAdminRealtimeMock.mockReturnValue(createPortalAdminRealtimeState());
  });

  it('passes manual contact approval payloads through the page wrapper', async () => {
    const portalState = createPortalSettingsState();
    usePortalSettingsMock.mockReturnValue(portalState);
    currentPath = '/settings/admin/portal/access';

    render(<PortalAdminPage panel="access" />);

    const props = accessPanelMock.mock.calls[0]?.[0] as {
      onApproveRequest: (id: string, payload?: { contact_id: string }) => Promise<void>;
    };

    await act(async () => {
      await props.onApproveRequest('request-1', { contact_id: 'contact-1' });
    });

    expect(portalState.handleApprovePortalRequest).toHaveBeenCalledWith('request-1', {
      contact_id: 'contact-1',
    });
    expect(portalState.refreshPortalData).toHaveBeenCalled();
  });

  it.each([
    [
      'access',
      '/settings/admin/portal/access',
      'Portal Ops',
      'Review portal requests and manage the client portal operations workspace.',
      'panel:access',
    ],
    [
      'users',
      '/settings/admin/portal/users',
      'Portal Users',
      'Manage portal user status, activity history, and reset operations.',
      'panel:users',
    ],
    [
      'conversations',
      '/settings/admin/portal/conversations',
      'Portal Conversations',
      'Monitor live portal conversations and staff replies from one place.',
      'panel:conversations',
    ],
    [
      'appointments',
      '/settings/admin/portal/appointments',
      'Portal Appointments',
      'Triage appointment inbox items, reminders, and check-in workflows.',
      'panel:appointments',
    ],
    [
      'slots',
      '/settings/admin/portal/slots',
      'Portal Slots',
      'Create and manage appointment slots and portal availability windows.',
      'panel:slots',
    ],
  ] as const)(
    'renders the %s panel shell with the correct title, sidebar context, and page content',
    (panel, path, title, description, marker) => {
      currentPath = path;

      render(<PortalAdminPage panel={panel} />);

      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
      expect(screen.getByText(description)).toBeInTheDocument();
      expect(screen.getByText(`nav:portal:${path}`)).toBeInTheDocument();
      expect(screen.getByText(marker)).toBeInTheDocument();
      expect(usePortalSettingsMock).toHaveBeenCalledWith(
        expect.objectContaining({ activeSection: 'portal' })
      );
      expect(portalAdminRealtimeMock).toHaveBeenCalledWith(
        expect.objectContaining({
          active: panel === 'conversations' || panel === 'slots',
        })
      );
    }
  );

  it('marks triage metrics as loading or failed instead of clean empty queues', () => {
    usePortalSettingsMock.mockReturnValue({
      ...createPortalSettingsState(),
      portalLoading: true,
      portalRequestsError:
        'Could not load signup requests. Refresh before treating this queue as empty.',
      portalAppointmentsLoading: true,
      portalAppointmentsError:
        'Could not load appointment inbox. Refresh before treating this queue as empty.',
    });
    portalAdminRealtimeMock.mockReturnValue({
      ...createPortalAdminRealtimeState(),
      portalConversationsLoading: true,
    });

    render(<PortalAdminPage panel="appointments" />);

    expect(screen.getAllByText('Load failed')).toHaveLength(3);
    expect(screen.getByText('Loading')).toBeInTheDocument();
    expect(screen.getAllByText('Refresh before treating this queue as empty.')).toHaveLength(3);
    expect(screen.getByText('Checking the latest portal data.')).toBeInTheDocument();
    expect(screen.queryByText('No requested items loaded')).not.toBeInTheDocument();
    expect(screen.queryByText('No loaded threads')).not.toBeInTheDocument();
  });

  it('promotes realtime conversation and slot failures into triage metric failures', () => {
    render(<PortalAdminPage panel="conversations" />);

    const realtimeOptions = portalAdminRealtimeMock.mock.calls[0]?.[0] as {
      notifyError: (error: unknown, fallback: string) => void;
    };

    act(() => {
      realtimeOptions.notifyError(new Error('offline'), 'Failed to load portal conversations');
      realtimeOptions.notifyError(new Error('offline'), 'Failed to load appointment slots');
    });

    expect(screen.getAllByText('Load failed')).toHaveLength(2);
    expect(screen.getAllByText('Refresh before treating this queue as empty.')).toHaveLength(2);
    expect(screen.queryByText('No loaded threads')).not.toBeInTheDocument();
    expect(screen.queryByText('No loaded slots')).not.toBeInTheDocument();
  });
});
