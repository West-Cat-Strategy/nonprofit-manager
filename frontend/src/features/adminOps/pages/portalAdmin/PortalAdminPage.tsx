import { useCallback, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import ConfirmDialog from '../../../../components/ConfirmDialog';
import { useToast } from '../../../../contexts/useToast';
import { useApiError } from '../../../../hooks/useApiError';
import useConfirmDialog from '../../../../hooks/useConfirmDialog';
import usePortalAdminRealtime from '../../../portal/admin/usePortalAdminRealtime';
import type { PortalAdminPanel } from '../../adminRoutePaths';
import { portalAdminDefinitionByPanel } from '../../adminNavigationCatalog';
import AdminWorkspaceShell from '../../components/AdminWorkspaceShell';
import {
  AdminMetricGrid,
  AdminMetricTile,
  AdminStatusPill,
  AdminWorkspaceSection,
} from '../../components/AdminWorkspacePrimitives';
import PortalResetPasswordModal from '../adminSettings/components/PortalResetPasswordModal';
import { usePortalSettings } from '../adminSettings/hooks/usePortalSettings';
import type { PortalSectionProps } from '../adminSettings/sections/PortalSection';
import AccessPanel from './panels/AccessPanel';
import AppointmentsPanel from './panels/AppointmentsPanel';
import ConversationsPanel from './panels/ConversationsPanel';
import SlotsPanel from './panels/SlotsPanel';
import UsersPanel from './panels/UsersPanel';

interface PortalAdminPageProps {
  panel: PortalAdminPanel;
}

const pluralize = (count: number, singular: string, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;

const metricValue = (count: number, options: { loading?: boolean; error?: string | null }) => {
  if (options.error) return 'Load failed';
  if (options.loading) return 'Loading';
  return count;
};

const metricTone = (
  count: number,
  options: { loading?: boolean; error?: string | null; activeTone?: 'warning' | 'success' | 'info' }
) => {
  if (options.error) return 'danger';
  if (options.loading) return 'info';
  return count ? (options.activeTone ?? 'warning') : 'neutral';
};

const metricHelper = ({
  count,
  loadedHelper,
  emptyHelper,
  loading,
  error,
}: {
  count: number;
  loadedHelper: string;
  emptyHelper: string;
  loading?: boolean;
  error?: string | null;
}) => {
  if (error) return 'Refresh before treating this queue as empty.';
  if (loading) return 'Checking the latest portal data.';
  return count ? loadedHelper : emptyHelper;
};

export default function PortalAdminPage({ panel }: PortalAdminPageProps) {
  const location = useLocation();
  const { showSuccess, showError } = useToast();
  const { dialogState, confirm, handleConfirm, handleCancel } = useConfirmDialog();
  const {
    error: formError,
    setFromError: setFormErrorFromError,
    clear: clearFormError,
  } = useApiError();
  const { setFromError: notifyError } = useApiError({ notify: true });
  const [portalConversationsError, setPortalConversationsError] = useState<string | null>(null);
  const [portalSlotsError, setPortalSlotsError] = useState<string | null>(null);

  const notifyPortalRealtimeError = useCallback(
    (error: unknown, fallback: string) => {
      if (fallback === 'Failed to load portal conversations') {
        setPortalConversationsError(
          'Could not load portal conversations. Refresh this panel before treating the queue as empty.'
        );
      }

      if (fallback === 'Failed to load appointment slots') {
        setPortalSlotsError(
          'Could not load appointment slots. Refresh this panel before treating the queue as empty.'
        );
      }

      notifyError(error, fallback);
    },
    [notifyError]
  );

  const {
    portalRequests,
    portalRequestsError,
    portalInvitations,
    portalInvitationsError,
    portalInviteEmail,
    setPortalInviteEmail,
    setPortalInviteContactId,
    portalInviteUrl,
    portalLoading,
    portalUsers,
    portalUsersLoading,
    portalUsersError,
    portalUserSearch,
    setPortalUserSearch,
    portalUserActivity,
    portalActivityLoading,
    portalActivityError,
    selectedPortalUser,
    portalResetTarget,
    setPortalResetTarget,
    portalResetPassword,
    setPortalResetPassword,
    portalResetConfirmPassword,
    setPortalResetConfirmPassword,
    portalResetLoading,
    showPortalResetModal,
    setShowPortalResetModal,
    portalContactSearch,
    setPortalContactSearch,
    portalContactResults,
    setPortalContactResults,
    portalContactLoading,
    selectedPortalContact,
    setSelectedPortalContact,
    portalAppointments,
    portalAppointmentsLoading,
    portalAppointmentsError,
    portalAppointmentsPagination,
    portalAppointmentFilters,
    portalSelectedAppointmentId,
    portalAppointmentReminders,
    portalAppointmentRemindersLoading,
    portalAppointmentActionLoading,
    portalReminderCustomMessage,
    setPortalReminderCustomMessage,
    onAppointmentUpdated,
    refreshPortalData,
    fetchPortalUsers,
    fetchPortalAppointments,
    handleApprovePortalRequest,
    handleRejectPortalRequest,
    handleCreatePortalInvite,
    handlePortalAppointmentFilterChange,
    handlePortalAppointmentStatusChange,
    handlePortalAppointmentCheckIn,
    handlePortalAppointmentReminderHistory,
    handlePortalSendAppointmentReminder,
    handlePortalUserStatusChange,
    handlePortalUserActivity,
    handlePortalPasswordReset,
  } = usePortalSettings({
    activeSection: 'portal',
    showSuccess,
    showError,
    notifyError,
    confirm,
    setFormErrorFromError,
    clearFormError,
  });

  const realtimePanelActive = panel === 'conversations' || panel === 'slots';

  const {
    streamStatus: portalStreamStatus,
    conversationFilters: portalConversationFilters,
    onConversationFilterChange: onPortalConversationFilterChange,
    portalConversationsLoading,
    portalConversationsLoadingMore,
    portalConversationsHasMore,
    portalConversations,
    selectedPortalConversation,
    portalConversationReply,
    setPortalConversationReply,
    portalConversationReplyInternal,
    setPortalConversationReplyInternal,
    portalConversationReplyLoading,
    fetchPortalConversations,
    loadMorePortalConversations,
    openPortalConversation,
    sendPortalConversationReply,
    retryPortalConversationReply,
    updatePortalConversationStatus,
    slotFilters: portalSlotFilters,
    onSlotFilterChange: onPortalSlotFilterChange,
    portalSlotsLoading,
    portalSlotsLoadingMore,
    portalSlotsHasMore,
    portalSlots,
    portalSlotSaving,
    portalSlotForm,
    onPortalSlotFormChange,
    fetchPortalSlots,
    loadMorePortalSlots,
    createPortalSlot,
    updatePortalSlotStatus,
    deletePortalSlot,
  } = usePortalAdminRealtime({
    active: realtimePanelActive,
    showSuccess,
    showError,
    notifyError: notifyPortalRealtimeError,
    onAppointmentUpdated,
  });

  const refreshPortalConversations = useCallback(
    async (options?: { offsetValue?: number }) => {
      setPortalConversationsError(null);
      await fetchPortalConversations(options);
    },
    [fetchPortalConversations]
  );

  const refreshPortalSlots = useCallback(
    async (options?: { offsetValue?: number }) => {
      setPortalSlotsError(null);
      await fetchPortalSlots(options);
    },
    [fetchPortalSlots]
  );

  const refreshPortalDataWithRealtime = useCallback(async () => {
    await refreshPortalData({
      refreshConversations: realtimePanelActive
        ? () => refreshPortalConversations({ offsetValue: 0 })
        : undefined,
      refreshSlots: realtimePanelActive ? () => refreshPortalSlots({ offsetValue: 0 }) : undefined,
    });
  }, [realtimePanelActive, refreshPortalConversations, refreshPortalData, refreshPortalSlots]);

  const handleDeletePortalSlot = useCallback(
    async (slotId: string) => {
      const confirmed = await confirm({
        title: 'Delete Appointment Slot',
        message: 'This slot will be permanently deleted. Continue?',
        confirmLabel: 'Delete',
        variant: 'danger',
      });
      if (!confirmed) return;

      await deletePortalSlot(slotId);
    },
    [confirm, deletePortalSlot]
  );

  const portalSectionProps: Omit<PortalSectionProps, 'visiblePanels'> = useMemo(
    () => ({
      portalInviteUrl,
      portalLoading,
      portalRequestsError,
      portalRequests,
      portalInviteEmail,
      portalContactSearch,
      portalContactLoading,
      portalContactResults,
      selectedPortalContact,
      portalInvitations,
      portalInvitationsError,
      portalUsers,
      portalUsersLoading,
      portalUsersError,
      portalUserSearch,
      selectedPortalUser,
      portalUserActivity,
      portalActivityLoading,
      portalActivityError,
      formError,
      onRefreshPortal: refreshPortalDataWithRealtime,
      onApproveRequest: async (requestId: string, payload?: { contact_id: string }) => {
        await handleApprovePortalRequest(requestId, payload);
        await refreshPortalDataWithRealtime();
      },
      onRejectRequest: async (requestId: string) => {
        await handleRejectPortalRequest(requestId);
        await refreshPortalDataWithRealtime();
      },
      onPortalInviteEmailChange: setPortalInviteEmail,
      onPortalContactSearchChange: setPortalContactSearch,
      onSelectPortalContact: (contact) => {
        setSelectedPortalContact(contact);
        setPortalInviteContactId(contact.contact_id);
        if (contact.email) {
          setPortalInviteEmail(contact.email);
        }
        setPortalContactResults([]);
        setPortalContactSearch('');
      },
      onClearPortalContact: () => {
        setSelectedPortalContact(null);
        setPortalInviteContactId('');
      },
      onCreateInvitation: async () => {
        await handleCreatePortalInvite();
        await refreshPortalDataWithRealtime();
      },
      onPortalUserSearchChange: setPortalUserSearch,
      onRefreshUsers: () => fetchPortalUsers(portalUserSearch),
      onViewUserActivity: handlePortalUserActivity,
      onToggleUserStatus: handlePortalUserStatusChange,
      onOpenResetModal: (user) => {
        setPortalResetTarget(user);
        setPortalResetPassword('');
        setPortalResetConfirmPassword('');
        setShowPortalResetModal(true);
      },
      portalStreamStatus,
      portalConversationFilters,
      onPortalConversationFilterChange,
      portalConversationsLoading,
      portalConversationsError,
      portalConversationsLoadingMore,
      portalConversationsHasMore,
      portalConversations,
      selectedPortalConversation,
      portalConversationReply,
      portalConversationReplyInternal,
      portalConversationReplyLoading,
      onRefreshPortalConversations: () => refreshPortalConversations({ offsetValue: 0 }),
      onLoadMorePortalConversations: loadMorePortalConversations,
      onOpenPortalConversation: openPortalConversation,
      onPortalConversationReplyChange: setPortalConversationReply,
      onPortalConversationReplyInternalChange: setPortalConversationReplyInternal,
      onSendPortalConversationReply: sendPortalConversationReply,
      onRetryPortalConversationReply: retryPortalConversationReply,
      onUpdatePortalConversationStatus: updatePortalConversationStatus,
      portalSlotFilters,
      onPortalSlotFilterChange,
      portalSlotsLoading,
      portalSlotsError,
      portalSlotsLoadingMore,
      portalSlotsHasMore,
      portalSlots,
      portalSlotSaving,
      portalSlotForm,
      onPortalSlotFormChange,
      onCreatePortalSlot: createPortalSlot,
      onRefreshPortalSlots: () => refreshPortalSlots({ offsetValue: 0 }),
      onLoadMorePortalSlots: loadMorePortalSlots,
      onUpdatePortalSlotStatus: updatePortalSlotStatus,
      onDeletePortalSlot: handleDeletePortalSlot,
      portalAppointments,
      portalAppointmentsLoading,
      portalAppointmentsError,
      portalAppointmentsPagination,
      portalAppointmentFilters,
      onPortalAppointmentFilterChange: handlePortalAppointmentFilterChange,
      onPortalAppointmentPageChange: (page) => {
        void fetchPortalAppointments(page);
      },
      onRefreshPortalAppointments: () => {
        void fetchPortalAppointments(portalAppointmentsPagination.page);
      },
      onPortalAppointmentStatusChange: handlePortalAppointmentStatusChange,
      onPortalAppointmentCheckIn: handlePortalAppointmentCheckIn,
      selectedPortalAppointmentId: portalSelectedAppointmentId,
      portalAppointmentReminders,
      portalAppointmentRemindersLoading,
      portalAppointmentActionLoading,
      onPortalAppointmentReminderHistory: handlePortalAppointmentReminderHistory,
      portalReminderCustomMessage,
      onPortalReminderCustomMessageChange: setPortalReminderCustomMessage,
      onPortalSendAppointmentReminder: handlePortalSendAppointmentReminder,
    }),
    [
      fetchPortalAppointments,
      fetchPortalUsers,
      formError,
      handleApprovePortalRequest,
      handleCreatePortalInvite,
      handleDeletePortalSlot,
      handlePortalAppointmentCheckIn,
      handlePortalAppointmentFilterChange,
      handlePortalAppointmentReminderHistory,
      handlePortalAppointmentStatusChange,
      handlePortalSendAppointmentReminder,
      handlePortalUserActivity,
      handlePortalUserStatusChange,
      handleRejectPortalRequest,
      loadMorePortalConversations,
      loadMorePortalSlots,
      onPortalConversationFilterChange,
      onPortalSlotFilterChange,
      onPortalSlotFormChange,
      openPortalConversation,
      portalAppointmentActionLoading,
      portalAppointmentFilters,
      portalAppointmentReminders,
      portalAppointmentRemindersLoading,
      portalAppointments,
      portalAppointmentsError,
      portalAppointmentsLoading,
      portalAppointmentsPagination,
      portalContactLoading,
      portalContactResults,
      portalContactSearch,
      portalConversationFilters,
      portalConversationReply,
      portalConversationReplyInternal,
      portalConversationReplyLoading,
      portalConversations,
      portalConversationsError,
      portalConversationsHasMore,
      portalConversationsLoading,
      portalConversationsLoadingMore,
      portalInviteEmail,
      portalInviteUrl,
      portalInvitations,
      portalInvitationsError,
      portalLoading,
      portalReminderCustomMessage,
      portalRequests,
      portalRequestsError,
      portalActivityError,
      portalActivityLoading,
      portalSelectedAppointmentId,
      portalSlotFilters,
      portalSlotForm,
      portalSlotSaving,
      portalSlots,
      portalSlotsError,
      portalSlotsHasMore,
      portalSlotsLoading,
      portalSlotsLoadingMore,
      portalStreamStatus,
      portalUserActivity,
      portalUserSearch,
      portalUsers,
      portalUsersError,
      portalUsersLoading,
      refreshPortalDataWithRealtime,
      refreshPortalConversations,
      refreshPortalSlots,
      retryPortalConversationReply,
      selectedPortalContact,
      selectedPortalConversation,
      selectedPortalUser,
      sendPortalConversationReply,
      setPortalConversationReply,
      setPortalConversationReplyInternal,
      setPortalContactResults,
      setPortalContactSearch,
      setPortalInviteContactId,
      setPortalInviteEmail,
      setPortalReminderCustomMessage,
      setPortalResetConfirmPassword,
      setPortalResetPassword,
      setPortalResetTarget,
      setPortalUserSearch,
      setSelectedPortalContact,
      setShowPortalResetModal,
      updatePortalConversationStatus,
      updatePortalSlotStatus,
      createPortalSlot,
    ]
  );

  const panelContent = {
    access: <AccessPanel {...portalSectionProps} />,
    users: <UsersPanel {...portalSectionProps} />,
    conversations: <ConversationsPanel {...portalSectionProps} />,
    appointments: <AppointmentsPanel {...portalSectionProps} />,
    slots: <SlotsPanel {...portalSectionProps} />,
  }[panel];
  const panelMeta = portalAdminDefinitionByPanel.get(panel);
  const contactResolutionCount = portalRequests.filter(
    (request) => request.resolution_status === 'needs_contact_resolution'
  ).length;
  const unreadConversationCount = portalConversations.reduce(
    (total, conversation) => total + conversation.unread_count,
    0
  );
  const requestedAppointmentCount = portalAppointments.filter(
    (appointment) => appointment.status === 'requested'
  ).length;
  const pendingReminderCount = portalAppointments.reduce(
    (total, appointment) => total + (appointment.pending_reminder_jobs ?? 0),
    0
  );
  const openSlotCount = portalSlots.filter((slot) => slot.status === 'open').length;

  return (
    <AdminWorkspaceShell
      title={panelMeta?.title ?? 'Portal Ops'}
      description={
        panelMeta?.description ??
        'Manage portal operations, requests, conversations, appointments, and availability.'
      }
      currentPath={location.pathname}
      mode="portal"
    >
      <AdminWorkspaceSection
        title="Portal Triage"
        description="Queue signals across access, conversations, appointments, and availability. Counts reflect the data currently loaded for this workspace."
        actions={
          <AdminStatusPill tone={portalStreamStatus === 'connected' ? 'success' : 'info'}>
            {portalStreamStatus === 'connected' ? 'Live updates on' : 'Polling updates'}
          </AdminStatusPill>
        }
      >
        <AdminMetricGrid className="xl:grid-cols-5">
          <AdminMetricTile
            label="Signup requests"
            value={metricValue(portalRequests.length, {
              loading: portalLoading,
              error: portalRequestsError,
            })}
            helper={metricHelper({
              count: portalRequests.length,
              loadedHelper: contactResolutionCount
                ? pluralize(contactResolutionCount, 'contact match')
                : 'Ready queue',
              emptyHelper: 'Ready queue',
              loading: portalLoading,
              error: portalRequestsError,
            })}
            tone={metricTone(portalRequests.length, {
              loading: portalLoading,
              error: portalRequestsError,
            })}
          />
          <AdminMetricTile
            label="Unread replies"
            value={metricValue(unreadConversationCount, {
              loading: portalConversationsLoading,
              error: portalConversationsError,
            })}
            helper={metricHelper({
              count: portalConversations.length,
              loadedHelper: `${portalConversations.length} loaded threads`,
              emptyHelper: 'No loaded threads',
              loading: portalConversationsLoading,
              error: portalConversationsError,
            })}
            tone={metricTone(unreadConversationCount, {
              loading: portalConversationsLoading,
              error: portalConversationsError,
            })}
          />
          <AdminMetricTile
            label="Appointments"
            value={metricValue(requestedAppointmentCount, {
              loading: portalAppointmentsLoading,
              error: portalAppointmentsError,
            })}
            helper={metricHelper({
              count: requestedAppointmentCount,
              loadedHelper: 'Need confirmation',
              emptyHelper: 'No requested items loaded',
              loading: portalAppointmentsLoading,
              error: portalAppointmentsError,
            })}
            tone={metricTone(requestedAppointmentCount, {
              loading: portalAppointmentsLoading,
              error: portalAppointmentsError,
            })}
          />
          <AdminMetricTile
            label="Reminders"
            value={metricValue(pendingReminderCount, {
              loading: portalAppointmentsLoading,
              error: portalAppointmentsError,
            })}
            helper={metricHelper({
              count: pendingReminderCount,
              loadedHelper: 'Pending jobs loaded',
              emptyHelper: 'No pending jobs loaded',
              loading: portalAppointmentsLoading,
              error: portalAppointmentsError,
            })}
            tone={metricTone(pendingReminderCount, {
              loading: portalAppointmentsLoading,
              error: portalAppointmentsError,
              activeTone: 'info',
            })}
          />
          <AdminMetricTile
            label="Open slots"
            value={metricValue(openSlotCount, {
              loading: portalSlotsLoading,
              error: portalSlotsError,
            })}
            helper={metricHelper({
              count: portalSlots.length,
              loadedHelper: `${portalSlots.length} loaded slots`,
              emptyHelper: 'No loaded slots',
              loading: portalSlotsLoading,
              error: portalSlotsError,
            })}
            tone={metricTone(openSlotCount, {
              loading: portalSlotsLoading,
              error: portalSlotsError,
              activeTone: 'success',
            })}
          />
        </AdminMetricGrid>
      </AdminWorkspaceSection>
      {panelContent}

      <PortalResetPasswordModal
        open={showPortalResetModal}
        target={portalResetTarget}
        password={portalResetPassword}
        confirmPassword={portalResetConfirmPassword}
        loading={portalResetLoading}
        onPasswordChange={setPortalResetPassword}
        onConfirmPasswordChange={setPortalResetConfirmPassword}
        onClose={() => {
          setShowPortalResetModal(false);
          setPortalResetTarget(null);
          setPortalResetPassword('');
          setPortalResetConfirmPassword('');
          clearFormError();
        }}
        onSubmit={handlePortalPasswordReset}
      />

      <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </AdminWorkspaceShell>
  );
}
