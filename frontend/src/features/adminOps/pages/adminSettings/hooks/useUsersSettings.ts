import { useCallback, useEffect, useState } from 'react';
import api from '../../../../../services/api';
import type { ConfirmOptions } from '../../../../../hooks/useConfirmDialog';
import type {
  AuditLog,
  UserInvitation,
  UserSearchResult,
  UserSecurityInfo,
} from '../types';

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

type UseUsersSettingsParams = {
  activeSection: string;
  confirm: ConfirmFn;
  setFormErrorFromError: (error: unknown, fallbackMessage?: string) => void;
  clearFormError: () => void;
};

export const useUsersSettings = ({
  activeSection,
  confirm,
  setFormErrorFromError,
  clearFormError,
}: UseUsersSettingsParams) => {
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSecurityInfo | null>(null);
  const [userAuditLogs, setUserAuditLogs] = useState<AuditLog[]>([]);

  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showResetEmailModal, setShowResetEmailModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteEmailDelivery, setInviteEmailDelivery] = useState<{
    requested: boolean;
    sent: boolean;
    reason?: string;
  } | null>(null);
  const [inviteEmailConfigured, setInviteEmailConfigured] = useState<boolean>(false);
  const [inviteCapabilitiesLoading, setInviteCapabilitiesLoading] = useState(false);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setUserSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await api.get(`/users?search=${encodeURIComponent(query)}&limit=10`);
      setUserSearchResults(response.data.users || []);
    } catch {
      setUserSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      void searchUsers(userSearchQuery);
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [userSearchQuery, searchUsers]);

  const fetchUserSecurityInfo = useCallback(async (userId: string) => {
    try {
      const [userResponse, logsResponse] = await Promise.all([
        api.get(`/users/${userId}`),
        api.get(`/admin/users/${userId}/audit-logs`).catch(() => ({ data: { logs: [] } })),
      ]);
      setSelectedUser(userResponse.data);
      setUserAuditLogs(logsResponse.data.logs || []);
      setShowSecurityModal(true);
    } catch {
      alert('Failed to load user information');
    }
  }, []);

  const handleResetUserPassword = useCallback(async () => {
    if (!selectedUser) return;
    clearFormError();

    if (newPassword !== confirmPassword) {
      setFormErrorFromError(new Error('Passwords do not match'), 'Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setFormErrorFromError(
        new Error('Password must be at least 8 characters'),
        'Password must be at least 8 characters'
      );
      return;
    }

    try {
      await api.put(`/users/${selectedUser.id}/password`, { password: newPassword });
      setShowResetPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
      alert('Password has been reset successfully');
    } catch {
      setFormErrorFromError(new Error('Failed to reset password'), 'Failed to reset password');
    }
  }, [
    clearFormError,
    confirmPassword,
    newPassword,
    selectedUser,
    setFormErrorFromError,
  ]);

  const handleResetUserEmail = useCallback(async () => {
    if (!selectedUser) return;
    clearFormError();

    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      setFormErrorFromError(
        new Error('Please enter a valid email address'),
        'Please enter a valid email address'
      );
      return;
    }

    try {
      await api.put(`/users/${selectedUser.id}`, { email: newEmail });
      setShowResetEmailModal(false);
      setNewEmail('');
      setSelectedUser((prev) => (prev ? { ...prev, email: newEmail } : null));
      alert('Email has been updated successfully');
    } catch {
      setFormErrorFromError(new Error('Failed to update email'), 'Failed to update email');
    }
  }, [clearFormError, newEmail, selectedUser, setFormErrorFromError]);

  const handleToggleUserLock = useCallback(async () => {
    if (!selectedUser) return;

    try {
      await api.put(`/users/${selectedUser.id}`, { isLocked: !selectedUser.isLocked });
      setSelectedUser((prev) => (prev ? { ...prev, isLocked: !prev.isLocked } : null));
    } catch {
      alert('Failed to update user lock status');
    }
  }, [selectedUser]);

  const fetchInvitations = useCallback(async () => {
    try {
      const response = await api.get('/invitations');
      setInvitations(response.data.invitations || []);
    } catch {
      // Silently fail - invitations are optional
    }
  }, []);

  useEffect(() => {
    if (activeSection === 'users') {
      void fetchInvitations();
    }
  }, [activeSection, fetchInvitations]);

  const fetchInviteCapabilities = useCallback(async () => {
    try {
      setInviteCapabilitiesLoading(true);
      const response = await api.get('/admin/email-settings');
      setInviteEmailConfigured(Boolean(response.data?.data?.isConfigured));
    } catch {
      setInviteEmailConfigured(false);
    } finally {
      setInviteCapabilitiesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showInviteModal) {
      void fetchInviteCapabilities();
    }
  }, [showInviteModal, fetchInviteCapabilities]);

  const handleCreateInvitation = useCallback(
    async (sendEmail: boolean) => {
      if (!inviteEmail) {
        setFormErrorFromError(new Error('Email is required'), 'Email is required');
        return;
      }

      setIsCreatingInvite(true);
      clearFormError();

      try {
        const response = await api.post('/invitations', {
          email: inviteEmail,
          role: inviteRole,
          message: inviteMessage || undefined,
          sendEmail,
        });

        setInviteUrl(response.data.inviteUrl);
        setInviteEmailDelivery(response.data.emailDelivery || null);
        await fetchInvitations();
      } catch (error: unknown) {
        setFormErrorFromError(error, 'Failed to create invitation');
      } finally {
        setIsCreatingInvite(false);
      }
    },
    [
      clearFormError,
      fetchInvitations,
      inviteEmail,
      inviteMessage,
      inviteRole,
      setFormErrorFromError,
    ]
  );

  const handleRevokeInvitation = useCallback(
    async (invitationId: string) => {
      const confirmed = await confirm({
        title: 'Revoke Invitation',
        message: 'Are you sure you want to revoke this invitation?',
        confirmLabel: 'Revoke',
        variant: 'warning',
      });
      if (!confirmed) return;

      try {
        await api.delete(`/invitations/${invitationId}`);
        await fetchInvitations();
      } catch {
        alert('Failed to revoke invitation');
      }
    },
    [confirm, fetchInvitations]
  );

  const handleResendInvitation = useCallback(
    async (invitationId: string) => {
      try {
        const response = await api.post(`/invitations/${invitationId}/resend`);
        alert(`Invitation resent! New link:\n${response.data.inviteUrl}`);
        await fetchInvitations();
      } catch {
        alert('Failed to resend invitation');
      }
    },
    [fetchInvitations]
  );

  const resetInviteModal = useCallback(() => {
    setShowInviteModal(false);
    setInviteEmail('');
    setInviteRole('user');
    setInviteMessage('');
    setInviteUrl(null);
    setInviteEmailDelivery(null);
    clearFormError();
  }, [clearFormError]);

  return {
    userSearchQuery,
    setUserSearchQuery,
    userSearchResults,
    setUserSearchResults,
    isSearching,
    setIsSearching,
    selectedUser,
    setSelectedUser,
    userAuditLogs,
    setUserAuditLogs,
    showSecurityModal,
    setShowSecurityModal,
    showResetPasswordModal,
    setShowResetPasswordModal,
    showResetEmailModal,
    setShowResetEmailModal,
    showInviteModal,
    setShowInviteModal,
    invitations,
    setInvitations,
    inviteEmail,
    setInviteEmail,
    inviteRole,
    setInviteRole,
    inviteMessage,
    setInviteMessage,
    inviteUrl,
    setInviteUrl,
    inviteEmailDelivery,
    setInviteEmailDelivery,
    inviteEmailConfigured,
    setInviteEmailConfigured,
    inviteCapabilitiesLoading,
    setInviteCapabilitiesLoading,
    isCreatingInvite,
    setIsCreatingInvite,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    newEmail,
    setNewEmail,
    searchUsers,
    fetchUserSecurityInfo,
    handleResetUserPassword,
    handleResetUserEmail,
    handleToggleUserLock,
    fetchInvitations,
    fetchInviteCapabilities,
    handleCreateInvitation,
    handleRevokeInvitation,
    handleResendInvitation,
    resetInviteModal,
  };
};

export type UseUsersSettingsReturn = ReturnType<typeof useUsersSettings>;
