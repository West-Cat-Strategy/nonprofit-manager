import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppSelector } from '../../../store/hooks';
import { SideNav } from '../../../components/ui';
import type { SideNavItem } from '../../../components/ui/SideNav';
import {
  getAdminNavigationEntries,
  getAdminRouteHref,
  matchAdminRouteEntry,
  normalizeAdminRouteLocation,
  type AdminRouteMode,
  type AdminRouteEntry,
} from '../adminRouteManifest';

export type AdminPanelNavMode = AdminRouteMode;

const isActiveRoute = (route: AdminRouteEntry, currentPath: string): boolean => {
  const normalizedCurrentPath = normalizeAdminRouteLocation(currentPath);
  const matchedRoute = matchAdminRouteEntry(normalizedCurrentPath);

  if (matchedRoute?.id === route.id) {
    return true;
  }

  if (
    route.matchPrefixes?.some((prefix) =>
      normalizedCurrentPath.startsWith(normalizeAdminRouteLocation(prefix))
    )
  ) {
    return true;
  }

  return normalizeAdminRouteLocation(getAdminRouteHref(route)) === normalizedCurrentPath;
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
      .filter((route) => isAdmin || !route.adminOnly)
      .map((route) => ({
        key: route.id,
        label: route.label || route.title,
        to: getAdminRouteHref(route),
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
