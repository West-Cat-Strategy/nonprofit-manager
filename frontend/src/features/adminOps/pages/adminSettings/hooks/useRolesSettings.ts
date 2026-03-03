import { useCallback, useState } from 'react';
import api from '../../../../../services/api';
import type { Role } from '../types';
import { defaultPermissions } from '../constants';

type ConfirmFn = (options: {
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
}) => Promise<boolean>;

export const useRolesSettings = (confirm: ConfirmFn) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const loadRoles = useCallback(async () => {
    const response = await api.get('/admin/roles').catch(() => ({ data: { roles: [] } }));
    if (response.data?.roles) {
      setRoles(response.data.roles);
      return;
    }

    setRoles([
      {
        id: '1',
        name: 'Administrator',
        description: 'Full access to all features',
        permissions: defaultPermissions.map((p) => p.key),
        isSystem: true,
        userCount: 1,
      },
      {
        id: '2',
        name: 'Manager',
        description: 'Manage records and view reports',
        permissions: defaultPermissions
          .filter((p) => !p.category.includes('Admin'))
          .map((p) => p.key),
        isSystem: true,
        userCount: 0,
      },
      {
        id: '3',
        name: 'User',
        description: 'Standard access to assigned areas',
        permissions: defaultPermissions
          .filter((p) => p.key.includes('view') || p.key.includes('create'))
          .map((p) => p.key),
        isSystem: true,
        userCount: 0,
      },
      {
        id: '4',
        name: 'Read Only',
        description: 'View-only access',
        permissions: defaultPermissions.filter((p) => p.key.includes('view')).map((p) => p.key),
        isSystem: true,
        userCount: 0,
      },
    ]);
  }, []);

  const handleSaveRole = useCallback(async () => {
    if (!editingRole) return;

    try {
      if (editingRole.id) {
        await api.put(`/admin/roles/${editingRole.id}`, editingRole);
      } else {
        await api.post('/admin/roles', editingRole);
      }
      setShowRoleModal(false);
      setEditingRole(null);
      const response = await api.get('/admin/roles');
      setRoles(response.data.roles);
    } catch {
      alert('Failed to save role');
    }
  }, [editingRole]);

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
        setRoles((prev) => prev.filter((r) => r.id !== roleId));
      } catch {
        alert('Failed to delete role');
      }
    },
    [confirm]
  );

  return {
    roles,
    setRoles,
    showRoleModal,
    setShowRoleModal,
    editingRole,
    setEditingRole,
    loadRoles,
    handleSaveRole,
    handleDeleteRole,
  };
};

export type UseRolesSettingsReturn = ReturnType<typeof useRolesSettings>;
