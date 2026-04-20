import { useCallback, useEffect } from 'react';
import type { ConfirmOptions } from '../../../../../hooks/useConfirmDialog';
import { useStaffInvitations } from '../../../../invitations/hooks/useStaffInvitations';
import { useUserGroupsAndAccess } from './useUserGroupsAndAccess';
import { useUserLookupSecurity } from './useUserLookupSecurity';

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;
type NotifyFn = (message: string) => void;

export const useUsersSettings = ({
  activeSection,
  confirm,
  setFormErrorFromError,
  clearFormError,
  showSuccess,
  showError,
}: {
  activeSection: string;
  confirm: ConfirmFn;
  setFormErrorFromError: (error: unknown, fallbackMessage?: string) => void;
  clearFormError: () => void;
  showSuccess: NotifyFn;
  showError: NotifyFn;
}) => {
  const groupsAndAccess = useUserGroupsAndAccess({
    confirm,
    setFormErrorFromError,
    showSuccess,
    showError,
  });

  const lookupSecurity = useUserLookupSecurity({
    clearFormError,
    setFormErrorFromError,
    loadUserDetails: groupsAndAccess.loadUserDetails,
    setUserAccessDraft: groupsAndAccess.setUserAccessDraft,
    showSuccess,
    showError,
  });

  const invitations = useStaffInvitations({
    confirm,
    setFormErrorFromError,
    clearFormError,
    showSuccess,
    showError,
  });
  const fetchInvitations = invitations.fetchInvitations;
  const loadGroupsAndAccounts = groupsAndAccess.loadGroupsAndAccounts;

  useEffect(() => {
    if (activeSection === 'users') {
      void fetchInvitations();
    }
  }, [activeSection, fetchInvitations]);

  useEffect(() => {
    if (activeSection === 'users' || activeSection === 'groups') {
      void loadGroupsAndAccounts();
    }
  }, [activeSection, loadGroupsAndAccounts]);

  const handleSaveUserAccess = useCallback(
    async () =>
      groupsAndAccess.handleSaveUserAccess(lookupSecurity.selectedUser, {
        setSelectedUser: lookupSecurity.setSelectedUser,
        setShowAccessModal: lookupSecurity.setShowAccessModal,
      }),
    [
      groupsAndAccess,
      lookupSecurity.selectedUser,
      lookupSecurity.setSelectedUser,
      lookupSecurity.setShowAccessModal,
    ]
  );

  return {
    ...lookupSecurity,
    showInviteModal: invitations.showInviteModal,
    setShowInviteModal: invitations.setShowInviteModal,
    invitations: invitations.invitations,
    setInvitations: invitations.setInvitations,
    inviteEmail: invitations.inviteEmail,
    setInviteEmail: invitations.setInviteEmail,
    inviteRole: invitations.inviteRole,
    setInviteRole: invitations.setInviteRole,
    inviteMessage: invitations.inviteMessage,
    setInviteMessage: invitations.setInviteMessage,
    inviteUrl: invitations.inviteUrl,
    setInviteUrl: invitations.setInviteUrl,
    inviteEmailDelivery: invitations.inviteEmailDelivery,
    setInviteEmailDelivery: invitations.setInviteEmailDelivery,
    inviteEmailConfigured: invitations.inviteEmailConfigured,
    setInviteEmailConfigured: invitations.setInviteEmailConfigured,
    inviteCapabilitiesLoading: invitations.inviteCapabilitiesLoading,
    setInviteCapabilitiesLoading: invitations.setInviteCapabilitiesLoading,
    isCreatingInvite: invitations.isCreatingInvite,
    setIsCreatingInvite: invitations.setIsCreatingInvite,
    fetchInvitations: invitations.fetchInvitations,
    fetchInviteCapabilities: invitations.fetchInviteCapabilities,
    handleCreateInvitation: invitations.handleCreateInvitation,
    handleRevokeInvitation: invitations.handleRevokeInvitation,
    handleResendInvitation: invitations.handleResendInvitation,
    resetInviteModal: invitations.resetInviteModal,
    ...groupsAndAccess,
    handleSaveUserAccess,
  };
};
