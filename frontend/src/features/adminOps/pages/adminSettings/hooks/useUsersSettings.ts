import { useCallback, useEffect, useState } from 'react';
import api from '../../../../../services/api';
import type { ConfirmOptions } from '../../../../../hooks/useConfirmDialog';
import type {
  AdminGroup,
  AuditLogPage,
  OrganizationAccount,
  UserAccessInfo,
  UserInvitation,
  UserSearchResult,
  UserSecurityInfo,
} from '../types';

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

type AccessDraft = {
  groups: string[];
  organizationAccess: string[];
};

type GroupEditorState = AdminGroup | null;

type ConfirmedUserDetails = {
  user: UserSecurityInfo;
  access: UserAccessInfo;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : null;

const readList = <T,>(value: unknown, keys: string[] = []): T[] => {
  if (Array.isArray(value)) {
    return value as T[];
  }

  const record = asRecord(value);
  if (!record) {
    return [];
  }

  for (const key of keys) {
    const candidate = record[key];
    if (Array.isArray(candidate)) {
      return candidate as T[];
    }
  }

  return [];
};

const readAccessInfo = (value: unknown): UserAccessInfo => {
  const record = asRecord(value);

  return {
    groups: readList<string>(value, ['groups', 'groupIds', 'roleGroups']),
    organizationAccess: readList<string>(value, [
      'organizationAccess',
      'organizationAccountIds',
      'accounts',
      'organizationAccounts',
    ]),
    mfaTotpEnabled: Boolean(record?.mfaTotpEnabled ?? record?.totpEnabled ?? false),
    passkeyCount: Number(record?.passkeyCount ?? record?.passkeysCount ?? 0),
  };
};

const readUserSecurityInfo = (
  userValue: unknown,
  accessValue: UserAccessInfo
): UserSecurityInfo => {
  const record = asRecord(userValue);
  return {
    id: String(record?.id ?? ''),
    email: String(record?.email ?? ''),
    firstName: String(record?.firstName ?? ''),
    lastName: String(record?.lastName ?? ''),
    role: String(record?.role ?? ''),
    profilePicture: (record?.profilePicture as string | null | undefined) ?? null,
    isActive: Boolean(record?.isActive ?? true),
    lastLoginAt: (record?.lastLoginAt as string | null | undefined) ?? null,
    lastPasswordChange: (record?.lastPasswordChange as string | null | undefined) ?? null,
    failedLoginAttempts: Number(record?.failedLoginAttempts ?? 0),
    isLocked: Boolean(record?.isLocked ?? false),
    createdAt: String(record?.createdAt ?? new Date().toISOString()),
    updatedAt: String(record?.updatedAt ?? new Date().toISOString()),
    groups: accessValue.groups,
    organizationAccess: accessValue.organizationAccess,
    mfaTotpEnabled: accessValue.mfaTotpEnabled,
    passkeyCount: accessValue.passkeyCount,
  };
};

const readGroups = (value: unknown): AdminGroup[] =>
  readList<AdminGroup>(value, ['groups', 'items', 'data']).map((group) => ({
    id: String(group.id ?? ''),
    name: String(group.name ?? ''),
    description: (group.description as string | null | undefined) ?? null,
    roles: Array.isArray(group.roles)
      ? (group.roles as string[])
      : Array.isArray((group as Record<string, unknown>).roleNames)
        ? ((group as Record<string, unknown>).roleNames as string[])
        : [],
    memberCount: Number(group.memberCount ?? 0),
    isSystem: Boolean(group.isSystem ?? false),
    createdAt: (group.createdAt as string | undefined) ?? undefined,
    updatedAt: (group.updatedAt as string | undefined) ?? undefined,
  }));

const readOrganizationAccounts = (value: unknown): OrganizationAccount[] =>
  readList<OrganizationAccount>(value, ['organizationAccounts', 'accounts', 'items', 'data']).map(
    (account) => ({
      id: String(account.id ?? ''),
      name: String(account.name ?? account.label ?? ''),
      label: (account.label as string | undefined) ?? undefined,
      description: (account.description as string | null | undefined) ?? null,
      isDefault: Boolean(account.isDefault ?? false),
      isActive: Boolean(account.isActive ?? true),
    })
  );

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
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSecurityInfo | null>(null);
  const [userAuditLogPage, setUserAuditLogPage] = useState<AuditLogPage | null>(null);

  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showResetEmailModal, setShowResetEmailModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('staff');
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

  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [groupEditor, setGroupEditor] = useState<GroupEditorState>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupLoading, setGroupLoading] = useState(false);
  const [savingGroup, setSavingGroup] = useState(false);

  const [organizationAccounts, setOrganizationAccounts] = useState<OrganizationAccount[]>([]);
  const [userAccessDraft, setUserAccessDraft] = useState<AccessDraft>({
    groups: [],
    organizationAccess: [],
  });
  const [savingUserAccess, setSavingUserAccess] = useState(false);

  const loadGroupsAndAccounts = useCallback(async () => {
    setGroupLoading(true);
    try {
      const [groupsResponse, accountsResponse] = await Promise.all([
        api.get('/admin/groups').catch(() => ({ data: { groups: [] } })),
        api.get('/admin/organization-accounts').catch(() => ({ data: { organizationAccounts: [] } })),
      ]);
      setGroups(readGroups(groupsResponse.data));
      setOrganizationAccounts(readOrganizationAccounts(accountsResponse.data));
    } finally {
      setGroupLoading(false);
    }
  }, []);

  const loadUserDetails = useCallback(async (userId: string): Promise<ConfirmedUserDetails> => {
    const [userResponse, accessResponse] = await Promise.all([
      api.get(`/users/${userId}`),
      api.get(`/admin/users/${userId}/access`).catch(() => ({ data: {} })),
    ]);
    const access = readAccessInfo(accessResponse.data);
    const user = readUserSecurityInfo(userResponse.data, access);

    return { user, access };
  }, []);

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

  const loadUserSecurityInfo = useCallback(
    async (userId: string) => {
      try {
        setUserAuditLogPage(null);
        const [userDetails, logsResponse] = await Promise.all([
          loadUserDetails(userId),
          api.get(`/admin/users/${userId}/audit-logs`).catch(() => ({ data: { logs: [], total: 0 } })),
        ]);
        setSelectedUser(userDetails.user);
        setUserAccessDraft(userDetails.access);
        setUserAuditLogPage(logsResponse.data || { logs: [], total: 0 });
        setShowSecurityModal(true);
      } catch {
        alert('Failed to load user information');
      }
    },
    [loadUserDetails]
  );

  const loadUserAccessInfo = useCallback(
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
    [loadUserDetails]
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

  const handleSaveUserAccess = useCallback(async () => {
    if (!selectedUser) return;

    setSavingUserAccess(true);
    try {
      await api.put(`/admin/users/${selectedUser.id}/access`, {
        groups: userAccessDraft.groups,
        organizationAccess: userAccessDraft.organizationAccess,
      });
      await loadUserDetails(selectedUser.id).then((details) => {
        setSelectedUser(details.user);
        setUserAccessDraft(details.access);
      });
      setShowAccessModal(false);
    } catch (error: unknown) {
      setFormErrorFromError(error, 'Failed to update user access');
    } finally {
      setSavingUserAccess(false);
    }
  }, [loadUserDetails, selectedUser, setFormErrorFromError, userAccessDraft.groups, userAccessDraft.organizationAccess]);

  const fetchInvitations = useCallback(async () => {
    try {
      const response = await api.get('/invitations');
      setInvitations(readList<UserInvitation>(response.data, ['invitations', 'data', 'items']));
    } catch {
      // Silently fail - invitations are optional
    }
  }, []);

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
    setInviteRole('staff');
    setInviteMessage('');
    setInviteUrl(null);
    setInviteEmailDelivery(null);
    clearFormError();
  }, [clearFormError]);

  const openCreateGroup = useCallback(() => {
    setGroupEditor({
      id: '',
      name: '',
      description: null,
      roles: [],
      memberCount: 0,
      isSystem: false,
    });
    setShowGroupModal(true);
  }, []);

  const openEditGroup = useCallback((group: AdminGroup) => {
    setGroupEditor({
      ...group,
      roles: [...group.roles],
    });
    setShowGroupModal(true);
  }, []);

  const handleSaveGroup = useCallback(async () => {
    if (!groupEditor) return;

    setSavingGroup(true);
    try {
      const payload = {
        name: groupEditor.name,
        description: groupEditor.description || undefined,
        roles: groupEditor.roles,
      };

      if (groupEditor.id) {
        await api.put(`/admin/groups/${groupEditor.id}`, payload);
      } else {
        await api.post('/admin/groups', payload);
      }

      await loadGroupsAndAccounts();
      setShowGroupModal(false);
      setGroupEditor(null);
    } catch {
      alert('Failed to save group');
    } finally {
      setSavingGroup(false);
    }
  }, [groupEditor, loadGroupsAndAccounts]);

  const handleDeleteGroup = useCallback(
    async (groupId: string) => {
      const confirmed = await confirm({
        title: 'Delete Group',
        message: 'This group will be permanently deleted. Continue?',
        confirmLabel: 'Delete',
        variant: 'danger',
      });
      if (!confirmed) return;

      try {
        await api.delete(`/admin/groups/${groupId}`);
        await loadGroupsAndAccounts();
      } catch {
        alert('Failed to delete group');
      }
    },
    [confirm, loadGroupsAndAccounts]
  );

  const resetGroupModal = useCallback(() => {
    setShowGroupModal(false);
    setGroupEditor(null);
  }, []);

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
    fetchUserSecurityInfo: loadUserSecurityInfo,
    fetchUserAccessInfo: loadUserAccessInfo,
    handleResetUserPassword,
    handleResetUserEmail,
    handleToggleUserLock,
    fetchInvitations,
    fetchInviteCapabilities,
    handleCreateInvitation,
    handleRevokeInvitation,
    handleResendInvitation,
    resetInviteModal,
    groups,
    setGroups,
    groupEditor,
    setGroupEditor,
    showGroupModal,
    setShowGroupModal,
    groupLoading,
    setGroupLoading,
    savingGroup,
    setSavingGroup,
    organizationAccounts,
    setOrganizationAccounts,
    userAccessDraft,
    setUserAccessDraft,
    savingUserAccess,
    setSavingUserAccess,
    loadGroupsAndAccounts,
    openCreateGroup,
    openEditGroup,
    handleSaveGroup,
    handleDeleteGroup,
    resetGroupModal,
    handleSaveUserAccess,
  };
};

export type UseUsersSettingsReturn = ReturnType<typeof useUsersSettings>;
