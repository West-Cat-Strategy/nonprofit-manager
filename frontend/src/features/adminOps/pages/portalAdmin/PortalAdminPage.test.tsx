import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PortalAdminPage from './PortalAdminPage';

let currentPath = '/settings/admin/portal/access';

const usePortalSettingsMock = vi.fn();
const portalAdminRealtimeMock = vi.fn();

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
  default: () => <div>panel:access</div>,
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
  portalInvitations: [],
  portalInviteEmail: '',
  setPortalInviteEmail: vi.fn(),
  setPortalInviteContactId: vi.fn(),
  portalInviteUrl: null,
  portalLoading: false,
  portalUsers: [],
  portalUsersLoading: false,
  portalUserSearch: '',
  setPortalUserSearch: vi.fn(),
  portalUserActivity: [],
  portalActivityLoading: false,
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

  it.each([
    [
      'access',
      '/settings/admin/portal/access',
      'Portal Admin - Access',
      'Approve signup requests and manage portal invitations.',
      'panel:access',
    ],
    [
      'users',
      '/settings/admin/portal/users',
      'Portal Admin - Users',
      'Manage portal user status, activity, and reset operations.',
      'panel:users',
    ],
    [
      'conversations',
      '/settings/admin/portal/conversations',
      'Portal Admin - Conversations',
      'Monitor and reply to portal conversations with live stream status.',
      'panel:conversations',
    ],
    [
      'appointments',
      '/settings/admin/portal/appointments',
      'Portal Admin - Appointments',
      'Triage appointment inbox items and reminder delivery actions.',
      'panel:appointments',
    ],
    [
      'slots',
      '/settings/admin/portal/slots',
      'Portal Admin - Slots',
      'Create and manage portal appointment slots and availability.',
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
        expect.objectContaining({ active: true })
      );
    }
  );
});
