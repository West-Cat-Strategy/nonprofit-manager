import type { User } from './authCore';

type AdminSettingsUser = Pick<User, 'role'> | null | undefined;

export const canAccessAdminSettings = (user: AdminSettingsUser): boolean => user?.role === 'admin';
