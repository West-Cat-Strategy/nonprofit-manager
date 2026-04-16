import { useCallback, useState } from 'react';
import api from '../../../../../services/api';
import type { ConfirmOptions } from '../../../../../hooks/useConfirmDialog';
import type { AdminGroup, OrganizationAccount, UserSecurityInfo } from '../types';
import {
  type AccessDraft,
  type ConfirmedUserDetails,
  type GroupEditorState,
  readAccessInfo,
  readGroups,
  readOrganizationAccounts,
  readUserSecurityInfo,
} from './userSettingsData';

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

export const useUserGroupsAndAccess = ({
  confirm,
  setFormErrorFromError,
}: {
  confirm: ConfirmFn;
  setFormErrorFromError: (error: unknown, fallbackMessage?: string) => void;
}) => {
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
        api
          .get('/admin/organization-accounts')
          .catch(() => ({ data: { organizationAccounts: [] } })),
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

  const handleSaveUserAccess = useCallback(
    async (
      selectedUser: UserSecurityInfo | null,
      options: {
        setSelectedUser: (
          value:
            | UserSecurityInfo
            | null
            | ((prev: UserSecurityInfo | null) => UserSecurityInfo | null)
        ) => void;
        setShowAccessModal: (value: boolean) => void;
      }
    ) => {
      if (!selectedUser) return;

      setSavingUserAccess(true);
      try {
        await api.put(`/admin/users/${selectedUser.id}/access`, {
          groups: userAccessDraft.groups,
          organizationAccess: userAccessDraft.organizationAccess,
        });
        await loadUserDetails(selectedUser.id).then((details) => {
          options.setSelectedUser(details.user);
          setUserAccessDraft(details.access);
        });
        options.setShowAccessModal(false);
      } catch (error: unknown) {
        setFormErrorFromError(error, 'Failed to update user access');
      } finally {
        setSavingUserAccess(false);
      }
    },
    [loadUserDetails, setFormErrorFromError, userAccessDraft.groups, userAccessDraft.organizationAccess]
  );

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
    loadUserDetails,
    handleSaveUserAccess,
    openCreateGroup,
    openEditGroup,
    handleSaveGroup,
    handleDeleteGroup,
    resetGroupModal,
  };
};
