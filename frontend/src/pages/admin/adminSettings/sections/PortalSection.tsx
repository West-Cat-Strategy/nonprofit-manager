import ErrorBanner from '../../../../components/ErrorBanner';
import type { PortalStreamStatus } from '../../../../features/portal/client/types';
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

const getStreamStatusBadge = (
  status: PortalStreamStatus
): { label: string; className: string } => {
  if (status === 'connected') {
    return {
      label: 'Live updates on',
      className: 'bg-app-accent-soft text-app-accent-text',
    };
  }

  if (status === 'connecting') {
    return {
      label: 'Connecting live updates...',
      className: 'bg-app-surface-muted text-app-text-muted',
    };
  }

  if (status === 'error') {
    return {
      label: 'Live updates unavailable (polling)',
      className: 'bg-app-accent-soft text-app-accent-text',
    };
  }

  return {
    label: 'Live updates disabled (polling)',
    className: 'bg-app-surface-muted text-app-text-muted',
  };
};

interface PortalSectionProps {
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
}

export default function PortalSection({
  portalInviteUrl,
  portalLoading,
  portalRequests,
  portalInviteEmail,
  portalContactSearch,
  portalContactLoading,
  portalContactResults,
  selectedPortalContact,
  portalInvitations,
  portalUsers,
  portalUsersLoading,
  portalUserSearch,
  selectedPortalUser,
  portalUserActivity,
  portalActivityLoading,
  formError,
  onRefreshPortal,
  onApproveRequest,
  onRejectRequest,
  onPortalInviteEmailChange,
  onPortalContactSearchChange,
  onSelectPortalContact,
  onClearPortalContact,
  onCreateInvitation,
  onPortalUserSearchChange,
  onRefreshUsers,
  onViewUserActivity,
  onToggleUserStatus,
  onOpenResetModal,
  portalStreamStatus,
  portalConversationFilters,
  onPortalConversationFilterChange,
  portalConversationsLoading,
  portalConversationsLoadingMore,
  portalConversationsHasMore,
  portalConversations,
  selectedPortalConversation,
  portalConversationReply,
  portalConversationReplyInternal,
  portalConversationReplyLoading,
  onRefreshPortalConversations,
  onLoadMorePortalConversations,
  onOpenPortalConversation,
  onPortalConversationReplyChange,
  onPortalConversationReplyInternalChange,
  onSendPortalConversationReply,
  onUpdatePortalConversationStatus,
  portalSlotFilters,
  onPortalSlotFilterChange,
  portalSlotsLoading,
  portalSlotsLoadingMore,
  portalSlotsHasMore,
  portalSlots,
  portalSlotSaving,
  portalSlotForm,
  onPortalSlotFormChange,
  onCreatePortalSlot,
  onRefreshPortalSlots,
  onLoadMorePortalSlots,
  onUpdatePortalSlotStatus,
  onDeletePortalSlot,
  portalAppointments,
  portalAppointmentsLoading,
  portalAppointmentsPagination,
  portalAppointmentFilters,
  onPortalAppointmentFilterChange,
  onPortalAppointmentPageChange,
  onRefreshPortalAppointments,
  onPortalAppointmentStatusChange,
  onPortalAppointmentCheckIn,
  selectedPortalAppointmentId,
  portalAppointmentReminders,
  portalAppointmentRemindersLoading,
  portalAppointmentActionLoading,
  onPortalAppointmentReminderHistory,
  portalReminderCustomMessage,
  onPortalReminderCustomMessageChange,
  onPortalSendAppointmentReminder,
}: PortalSectionProps) {
  const streamBadge = getStreamStatusBadge(portalStreamStatus);

  return (
    <div className="space-y-6">
      <div className="bg-app-surface rounded-lg shadow-sm border border-app-border overflow-hidden">
        <div className="px-6 py-4 border-b border-app-border bg-app-surface-muted">
          <h2 className="text-lg font-semibold text-app-text-heading">Client Portal Access</h2>
          <p className="text-sm text-app-text-muted mt-1">
            Approve client signup requests and issue portal invitations.
          </p>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-sm font-medium text-app-text">Manual distribution</div>
              <div className="text-sm text-app-text-muted">
                No SMTP configured. Copy invite links and share them securely.
              </div>
            </div>
            <button
              type="button"
              onClick={onRefreshPortal}
              className="px-4 py-2 text-sm bg-app-surface-muted rounded-lg hover:bg-app-surface-muted"
            >
              Refresh
            </button>
          </div>
          {portalInviteUrl && (
            <div className="rounded-lg border border-app-accent bg-app-accent-soft p-4">
              <div className="text-sm font-medium text-app-accent-text">Latest invite link</div>
              <div className="mt-1 text-sm text-app-accent-text break-all">{portalInviteUrl}</div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-app-surface rounded-lg shadow-sm border border-app-border overflow-hidden">
        <div className="px-6 py-4 border-b border-app-border bg-app-surface-muted">
          <h3 className="text-lg font-semibold text-app-text-heading">Signup Requests</h3>
          <p className="text-sm text-app-text-muted mt-1">
            Requests from clients waiting for approval.
          </p>
        </div>
        <div className="p-6">
          {portalLoading ? (
            <p className="text-sm text-app-text-muted">Loading requests...</p>
          ) : portalRequests.length === 0 ? (
            <p className="text-sm text-app-text-muted">No pending requests.</p>
          ) : (
            <div className="space-y-4">
              {portalRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border border-app-border rounded-lg p-4"
                >
                  <div>
                    <div className="text-sm font-medium text-app-text">
                      {request.first_name || request.last_name
                        ? `${request.first_name || ''} ${request.last_name || ''}`.trim()
                        : request.email}
                    </div>
                    <div className="text-sm text-app-text-muted">{request.email}</div>
                    <div className="text-xs text-app-text-subtle mt-1">
                      Requested {new Date(request.requested_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onApproveRequest(request.id)}
                      className="px-3 py-1.5 text-sm bg-app-accent text-white rounded-lg hover:bg-app-accent-hover"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => onRejectRequest(request.id)}
                      className="px-3 py-1.5 text-sm bg-app-surface-muted rounded-lg hover:bg-app-hover"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-app-surface rounded-lg shadow-sm border border-app-border overflow-hidden">
        <div className="px-6 py-4 border-b border-app-border bg-app-surface-muted">
          <h3 className="text-lg font-semibold text-app-text-heading">Invite a Client</h3>
          <p className="text-sm text-app-text-muted mt-1">
            Create a portal invitation for a client.
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-app-text-label mb-1">Client Email</label>
              <input
                type="email"
                value={portalInviteEmail}
                onChange={(e) => onPortalInviteEmailChange(e.target.value)}
                placeholder="client@example.org"
                className="w-full px-3 py-2 border border-app-input-border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-app-text-label mb-1">Link Existing Contact (optional)</label>
              <input
                type="text"
                value={portalContactSearch}
                onChange={(e) => onPortalContactSearchChange(e.target.value)}
                placeholder="Search contacts by name or email"
                className="w-full px-3 py-2 border border-app-input-border rounded-lg"
              />
              {portalContactLoading && (
                <div className="text-xs text-app-text-muted mt-2">Searching contacts...</div>
              )}
              {portalContactResults.length > 0 && (
                <div className="mt-2 border border-app-border rounded-lg divide-y">
                  {portalContactResults.map((contact) => (
                    <button
                      key={contact.contact_id}
                      type="button"
                      onClick={() => onSelectPortalContact(contact)}
                      className="w-full text-left px-3 py-2 hover:bg-app-surface-muted text-sm"
                    >
                      <div className="font-medium text-app-text">
                        {contact.first_name} {contact.last_name}
                      </div>
                      <div className="text-xs text-app-text-muted">{contact.email || 'No email on file'}</div>
                    </button>
                  ))}
                </div>
              )}
              {selectedPortalContact && (
                <div className="mt-2 flex items-center justify-between rounded-lg border border-app-accent bg-app-accent-soft px-3 py-2">
                  <div className="text-xs text-app-accent-text">
                    Linked: {selectedPortalContact.first_name} {selectedPortalContact.last_name}
                  </div>
                  <button
                    type="button"
                    onClick={onClearPortalContact}
                    className="text-xs text-app-accent-text hover:underline"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCreateInvitation}
              className="px-4 py-2 bg-app-accent text-white text-sm font-medium rounded-lg hover:bg-app-accent-hover"
            >
              Create Invitation
            </button>
          </div>
          <ErrorBanner message={formError} className="mt-2" />

          <div className="pt-4 border-t border-app-border">
            <h4 className="text-sm font-semibold text-app-text-heading">Recent Invitations</h4>
            {portalLoading ? (
              <p className="text-sm text-app-text-muted mt-2">Loading invitations...</p>
            ) : portalInvitations.length === 0 ? (
              <p className="text-sm text-app-text-muted mt-2">No portal invitations yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {portalInvitations.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between border border-app-border rounded-lg p-3"
                  >
                    <div>
                      <div className="text-sm font-medium text-app-text">{invite.email}</div>
                      <div className="text-xs text-app-text-muted">
                        Created {new Date(invite.created_at).toLocaleDateString('en-CA')} • Expires{' '}
                        {new Date(invite.expires_at).toLocaleDateString('en-CA')}
                      </div>
                    </div>
                    <div className="text-xs font-medium text-app-text-muted">
                      {invite.accepted_at ? 'Accepted' : 'Pending'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-app-surface rounded-lg shadow-sm border border-app-border overflow-hidden">
        <div className="px-6 py-4 border-b border-app-border bg-app-surface-muted">
          <h3 className="text-lg font-semibold text-app-text-heading">Portal Users</h3>
          <p className="text-sm text-app-text-muted mt-1">
            Manage portal user access, passwords, and status.
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <input
              type="text"
              value={portalUserSearch}
              onChange={(e) => onPortalUserSearchChange(e.target.value)}
              placeholder="Search portal users by name or email"
              className="w-full md:max-w-md px-3 py-2 border border-app-input-border rounded-lg"
            />
            <button
              type="button"
              onClick={onRefreshUsers}
              className="px-4 py-2 text-sm bg-app-surface-muted rounded-lg hover:bg-app-surface-muted"
            >
              Refresh
            </button>
          </div>

          {portalUsersLoading ? (
            <p className="text-sm text-app-text-muted">Loading portal users...</p>
          ) : portalUsers.length === 0 ? (
            <p className="text-sm text-app-text-muted">No portal users found.</p>
          ) : (
            <div className="space-y-3">
              {portalUsers.map((user) => {
                const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
                return (
                  <div key={user.id} className="border border-app-border rounded-lg p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-app-text">
                            {name || user.email}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              user.status === 'active'
                                ? 'bg-app-accent-soft text-app-accent-text'
                                : 'bg-app-accent-soft text-app-accent-text'
                            }`}
                          >
                            {user.status}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              user.is_verified ? 'bg-app-accent-soft text-app-accent-text' : 'bg-app-accent-soft text-app-accent-text'
                            }`}
                          >
                            {user.is_verified ? 'Verified' : 'Pending'}
                          </span>
                        </div>
                        <div className="text-xs text-app-text-muted">{user.email}</div>
                        <div className="text-xs text-app-text-subtle mt-1">
                          Last login:{' '}
                          {user.last_login_at
                            ? new Date(user.last_login_at).toLocaleString()
                            : 'Never'}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onViewUserActivity(user)}
                          className="px-3 py-1.5 text-xs bg-app-surface-muted rounded-lg hover:bg-app-surface-muted"
                        >
                          View Activity
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onToggleUserStatus(user, user.status === 'active' ? 'suspended' : 'active')
                          }
                          className={`px-3 py-1.5 text-xs rounded-lg ${
                            user.status === 'active'
                              ? 'bg-app-accent-soft text-app-accent-text hover:bg-app-accent-soft'
                              : 'bg-app-accent-soft text-app-accent-text hover:bg-app-accent-soft'
                          }`}
                        >
                          {user.status === 'active' ? 'Suspend' : 'Reactivate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenResetModal(user)}
                          className="px-3 py-1.5 text-xs bg-app-accent text-white rounded-lg hover:bg-app-accent-hover"
                        >
                          Reset Password
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="bg-app-surface rounded-lg shadow-sm border border-app-border overflow-hidden">
        <div className="px-6 py-4 border-b border-app-border bg-app-surface-muted">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-app-text-heading">Portal Conversations</h3>
              <p className="text-sm text-app-text-muted mt-1">
                Reply to client threads and keep conversation history in sync with case detail.
              </p>
            </div>
            <span className={`px-2 py-1 text-xs rounded ${streamBadge.className}`}>
              {streamBadge.label}
            </span>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <input
              type="text"
              value={portalConversationFilters.search}
              onChange={(e) => onPortalConversationFilterChange('search', e.target.value)}
              placeholder="Search conversations"
              className="px-3 py-2 border border-app-input-border rounded-lg"
            />
            <select
              value={portalConversationFilters.status}
              onChange={(e) => onPortalConversationFilterChange('status', e.target.value)}
              className="px-3 py-2 border border-app-input-border rounded-lg"
            >
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="archived">Archived</option>
            </select>
            <input
              type="text"
              value={portalConversationFilters.caseId}
              onChange={(e) => onPortalConversationFilterChange('caseId', e.target.value)}
              placeholder="Case ID"
              className="px-3 py-2 border border-app-input-border rounded-lg"
            />
            <input
              type="text"
              value={portalConversationFilters.pointpersonUserId}
              onChange={(e) => onPortalConversationFilterChange('pointpersonUserId', e.target.value)}
              placeholder="Pointperson user ID"
              className="px-3 py-2 border border-app-input-border rounded-lg"
            />
            <button
              type="button"
              onClick={onRefreshPortalConversations}
              className="px-4 py-2 text-sm bg-app-surface-muted rounded-lg hover:bg-app-surface-muted"
            >
              Refresh Conversations
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
            <div className="border border-app-border rounded-lg overflow-hidden">
              {portalConversationsLoading && portalConversations.length === 0 ? (
                <p className="p-4 text-sm text-app-text-muted">Loading conversations...</p>
              ) : portalConversations.length === 0 ? (
                <p className="p-4 text-sm text-app-text-muted">No portal conversations yet.</p>
              ) : (
                <div>
                  <ul className="max-h-[420px] overflow-y-auto divide-y divide-app-border">
                    {portalConversations.map((conversation) => (
                      <li key={conversation.id}>
                        <button
                          type="button"
                          onClick={() => onOpenPortalConversation(conversation.id)}
                          className={`w-full px-3 py-3 text-left hover:bg-app-surface-muted ${
                            selectedPortalConversation?.thread.id === conversation.id
                              ? 'bg-app-surface-muted'
                              : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-medium text-app-text">
                              {conversation.subject || conversation.case_title || 'Conversation'}
                            </div>
                            {conversation.unread_count > 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-app-accent text-white text-xs">
                                {conversation.unread_count}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-app-text-muted mt-1">
                            {conversation.portal_email || 'Client'} • {conversation.status}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {portalConversationsHasMore && (
                    <div className="p-3 border-t border-app-border">
                      <button
                        type="button"
                        onClick={onLoadMorePortalConversations}
                        disabled={portalConversationsLoadingMore}
                        className="w-full px-3 py-2 text-sm bg-app-surface-muted rounded-lg hover:bg-app-surface-muted disabled:opacity-50"
                      >
                        {portalConversationsLoadingMore ? 'Loading...' : 'Load More Conversations'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border border-app-border rounded-lg p-4">
              {!selectedPortalConversation ? (
                <p className="text-sm text-app-text-muted">Select a conversation to reply.</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-app-text">
                        {selectedPortalConversation.thread.subject || 'Conversation'}
                      </div>
                      <div className="text-xs text-app-text-muted">
                        {selectedPortalConversation.thread.portal_email || 'Client'} •{' '}
                        {selectedPortalConversation.thread.status}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdatePortalConversationStatus(
                          selectedPortalConversation.thread.id,
                          selectedPortalConversation.thread.status === 'open' ? 'closed' : 'open'
                        )
                      }
                      className="px-3 py-1.5 text-xs bg-app-surface-muted rounded-lg hover:bg-app-surface-muted"
                    >
                      {selectedPortalConversation.thread.status === 'open' ? 'Close' : 'Reopen'}
                    </button>
                  </div>

                  <div className="max-h-[260px] overflow-y-auto space-y-3 border border-app-border rounded-lg p-3">
                    {selectedPortalConversation.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`rounded-lg px-3 py-2 text-sm ${
                          message.sender_type === 'staff'
                            ? 'bg-app-accent-soft text-app-accent-text'
                            : 'bg-app-surface-muted text-app-text'
                        }`}
                      >
                        <div className="text-[11px] text-app-text-muted">
                          {message.sender_display_name || message.sender_type} •{' '}
                          {new Date(message.created_at).toLocaleString()}
                          {message.is_internal && ' • Internal'}
                        </div>
                        <div className="mt-1 whitespace-pre-wrap">{message.message_text}</div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <textarea
                      value={portalConversationReply}
                      onChange={(e) => onPortalConversationReplyChange(e.target.value)}
                      rows={3}
                      placeholder="Reply to client"
                      className="w-full px-3 py-2 border border-app-input-border rounded-lg"
                      disabled={selectedPortalConversation.thread.status !== 'open'}
                    />
                    <label className="inline-flex items-center gap-2 text-sm text-app-text-muted">
                      <input
                        type="checkbox"
                        checked={portalConversationReplyInternal}
                        onChange={(e) => onPortalConversationReplyInternalChange(e.target.checked)}
                        className="rounded border-app-input-border text-app-accent focus:ring-app-accent"
                      />
                      Internal note (not visible to client)
                    </label>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={onSendPortalConversationReply}
                        disabled={
                          portalConversationReplyLoading ||
                          selectedPortalConversation.thread.status !== 'open' ||
                          !portalConversationReply.trim()
                        }
                        className="px-4 py-2 text-sm bg-app-accent text-white rounded-lg hover:bg-app-accent-hover disabled:opacity-50"
                      >
                        {portalConversationReplyLoading ? 'Sending...' : 'Send Reply'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-app-surface rounded-lg shadow-sm border border-app-border overflow-hidden">
        <div className="px-6 py-4 border-b border-app-border bg-app-surface-muted">
          <h3 className="text-lg font-semibold text-app-text-heading">Appointment Inbox</h3>
          <p className="text-sm text-app-text-muted mt-1">
            Triage appointment status, mark check-ins, and manage reminder operations.
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
            <select
              value={portalAppointmentFilters.status}
              onChange={(e) => onPortalAppointmentFilterChange('status', e.target.value)}
              className="px-3 py-2 border border-app-input-border rounded-lg"
            >
              <option value="all">All statuses</option>
              <option value="requested">Requested</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={portalAppointmentFilters.requestType}
              onChange={(e) => onPortalAppointmentFilterChange('requestType', e.target.value)}
              className="px-3 py-2 border border-app-input-border rounded-lg"
            >
              <option value="all">All types</option>
              <option value="manual_request">Manual request</option>
              <option value="slot_booking">Slot booking</option>
            </select>
            <input
              type="text"
              value={portalAppointmentFilters.caseId}
              onChange={(e) => onPortalAppointmentFilterChange('caseId', e.target.value)}
              placeholder="Case ID"
              className="px-3 py-2 border border-app-input-border rounded-lg"
            />
            <input
              type="text"
              value={portalAppointmentFilters.pointpersonUserId}
              onChange={(e) => onPortalAppointmentFilterChange('pointpersonUserId', e.target.value)}
              placeholder="Pointperson user ID"
              className="px-3 py-2 border border-app-input-border rounded-lg"
            />
            <input
              type="datetime-local"
              value={portalAppointmentFilters.dateFrom}
              onChange={(e) => onPortalAppointmentFilterChange('dateFrom', e.target.value)}
              className="px-3 py-2 border border-app-input-border rounded-lg"
            />
            <input
              type="datetime-local"
              value={portalAppointmentFilters.dateTo}
              onChange={(e) => onPortalAppointmentFilterChange('dateTo', e.target.value)}
              className="px-3 py-2 border border-app-input-border rounded-lg"
            />
            <button
              type="button"
              onClick={onRefreshPortalAppointments}
              className="px-4 py-2 text-sm bg-app-surface-muted rounded-lg hover:bg-app-surface-muted"
            >
              Refresh Inbox
            </button>
          </div>

          <textarea
            value={portalReminderCustomMessage}
            onChange={(e) => onPortalReminderCustomMessageChange(e.target.value)}
            rows={2}
            placeholder="Optional custom reminder message used for manual sends."
            className="w-full px-3 py-2 border border-app-input-border rounded-lg"
          />

          {portalAppointmentsLoading ? (
            <p className="text-sm text-app-text-muted">Loading appointments...</p>
          ) : portalAppointments.length === 0 ? (
            <p className="text-sm text-app-text-muted">No appointments match current filters.</p>
          ) : (
            <div className="space-y-3">
              {portalAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className={`border rounded-lg p-3 ${
                    selectedPortalAppointmentId === appointment.id
                      ? 'border-app-accent'
                      : 'border-app-border'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-app-text">
                        {appointment.title}
                      </div>
                      <div className="text-xs text-app-text-muted">
                        {new Date(appointment.start_time).toLocaleString()}
                        {appointment.location ? ` • ${appointment.location}` : ''}
                      </div>
                      <div className="text-xs text-app-text-subtle mt-1">
                        {appointment.request_type} • {appointment.status}
                        {appointment.pending_reminder_jobs
                          ? ` • pending reminders: ${appointment.pending_reminder_jobs}`
                          : ''}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={portalAppointmentActionLoading}
                        onClick={() => onPortalAppointmentReminderHistory(appointment.id)}
                        className="px-3 py-1.5 text-xs bg-app-surface-muted rounded-lg hover:bg-app-surface-muted disabled:opacity-50"
                      >
                        Reminder History
                      </button>
                      <button
                        type="button"
                        disabled={portalAppointmentActionLoading}
                        onClick={() =>
                          onPortalSendAppointmentReminder(appointment.id, {
                            sendEmail: true,
                            sendSms: true,
                          })
                        }
                        className="px-3 py-1.5 text-xs bg-app-accent text-white rounded-lg hover:bg-app-accent-hover disabled:opacity-50"
                      >
                        Send Reminder
                      </button>
                      <button
                        type="button"
                        disabled={
                          portalAppointmentActionLoading ||
                          appointment.status === 'completed' ||
                          appointment.status === 'cancelled'
                        }
                        onClick={() => onPortalAppointmentCheckIn(appointment.id)}
                        className="px-3 py-1.5 text-xs bg-app-accent-soft text-app-accent-text rounded-lg hover:bg-app-accent-soft disabled:opacity-50"
                      >
                        Check-In
                      </button>
                      {appointment.status !== 'confirmed' && (
                        <button
                          type="button"
                          disabled={portalAppointmentActionLoading}
                          onClick={() =>
                            onPortalAppointmentStatusChange(appointment.id, 'confirmed')
                          }
                          className="px-3 py-1.5 text-xs bg-app-surface-muted rounded-lg hover:bg-app-surface-muted disabled:opacity-50"
                        >
                          Confirm
                        </button>
                      )}
                      {appointment.status !== 'cancelled' && (
                        <button
                          type="button"
                          disabled={portalAppointmentActionLoading}
                          onClick={() =>
                            onPortalAppointmentStatusChange(appointment.id, 'cancelled')
                          }
                          className="px-3 py-1.5 text-xs bg-app-accent-soft text-app-accent-text rounded-lg hover:bg-app-accent-soft disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {portalAppointmentsPagination.total_pages > 1 && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-app-text-muted">
                Page {portalAppointmentsPagination.page} of{' '}
                {portalAppointmentsPagination.total_pages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={portalAppointmentsPagination.page <= 1}
                  onClick={() =>
                    onPortalAppointmentPageChange(portalAppointmentsPagination.page - 1)
                  }
                  className="px-3 py-1.5 text-xs bg-app-surface-muted rounded-lg hover:bg-app-surface-muted disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={
                    portalAppointmentsPagination.page >=
                    portalAppointmentsPagination.total_pages
                  }
                  onClick={() =>
                    onPortalAppointmentPageChange(portalAppointmentsPagination.page + 1)
                  }
                  className="px-3 py-1.5 text-xs bg-app-surface-muted rounded-lg hover:bg-app-surface-muted disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {selectedPortalAppointmentId && (
            <div className="rounded-lg border border-app-border p-3">
              <h4 className="text-sm font-semibold text-app-text-heading">
                Reminder Details
              </h4>
              {portalAppointmentRemindersLoading ? (
                <p className="text-sm text-app-text-muted mt-2">Loading reminder details...</p>
              ) : !portalAppointmentReminders ? (
                <p className="text-sm text-app-text-muted mt-2">No reminder history loaded.</p>
              ) : (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-xs font-semibold text-app-text-muted uppercase">Jobs</h5>
                    {portalAppointmentReminders.jobs.length === 0 ? (
                      <p className="text-sm text-app-text-muted mt-2">No reminder jobs.</p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {portalAppointmentReminders.jobs.map((job) => (
                          <li key={job.id} className="text-xs border border-app-border rounded p-2">
                            <div className="font-medium text-app-text">
                              {job.cadence_key} • {job.channel}
                            </div>
                            <div className="text-app-text-muted">
                              {new Date(job.scheduled_for).toLocaleString()} • {job.status}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-app-text-muted uppercase">Deliveries</h5>
                    {portalAppointmentReminders.deliveries.length === 0 ? (
                      <p className="text-sm text-app-text-muted mt-2">No delivery history.</p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {portalAppointmentReminders.deliveries.map((delivery) => (
                          <li key={delivery.id} className="text-xs border border-app-border rounded p-2">
                            <div className="font-medium text-app-text">
                              {delivery.channel} • {delivery.delivery_status}
                            </div>
                            <div className="text-app-text-muted">
                              {new Date(delivery.sent_at).toLocaleString()} • {delivery.trigger_type}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-app-surface rounded-lg shadow-sm border border-app-border overflow-hidden">
        <div className="px-6 py-4 border-b border-app-border bg-app-surface-muted">
          <h3 className="text-lg font-semibold text-app-text-heading">Appointment Slots</h3>
          <p className="text-sm text-app-text-muted mt-1">
            Publish, close, and remove slots for client portal booking.
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
            <select
              value={portalSlotFilters.status}
              onChange={(e) => onPortalSlotFilterChange('status', e.target.value)}
              className="px-3 py-2 border border-app-input-border rounded-lg"
            >
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <input
              type="text"
              value={portalSlotFilters.caseId}
              onChange={(e) => onPortalSlotFilterChange('caseId', e.target.value)}
              placeholder="Case ID"
              className="px-3 py-2 border border-app-input-border rounded-lg"
            />
            <input
              type="text"
              value={portalSlotFilters.pointpersonUserId}
              onChange={(e) => onPortalSlotFilterChange('pointpersonUserId', e.target.value)}
              placeholder="Pointperson user ID"
              className="px-3 py-2 border border-app-input-border rounded-lg"
            />
            <input
              type="datetime-local"
              value={portalSlotFilters.from}
              onChange={(e) => onPortalSlotFilterChange('from', e.target.value)}
              className="px-3 py-2 border border-app-input-border rounded-lg"
            />
            <input
              type="datetime-local"
              value={portalSlotFilters.to}
              onChange={(e) => onPortalSlotFilterChange('to', e.target.value)}
              className="px-3 py-2 border border-app-input-border rounded-lg"
            />
            <button
              type="button"
              onClick={onRefreshPortalSlots}
              className="px-4 py-2 text-sm bg-app-surface-muted rounded-lg hover:bg-app-surface-muted"
            >
              Refresh Slots
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Pointperson user ID"
              value={portalSlotForm.pointperson_user_id}
              onChange={(e) => onPortalSlotFormChange('pointperson_user_id', e.target.value)}
              className="px-3 py-2 border border-app-input-border rounded-lg"
            />
            <input
              type="text"
              placeholder="Case ID (optional)"
              value={portalSlotForm.case_id}
              onChange={(e) => onPortalSlotFormChange('case_id', e.target.value)}
              className="px-3 py-2 border border-app-input-border rounded-lg"
            />
            <input
              type="text"
              placeholder="Title"
              value={portalSlotForm.title}
              onChange={(e) => onPortalSlotFormChange('title', e.target.value)}
              className="px-3 py-2 border border-app-input-border rounded-lg"
            />
            <input
              type="text"
              placeholder="Location"
              value={portalSlotForm.location}
              onChange={(e) => onPortalSlotFormChange('location', e.target.value)}
              className="px-3 py-2 border border-app-input-border rounded-lg"
            />
            <input
              type="datetime-local"
              value={portalSlotForm.start_time}
              onChange={(e) => onPortalSlotFormChange('start_time', e.target.value)}
              className="px-3 py-2 border border-app-input-border rounded-lg"
            />
            <input
              type="datetime-local"
              value={portalSlotForm.end_time}
              onChange={(e) => onPortalSlotFormChange('end_time', e.target.value)}
              className="px-3 py-2 border border-app-input-border rounded-lg"
            />
            <input
              type="number"
              min={1}
              max={200}
              value={portalSlotForm.capacity}
              onChange={(e) => onPortalSlotFormChange('capacity', Number(e.target.value))}
              className="px-3 py-2 border border-app-input-border rounded-lg"
            />
            <textarea
              placeholder="Details"
              value={portalSlotForm.details}
              onChange={(e) => onPortalSlotFormChange('details', e.target.value)}
              rows={2}
              className="px-3 py-2 border border-app-input-border rounded-lg"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onCreatePortalSlot}
              disabled={portalSlotSaving}
              className="px-4 py-2 text-sm bg-app-accent text-white rounded-lg hover:bg-app-accent-hover disabled:opacity-50"
            >
              {portalSlotSaving ? 'Saving...' : 'Create Slot'}
            </button>
          </div>

          {portalSlotsLoading && portalSlots.length === 0 ? (
            <p className="text-sm text-app-text-muted">Loading slots...</p>
          ) : portalSlots.length === 0 ? (
            <p className="text-sm text-app-text-muted">No slots configured.</p>
          ) : (
            <div className="space-y-2">
              {portalSlots.map((slot) => (
                <div key={slot.id} className="border border-app-border rounded-lg p-3">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-app-text">{slot.title || 'Appointment slot'}</div>
                      <div className="text-xs text-app-text-muted">
                        {new Date(slot.start_time).toLocaleString()} - {new Date(slot.end_time).toLocaleString()}
                      </div>
                      <div className="text-xs text-app-text-subtle">
                        {slot.case_number ? `${slot.case_number} • ` : ''}Status: {slot.status} • {slot.booked_count}/
                        {slot.capacity} booked
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdatePortalSlotStatus(
                            slot.id,
                            slot.status === 'open' ? 'closed' : 'open'
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-app-surface-muted rounded-lg hover:bg-app-surface-muted"
                      >
                        {slot.status === 'open' ? 'Close' : 'Open'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeletePortalSlot(slot.id)}
                        className="px-3 py-1.5 text-xs bg-app-accent-soft text-app-accent-text rounded-lg hover:bg-app-accent-soft"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {portalSlotsHasMore && (
            <div>
              <button
                type="button"
                onClick={onLoadMorePortalSlots}
                disabled={portalSlotsLoadingMore}
                className="px-4 py-2 text-sm bg-app-surface-muted rounded-lg hover:bg-app-surface-muted disabled:opacity-50"
              >
                {portalSlotsLoadingMore ? 'Loading...' : 'Load More Slots'}
              </button>
            </div>
          )}
        </div>
      </div>

      {selectedPortalUser && (
        <div className="bg-app-surface rounded-lg shadow-sm border border-app-border overflow-hidden">
          <div className="px-6 py-4 border-b border-app-border bg-app-surface-muted">
            <h3 className="text-lg font-semibold text-app-text-heading">Recent Portal Activity</h3>
            <p className="text-sm text-app-text-muted mt-1">
              Activity for {selectedPortalUser.email}
            </p>
          </div>
          <div className="p-6">
            {portalActivityLoading ? (
              <p className="text-sm text-app-text-muted">Loading activity...</p>
            ) : portalUserActivity.length === 0 ? (
              <p className="text-sm text-app-text-muted">No recent activity.</p>
            ) : (
              <div className="space-y-3">
                {portalUserActivity.map((activity) => (
                  <div key={activity.id} className="border border-app-border rounded-lg p-3">
                    <div className="text-xs text-app-text-muted uppercase">{activity.action}</div>
                    {activity.details && (
                      <div className="text-sm text-app-text mt-1">{activity.details}</div>
                    )}
                    <div className="text-xs text-app-text-subtle mt-1">
                      {new Date(activity.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
