import type { PortalStreamStatus } from '../../../../../features/portal/client/types';
import AccessPanel from '../../portalAdmin/panels/AccessPanel';
import AppointmentsPanel from '../../portalAdmin/panels/AppointmentsPanel';
import ConversationsPanel from '../../portalAdmin/panels/ConversationsPanel';
import SlotsPanel from '../../portalAdmin/panels/SlotsPanel';
import UsersPanel from '../../portalAdmin/panels/UsersPanel';
import type {
  PortalActivity,
  PortalAdminAppointmentInboxItem,
  PortalAdminAppointmentReminderHistory,
  PortalAppointmentSlot,
  PortalConversationDetail,
  PortalConversationThread,
  PortalContactLookup,
  PortalInvitation,
  PortalSignupRequest,
  PortalUser,
} from '../types';

export type PortalSectionPanel = 'access' | 'users' | 'conversations' | 'appointments' | 'slots';

export interface PortalSectionProps {
  portalInviteUrl: string | null;
  portalLoading: boolean;
  portalRequests: PortalSignupRequest[];
  portalInviteEmail: string;
  portalContactSearch: string;
  portalContactLoading: boolean;
  portalContactResults: PortalContactLookup[];
  selectedPortalContact: PortalContactLookup | null;
  portalInvitations: PortalInvitation[];
  portalUsers: PortalUser[];
  portalUsersLoading: boolean;
  portalUserSearch: string;
  selectedPortalUser: PortalUser | null;
  portalUserActivity: PortalActivity[];
  portalActivityLoading: boolean;
  formError?: string | null;
  onRefreshPortal: () => void;
  onApproveRequest: (id: string) => void;
  onRejectRequest: (id: string) => void;
  onPortalInviteEmailChange: (value: string) => void;
  onPortalContactSearchChange: (value: string) => void;
  onSelectPortalContact: (contact: PortalContactLookup) => void;
  onClearPortalContact: () => void;
  onCreateInvitation: () => void;
  onPortalUserSearchChange: (value: string) => void;
  onRefreshUsers: () => void;
  onViewUserActivity: (user: PortalUser) => void;
  onToggleUserStatus: (user: PortalUser, status: string) => void;
  onOpenResetModal: (user: PortalUser) => void;
  portalStreamStatus: PortalStreamStatus;
  portalConversationFilters: {
    status: 'all' | 'open' | 'closed' | 'archived';
    caseId: string;
    pointpersonUserId: string;
    search: string;
  };
  onPortalConversationFilterChange: (
    field: 'status' | 'caseId' | 'pointpersonUserId' | 'search',
    value: string
  ) => void;
  portalConversationsLoading: boolean;
  portalConversationsLoadingMore: boolean;
  portalConversationsHasMore: boolean;
  portalConversations: PortalConversationThread[];
  selectedPortalConversation: PortalConversationDetail | null;
  portalConversationReply: string;
  portalConversationReplyInternal: boolean;
  portalConversationReplyLoading: boolean;
  onRefreshPortalConversations: () => void;
  onLoadMorePortalConversations: () => void;
  onOpenPortalConversation: (threadId: string) => void;
  onPortalConversationReplyChange: (value: string) => void;
  onPortalConversationReplyInternalChange: (value: boolean) => void;
  onSendPortalConversationReply: () => void;
  onRetryPortalConversationReply: (messageId: string) => void;
  onUpdatePortalConversationStatus: (threadId: string, status: 'open' | 'closed' | 'archived') => void;
  portalSlotFilters: {
    status: 'all' | 'open' | 'closed' | 'cancelled';
    caseId: string;
    pointpersonUserId: string;
    from: string;
    to: string;
  };
  onPortalSlotFilterChange: (
    field: 'status' | 'caseId' | 'pointpersonUserId' | 'from' | 'to',
    value: string
  ) => void;
  portalSlotsLoading: boolean;
  portalSlotsLoadingMore: boolean;
  portalSlotsHasMore: boolean;
  portalSlots: PortalAppointmentSlot[];
  portalSlotSaving: boolean;
  portalSlotForm: {
    pointperson_user_id: string;
    case_id: string;
    title: string;
    details: string;
    location: string;
    start_time: string;
    end_time: string;
    capacity: number;
  };
  onPortalSlotFormChange: (field: string, value: string | number) => void;
  onCreatePortalSlot: () => void;
  onRefreshPortalSlots: () => void;
  onLoadMorePortalSlots: () => void;
  onUpdatePortalSlotStatus: (slotId: string, status: 'open' | 'closed' | 'cancelled') => void;
  onDeletePortalSlot: (slotId: string) => void;
  portalAppointments: PortalAdminAppointmentInboxItem[];
  portalAppointmentsLoading: boolean;
  portalAppointmentsPagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  portalAppointmentFilters: {
    status: 'all' | 'requested' | 'confirmed' | 'cancelled' | 'completed';
    requestType: 'all' | 'manual_request' | 'slot_booking';
    caseId: string;
    pointpersonUserId: string;
    dateFrom: string;
    dateTo: string;
  };
  onPortalAppointmentFilterChange: (
    field: 'status' | 'requestType' | 'caseId' | 'pointpersonUserId' | 'dateFrom' | 'dateTo',
    value: string
  ) => void;
  onPortalAppointmentPageChange: (page: number) => void;
  onRefreshPortalAppointments: () => void;
  onPortalAppointmentStatusChange: (
    appointmentId: string,
    status: 'requested' | 'confirmed' | 'cancelled' | 'completed'
  ) => void;
  onPortalAppointmentCheckIn: (appointmentId: string) => void;
  selectedPortalAppointmentId: string | null;
  portalAppointmentReminders: PortalAdminAppointmentReminderHistory | null;
  portalAppointmentRemindersLoading: boolean;
  portalAppointmentActionLoading: boolean;
  onPortalAppointmentReminderHistory: (appointmentId: string) => void;
  portalReminderCustomMessage: string;
  onPortalReminderCustomMessageChange: (value: string) => void;
  onPortalSendAppointmentReminder: (
    appointmentId: string,
    options: { sendEmail?: boolean; sendSms?: boolean }
  ) => void;
  visiblePanels?: PortalSectionPanel[];
}

export default function PortalSection(props: PortalSectionProps) {
  const { visiblePanels, ...panelProps } = props;
  const isPanelVisible = (panel: PortalSectionPanel): boolean =>
    !visiblePanels || visiblePanels.includes(panel);

  return (
    <div className="space-y-6">
      {isPanelVisible('access') && <AccessPanel {...panelProps} />}
      {isPanelVisible('users') && <UsersPanel {...panelProps} />}
      {isPanelVisible('conversations') && <ConversationsPanel {...panelProps} />}
      {isPanelVisible('appointments') && <AppointmentsPanel {...panelProps} />}
      {isPanelVisible('slots') && <SlotsPanel {...panelProps} />}
    </div>
  );
}
