import { normalizeStartupRouteLocation } from '../../routes/startupRouteCatalog';

export type AdminRouteMode = 'settings' | 'portal';

export interface AdminRouteEntry {
  id: string;
  title: string;
  path: string;
  href?: string;
  mode: AdminRouteMode;
  label: string;
  order: number;
  adminOnly?: boolean;
  matchPrefixes?: string[];
}

const adminRouteManifest: readonly AdminRouteEntry[] = [
  {
    id: 'user-settings',
    title: 'User Settings',
    path: '/settings/user',
    mode: 'settings',
    label: 'User Settings',
    order: 10,
  },
  {
    id: 'admin-settings',
    title: 'Admin Settings',
    path: '/settings/admin',
    mode: 'settings',
    label: 'Admin Settings',
    order: 20,
    adminOnly: true,
    matchPrefixes: ['/settings/admin'],
  },
  {
    id: 'api-settings',
    title: 'API Settings',
    path: '/settings/api',
    mode: 'settings',
    label: 'API Settings',
    order: 30,
  },
  {
    id: 'navigation-settings',
    title: 'Navigation Settings',
    path: '/settings/navigation',
    mode: 'settings',
    label: 'Navigation Settings',
    order: 40,
  },
  {
    id: 'backup-settings',
    title: 'Data Backup',
    path: '/settings/backup',
    mode: 'settings',
    label: 'Data Backup',
    order: 50,
    adminOnly: true,
  },
  {
    id: 'email-marketing',
    title: 'Email Marketing',
    path: '/settings/email-marketing',
    mode: 'settings',
    label: 'Email Marketing',
    order: 60,
  },
  {
    id: 'portal-admin-access',
    title: 'Portal Access',
    path: '/settings/admin/portal/access',
    mode: 'portal',
    label: 'Access',
    order: 10,
    adminOnly: true,
    matchPrefixes: ['/settings/admin/portal/access', '/settings/admin/portal'],
  },
  {
    id: 'portal-admin-users',
    title: 'Portal Users',
    path: '/settings/admin/portal/users',
    mode: 'portal',
    label: 'Users',
    order: 20,
    adminOnly: true,
  },
  {
    id: 'portal-admin-conversations',
    title: 'Portal Conversations',
    path: '/settings/admin/portal/conversations',
    mode: 'portal',
    label: 'Conversations',
    order: 30,
    adminOnly: true,
  },
  {
    id: 'portal-admin-appointments',
    title: 'Portal Appointments',
    path: '/settings/admin/portal/appointments',
    mode: 'portal',
    label: 'Appointments',
    order: 40,
    adminOnly: true,
  },
  {
    id: 'portal-admin-slots',
    title: 'Portal Slots',
    path: '/settings/admin/portal/slots',
    mode: 'portal',
    label: 'Slots',
    order: 50,
    adminOnly: true,
  },
];

export const getAdminRouteHref = (route: AdminRouteEntry): string => route.href ?? route.path;

export const normalizeAdminRouteLocation = (value: string): string =>
  normalizeStartupRouteLocation(value);

export const matchAdminRouteEntry = (value: string): AdminRouteEntry | null => {
  const normalized = normalizeAdminRouteLocation(value);
  const pathname = normalized.split('?')[0] || '/';

  return (
    adminRouteManifest.find(
      (entry) => normalizeAdminRouteLocation(getAdminRouteHref(entry)) === normalized
    ) ??
    adminRouteManifest.find(
      (entry) => normalizeAdminRouteLocation(entry.path) === pathname
    ) ??
    null
  );
};

export const getAdminNavigationEntries = (mode: AdminRouteMode): AdminRouteEntry[] =>
  adminRouteManifest
    .filter((entry) => entry.mode === mode)
    .sort((left, right) => left.order - right.order);
