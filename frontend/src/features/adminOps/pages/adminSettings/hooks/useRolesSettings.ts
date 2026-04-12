import { useCallback, useState } from 'react';
import api from '../../../../../services/api';
import type { ConfirmOptions } from '../../../../../hooks/useConfirmDialog';
<<<<<<< HEAD
import type { PermissionCatalogItem, Role } from '../types';
=======
import type { Role } from '../types';
import { defaultPermissions } from '../constants';
>>>>>>> origin/main

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

export const useRolesSettings = (confirm: ConfirmFn) => {
  const [roles, setRoles] = useState<Role[]>([]);
<<<<<<< HEAD
  const [permissions, setPermissions] = useState<PermissionCatalogItem[]>([]);
=======
>>>>>>> origin/main
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const loadRoles = useCallback(async () => {
<<<<<<< HEAD
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
=======
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
>>>>>>> origin/main
  }, []);

  const handleSaveRole = useCallback(async () => {
    if (!editingRole) return;

    try {
<<<<<<< HEAD
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
    } catch {
      alert('Failed to save role');
    }
  }, [editingRole, loadRoles]);
=======
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
>>>>>>> origin/main

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
<<<<<<< HEAD
        await loadRoles();
=======
        setRoles((prev) => prev.filter((r) => r.id !== roleId));
>>>>>>> origin/main
      } catch {
        alert('Failed to delete role');
      }
    },
<<<<<<< HEAD
    [confirm, loadRoles]
=======
    [confirm]
>>>>>>> origin/main
  );

  return {
    roles,
<<<<<<< HEAD
    permissions,
    setRoles,
    setPermissions,
=======
    setRoles,
>>>>>>> origin/main
    showRoleModal,
    setShowRoleModal,
    editingRole,
    setEditingRole,
    loadRoles,
<<<<<<< HEAD
    openCreateRole,
    openEditRole,
=======
>>>>>>> origin/main
    handleSaveRole,
    handleDeleteRole,
  };
};

export type UseRolesSettingsReturn = ReturnType<typeof useRolesSettings>;
