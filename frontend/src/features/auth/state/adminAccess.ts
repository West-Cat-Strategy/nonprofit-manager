import type { User } from './authCore';
import { isAdminRole } from './roleNormalization';

type AdminSettingsUser = (Pick<User, 'role'> & { permissions?: string[] }) | null | undefined;

const ADMIN_SETTINGS_PERMISSION_PREFIXES = [
  'admin.settings',
  'admin.users',
  'admin.access',
  'admin.groups',
  'admin.roles',
  'admin.audit',
];

const normalizePermission = (permission: string): string => permission.replace(/:/g, '.');

const hasAdminSettingsPermission = (permissions?: string[]): boolean =>
  Boolean(
    permissions?.some((permission) =>
      ADMIN_SETTINGS_PERMISSION_PREFIXES.some((prefix) => {
        const normalizedPermission = normalizePermission(permission);
        return (
          normalizedPermission === prefix ||
          normalizedPermission.startsWith(`${prefix}.`)
        );
      })
    )
  );

export const canAccessAdminSettings = (user: AdminSettingsUser): boolean =>
  isAdminRole(user?.role) || hasAdminSettingsPermission(user?.permissions);
