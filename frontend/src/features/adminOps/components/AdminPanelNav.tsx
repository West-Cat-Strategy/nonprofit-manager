import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppSelector } from '../../../store/hooks';
import { SideNav } from '../../../components/ui';
import type { SideNavItem } from '../../../components/ui/SideNav';
import {
  getAdminNavigationEntries,
  getRouteHref,
  matchRouteCatalogEntry,
  normalizeRouteLocation,
  type AdminNavigationMode,
  type RouteCatalogEntry,
} from '../../../routes/routeCatalog';

export type AdminPanelNavMode = AdminNavigationMode;

const adminOnlyRouteIds = new Set([
  'admin-settings',
  'admin-settings-organization',
  'admin-settings-branding',
  'admin-settings-users',
  'admin-settings-email',
  'admin-settings-messaging',
  'admin-settings-outcomes',
  'admin-settings-roles',
  'admin-settings-audit-logs',
  'admin-settings-other',
  'portal-admin-access-link',
  'portal-admin-hub',
  'portal-admin-access',
  'portal-admin-users',
  'portal-admin-conversations',
  'portal-admin-appointments',
  'portal-admin-slots',
  'backup-settings',
]);

const isActiveRoute = (route: RouteCatalogEntry, currentPath: string): boolean => {
  const normalizedCurrentPath = normalizeRouteLocation(currentPath);
  const matchedRoute = matchRouteCatalogEntry(normalizedCurrentPath);

  if (matchedRoute?.id === route.id) {
    return true;
  }

  if (
    route.adminNav?.matchPrefixes?.some((prefix) =>
      normalizedCurrentPath.startsWith(normalizeRouteLocation(prefix))
    )
  ) {
    return true;
  }

  if (route.id === 'admin-settings' && normalizedCurrentPath === normalizeRouteLocation(route.path)) {
    return true;
  }

  return normalizeRouteLocation(getRouteHref(route)) === normalizedCurrentPath;
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
  const location = useLocation();
  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';
  const effectiveCurrentPath =
    currentPath.includes('?') || location.pathname !== currentPath
      ? currentPath
      : `${location.pathname}${location.search}`;

  const items = useMemo<SideNavItem[]>(() => {
    return getAdminNavigationEntries(mode)
      .filter((route) => isAdmin || !adminOnlyRouteIds.has(route.id))
      .map((route) => ({
        key: route.id,
        label: route.adminNav?.label || route.title,
        to: getRouteHref(route),
        isActive: isActiveRoute(route, effectiveCurrentPath),
      }));
  }, [effectiveCurrentPath, isAdmin, mode]);

  return (
    <SideNav
      title={title}
      items={items}
      searchable
      searchPlaceholder="Find admin section"
      emptyMessage="No admin sections match your search."
    />
  );
}
