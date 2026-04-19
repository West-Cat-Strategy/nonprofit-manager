import { useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import ConfirmDialog from '../../../../components/ConfirmDialog';
import { useToast } from '../../../../contexts/useToast';
import { useApiError } from '../../../../hooks/useApiError';
import useConfirmDialog from '../../../../hooks/useConfirmDialog';
import usePortalAdminRealtime from '../../../portal/admin/usePortalAdminRealtime';
import type { PortalAdminPanel } from '../../adminRoutePaths';
import { portalAdminDefinitionByPanel } from '../../adminNavigationCatalog';
import AdminQuickActionsBar from '../../components/AdminQuickActionsBar';
import AdminWorkspaceShell from '../../components/AdminWorkspaceShell';
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

  const {
    portalRequests,
    portalInvitations,
    portalInviteEmail,
    setPortalInviteEmail,
    setPortalInviteContactId,
    portalInviteUrl,
    portalLoading,
    portalUsers,
    portalUsersLoading,
    portalUserSearch,
    setPortalUserSearch,
    portalUserActivity,
    portalActivityLoading,
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
    notifyError,
    onAppointmentUpdated,
  });

  const refreshPortalDataWithRealtime = useCallback(async () => {
    await refreshPortalData({
      refreshConversations: realtimePanelActive
        ? () => fetchPortalConversations({ offsetValue: 0 })
        : undefined,
      refreshSlots: realtimePanelActive ? () => fetchPortalSlots({ offsetValue: 0 }) : undefined,
    });
  }, [fetchPortalConversations, fetchPortalSlots, realtimePanelActive, refreshPortalData]);

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
      onRefreshPortal: refreshPortalDataWithRealtime,
      onApproveRequest: async (requestId: string) => {
        await handleApprovePortalRequest(requestId);
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
      portalConversationsLoadingMore,
      portalConversationsHasMore,
      portalConversations,
      selectedPortalConversation,
      portalConversationReply,
      portalConversationReplyInternal,
      portalConversationReplyLoading,
      onRefreshPortalConversations: () => fetchPortalConversations({ offsetValue: 0 }),
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
      portalSlotsLoadingMore,
      portalSlotsHasMore,
      portalSlots,
      portalSlotSaving,
      portalSlotForm,
      onPortalSlotFormChange,
      onCreatePortalSlot: createPortalSlot,
      onRefreshPortalSlots: () => fetchPortalSlots({ offsetValue: 0 }),
      onLoadMorePortalSlots: loadMorePortalSlots,
      onUpdatePortalSlotStatus: updatePortalSlotStatus,
      onDeletePortalSlot: handleDeletePortalSlot,
      portalAppointments,
      portalAppointmentsLoading,
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
      fetchPortalConversations,
      fetchPortalSlots,
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
      portalConversationsHasMore,
      portalConversationsLoading,
      portalConversationsLoadingMore,
      portalInviteEmail,
      portalInviteUrl,
      portalInvitations,
      portalLoading,
      portalReminderCustomMessage,
      portalRequests,
      portalActivityLoading,
      portalSelectedAppointmentId,
      portalSlotFilters,
      portalSlotForm,
      portalSlotSaving,
      portalSlots,
      portalSlotsHasMore,
      portalSlotsLoading,
      portalSlotsLoadingMore,
      portalStreamStatus,
      portalUserActivity,
      portalUserSearch,
      portalUsers,
      portalUsersLoading,
      refreshPortalDataWithRealtime,
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
      <AdminQuickActionsBar role="admin" />
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
