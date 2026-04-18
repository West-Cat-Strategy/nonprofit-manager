import { useCallback, useState } from 'react';
import api from '../../../../../services/api';
import type { ConfirmOptions } from '../../../../../hooks/useConfirmDialog';
import type { PermissionCatalogItem, Role } from '../types';

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;
type NotifyFn = (message: string) => void;

export const useRolesSettings = (
  confirm: ConfirmFn,
  {
    showSuccess,
    showError,
  }: {
    showSuccess: NotifyFn;
    showError: NotifyFn;
  }
) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<PermissionCatalogItem[]>([]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const loadRoles = useCallback(async () => {
    const [rolesResponse, permissionsResponse] = await Promise.all([
      api.get('/admin/roles').catch(() => ({ data: { roles: [] } })),
      api.get('/admin/permissions').catch(() => ({ data: { permissions: [] } })),
    ]);

    setRoles(rolesResponse.data?.roles || []);
    setPermissions(permissionsResponse.data?.permissions || []);
  }, []);

  const openCreateRole = useCallback(() => {
    setEditingRole({
      id: '',
      name: '',
      label: '',
      description: '',
      permissions: [],
      isSystem: false,
      userCount: 0,
      priority: 0,
    });
    setShowRoleModal(true);
  }, []);

  const openEditRole = useCallback((role: Role) => {
    setEditingRole({
      ...role,
      permissions: [...role.permissions],
    });
    setShowRoleModal(true);
  }, []);

  const handleSaveRole = useCallback(async () => {
    if (!editingRole) return;

    try {
      const payload = {
        name: editingRole.name,
        description: editingRole.description,
        permissions: editingRole.permissions,
      };

      if (editingRole.id) {
        await api.put(`/admin/roles/${editingRole.id}`, payload);
      } else {
        await api.post('/admin/roles', payload);
      }
      await loadRoles();
      setShowRoleModal(false);
      setEditingRole(null);
      showSuccess(editingRole.id ? 'Role updated' : 'Role created');
    } catch {
      showError('Failed to save role');
    }
  }, [editingRole, loadRoles, showError, showSuccess]);

  const handleDeleteRole = useCallback(
    async (roleId: string) => {
      const confirmed = await confirm({
        title: 'Delete Role',
        message: 'This role will be permanently deleted. Continue?',
        confirmLabel: 'Delete',
        variant: 'danger',
      });
      if (!confirmed) return;

      try {
        await api.delete(`/admin/roles/${roleId}`);
        await loadRoles();
        showSuccess('Role deleted');
      } catch {
        showError('Failed to delete role');
      }
    },
    [confirm, loadRoles, showError, showSuccess]
  );

  return {
    roles,
    permissions,
    setRoles,
    setPermissions,
    showRoleModal,
    setShowRoleModal,
    editingRole,
    setEditingRole,
    loadRoles,
    openCreateRole,
    openEditRole,
    handleSaveRole,
    handleDeleteRole,
  };
};

export type UseRolesSettingsReturn = ReturnType<typeof useRolesSettings>;
