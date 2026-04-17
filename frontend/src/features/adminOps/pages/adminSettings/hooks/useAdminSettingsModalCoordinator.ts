import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { AuditLogPage, Role, UserSecurityInfo } from '../types';

type StateSetter<T> = Dispatch<SetStateAction<T>>;

interface UseAdminSettingsModalCoordinatorParams {
  selectedUser: UserSecurityInfo | null;
  setSelectedUser: StateSetter<UserSecurityInfo | null>;
  setUserAuditLogPage: StateSetter<AuditLogPage | null>;
  setShowRoleModal: StateSetter<boolean>;
  setEditingRole: StateSetter<Role | null>;
  setShowSecurityModal: StateSetter<boolean>;
  setShowAccessModal: StateSetter<boolean>;
  setUserAccessDraft: StateSetter<{ groups: string[]; organizationAccess: string[] }>;
  setShowResetPasswordModal: StateSetter<boolean>;
  setNewPassword: StateSetter<string>;
  setConfirmPassword: StateSetter<string>;
  setShowResetEmailModal: StateSetter<boolean>;
  setNewEmail: StateSetter<string>;
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
