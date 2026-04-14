import type { User } from './authCore';
import { isAdminRole } from './roleNormalization';

type AdminSettingsUser = Pick<User, 'role'> | null | undefined;

export const canAccessAdminSettings = (user: AdminSettingsUser): boolean =>
  isAdminRole(user?.role);
