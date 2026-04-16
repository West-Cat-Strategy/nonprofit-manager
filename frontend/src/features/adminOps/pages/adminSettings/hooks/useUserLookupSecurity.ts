import { useCallback, useEffect, useState } from 'react';
import api from '../../../../../services/api';
import type { AuditLogPage, UserSearchResult, UserSecurityInfo } from '../types';
import { type AccessDraft, type ConfirmedUserDetails, readList } from './userSettingsData';

export const useUserLookupSecurity = ({
  clearFormError,
  setFormErrorFromError,
  loadUserDetails,
  setUserAccessDraft,
}: {
  clearFormError: () => void;
  setFormErrorFromError: (error: unknown, fallbackMessage?: string) => void;
  loadUserDetails: (userId: string) => Promise<ConfirmedUserDetails>;
  setUserAccessDraft: (
    value:
      | AccessDraft
      | ((prev: AccessDraft) => AccessDraft)
  ) => void;
}) => {
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSecurityInfo | null>(null);
  const [userAuditLogPage, setUserAuditLogPage] = useState<AuditLogPage | null>(null);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showResetEmailModal, setShowResetEmailModal] = useState(false);
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
      setUserSearchResults(readList<UserSearchResult>(response.data, ['users', 'results', 'data']));
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

  const fetchUserSecurityInfo = useCallback(
    async (userId: string) => {
      try {
        setUserAuditLogPage(null);
        const [userDetails, logsResponse] = await Promise.all([
          loadUserDetails(userId),
          api
            .get(`/admin/users/${userId}/audit-logs`)
            .catch(() => ({ data: { logs: [], total: 0 } })),
        ]);
        setSelectedUser(userDetails.user);
        setUserAccessDraft(userDetails.access);
        setUserAuditLogPage(logsResponse.data || { logs: [], total: 0 });
        setShowSecurityModal(true);
      } catch {
        alert('Failed to load user information');
      }
    },
    [loadUserDetails, setUserAccessDraft]
  );

  const fetchUserAccessInfo = useCallback(
    async (userId: string) => {
      try {
        const userDetails = await loadUserDetails(userId);
        setSelectedUser(userDetails.user);
        setUserAccessDraft(userDetails.access);
        setShowAccessModal(true);
      } catch {
        alert('Failed to load user access information');
      }
    },
    [loadUserDetails, setUserAccessDraft]
  );

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

  return {
    userSearchQuery,
    setUserSearchQuery,
    userSearchResults,
    setUserSearchResults,
    isSearching,
    setIsSearching,
    selectedUser,
    setSelectedUser,
    userAuditLogPage,
    setUserAuditLogPage,
    showSecurityModal,
    setShowSecurityModal,
    showAccessModal,
    setShowAccessModal,
    showResetPasswordModal,
    setShowResetPasswordModal,
    showResetEmailModal,
    setShowResetEmailModal,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    newEmail,
    setNewEmail,
    searchUsers,
    fetchUserSecurityInfo,
    fetchUserAccessInfo,
    handleResetUserPassword,
    handleResetUserEmail,
    handleToggleUserLock,
  };
};
