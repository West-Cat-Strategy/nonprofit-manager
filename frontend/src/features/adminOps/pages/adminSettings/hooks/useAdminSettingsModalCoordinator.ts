import { useCallback } from 'react';
import type { UserSecurityInfo } from '../types';

interface UseAdminSettingsModalCoordinatorParams {
  selectedUser: UserSecurityInfo | null;
  setSelectedUser: (value: UserSecurityInfo | null | ((prev: UserSecurityInfo | null) => UserSecurityInfo | null)) => void;
  setUserAuditLogPage: (value: unknown) => void;
  setShowRoleModal: (value: boolean) => void;
  setEditingRole: (value: unknown) => void;
  setShowSecurityModal: (value: boolean) => void;
  setShowAccessModal: (value: boolean) => void;
  setUserAccessDraft: (value: { groups: string[]; organizationAccess: string[] }) => void;
  setShowResetPasswordModal: (value: boolean) => void;
  setNewPassword: (value: string) => void;
  setConfirmPassword: (value: string) => void;
  setShowResetEmailModal: (value: boolean) => void;
  setNewEmail: (value: string) => void;
  clearFormError: () => void;
  showSuccess: (message: string) => void;
}

export const useAdminSettingsModalCoordinator = ({
  selectedUser,
  setSelectedUser,
  setUserAuditLogPage,
  setShowRoleModal,
  setEditingRole,
  setShowSecurityModal,
  setShowAccessModal,
  setUserAccessDraft,
  setShowResetPasswordModal,
  setNewPassword,
  setConfirmPassword,
  setShowResetEmailModal,
  setNewEmail,
  clearFormError,
  showSuccess,
}: UseAdminSettingsModalCoordinatorParams) => {
  const handleCloseRoleModal = useCallback(() => {
    setShowRoleModal(false);
    setEditingRole(null);
  }, [setEditingRole, setShowRoleModal]);

  const handleCloseSecurityModal = useCallback(() => {
    setShowSecurityModal(false);
    setSelectedUser(null);
    setUserAuditLogPage(null);
  }, [setSelectedUser, setShowSecurityModal, setUserAuditLogPage]);

  const handleCloseAccessModal = useCallback(() => {
    setShowAccessModal(false);
    setSelectedUser(null);
    setUserAccessDraft({
      groups: [],
      organizationAccess: [],
    });
  }, [setSelectedUser, setShowAccessModal, setUserAccessDraft]);

  const handleOpenResetEmail = useCallback(() => {
    if (!selectedUser) {
      return;
    }

    setNewEmail(selectedUser.email);
    setShowResetEmailModal(true);
  }, [selectedUser, setNewEmail, setShowResetEmailModal]);

  const handleCloseResetPasswordModal = useCallback(() => {
    setShowResetPasswordModal(false);
    setNewPassword('');
    setConfirmPassword('');
    clearFormError();
  }, [clearFormError, setConfirmPassword, setNewPassword, setShowResetPasswordModal]);

  const handleCloseResetEmailModal = useCallback(() => {
    setShowResetEmailModal(false);
    setNewEmail('');
    clearFormError();
  }, [clearFormError, setNewEmail, setShowResetEmailModal]);

  const handleCopyInviteLink = useCallback(
    (value: string) => {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText(value);
      }

      showSuccess('Invitation link copied');
    },
    [showSuccess]
  );

  return {
    handleCloseRoleModal,
    handleCloseSecurityModal,
    handleCloseAccessModal,
    handleOpenResetEmail,
    handleCloseResetPasswordModal,
    handleCloseResetEmailModal,
    handleCopyInviteLink,
  };
};
