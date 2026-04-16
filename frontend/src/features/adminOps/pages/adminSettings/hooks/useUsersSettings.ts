import { useCallback, useEffect } from 'react';
import type { ConfirmOptions } from '../../../../../hooks/useConfirmDialog';
import { useUserGroupsAndAccess } from './useUserGroupsAndAccess';
import { useUserInvitations } from './useUserInvitations';
import { useUserLookupSecurity } from './useUserLookupSecurity';

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

export const useUsersSettings = ({
  activeSection,
  confirm,
  setFormErrorFromError,
  clearFormError,
}: {
  activeSection: string;
  confirm: ConfirmFn;
  setFormErrorFromError: (error: unknown, fallbackMessage?: string) => void;
  clearFormError: () => void;
}) => {
  const groupsAndAccess = useUserGroupsAndAccess({
    confirm,
    setFormErrorFromError,
  });

  const lookupSecurity = useUserLookupSecurity({
    clearFormError,
    setFormErrorFromError,
    loadUserDetails: groupsAndAccess.loadUserDetails,
    setUserAccessDraft: groupsAndAccess.setUserAccessDraft,
  });

  const invitations = useUserInvitations({
    confirm,
    setFormErrorFromError,
    clearFormError,
  });

  useEffect(() => {
    if (activeSection === 'users') {
      void invitations.fetchInvitations();
    }
  }, [activeSection, invitations.fetchInvitations]);

  useEffect(() => {
    if (activeSection === 'users' || activeSection === 'groups') {
      void groupsAndAccess.loadGroupsAndAccounts();
    }
  }, [activeSection, groupsAndAccess.loadGroupsAndAccounts]);

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
