import { useState } from 'react';
import type { Role } from '../types';

export const useRolesSettings = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  return {
    roles,
    setRoles,
    showRoleModal,
    setShowRoleModal,
    editingRole,
    setEditingRole,
  };
};

export type UseRolesSettingsReturn = ReturnType<typeof useRolesSettings>;
