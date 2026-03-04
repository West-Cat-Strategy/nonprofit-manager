import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useAppSelector } from '../../../store/hooks';
import { SideNav } from '../../../components/ui';
import type { SideNavItem } from '../../../components/ui/SideNav';

export type AdminPanelNavMode = 'settings' | 'portal';

export interface AdminPanelNavRoute {
  key: string;
  label: string;
  to: string;
  matchPrefixes?: string[];
  adminOnly?: boolean;
  icon?: ReactNode;
}

const settingsNavRoutes: AdminPanelNavRoute[] = [
  { key: 'admin-hub', label: 'Admin Hub', to: '/settings/admin' },
  {
    key: 'portal-ops',
    label: 'Portal Ops',
    to: '/settings/admin/portal/access',
    matchPrefixes: ['/settings/admin/portal'],
  },
  { key: 'api', label: 'API Settings', to: '/settings/api' },
  { key: 'navigation', label: 'Navigation', to: '/settings/navigation' },
  { key: 'backup', label: 'Data Backup', to: '/settings/backup', adminOnly: true },
  { key: 'marketing', label: 'Email Marketing', to: '/settings/email-marketing' },
];

const portalNavRoutes: AdminPanelNavRoute[] = [
  { key: 'admin-hub', label: 'Admin Hub', to: '/settings/admin' },
  { key: 'portal-access', label: 'Portal Access', to: '/settings/admin/portal/access' },
  { key: 'portal-users', label: 'Portal Users', to: '/settings/admin/portal/users' },
  {
    key: 'portal-conversations',
    label: 'Conversations',
    to: '/settings/admin/portal/conversations',
  },
  {
    key: 'portal-appointments',
    label: 'Appointments',
    to: '/settings/admin/portal/appointments',
  },
  { key: 'portal-slots', label: 'Slots', to: '/settings/admin/portal/slots' },
  { key: 'api', label: 'API Settings', to: '/settings/api' },
  { key: 'navigation', label: 'Navigation', to: '/settings/navigation' },
  { key: 'backup', label: 'Data Backup', to: '/settings/backup', adminOnly: true },
  { key: 'marketing', label: 'Email Marketing', to: '/settings/email-marketing' },
];

const isActiveRoute = (route: AdminPanelNavRoute, currentPath: string): boolean => {
  if (route.matchPrefixes?.some((prefix) => currentPath.startsWith(prefix))) {
    return true;
  }

  if (route.to === '/settings/admin') {
    return currentPath === '/settings/admin';
  }

  return currentPath === route.to;
};

interface AdminPanelNavProps {
  currentPath: string;
  mode?: AdminPanelNavMode;
  title?: string;
}

export default function AdminPanelNav({
  currentPath,
  mode = 'settings',
  title = 'Admin Panels',
}: AdminPanelNavProps) {
  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';

  const items = useMemo<SideNavItem[]>(() => {
    const source = mode === 'portal' ? portalNavRoutes : settingsNavRoutes;

    return source
      .filter((route) => !route.adminOnly || isAdmin)
      .map((route) => ({
        key: route.key,
        label: route.label,
        to: route.to,
        icon: route.icon,
        isActive: isActiveRoute(route, currentPath),
      }));
  }, [currentPath, isAdmin, mode]);

  return <SideNav title={title} items={items} />;
}
