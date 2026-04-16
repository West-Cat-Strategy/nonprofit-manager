import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { canAccessAdminSettings } from '../../auth/state/adminAccess';
import { useAppSelector } from '../../../store/hooks';
import { SideNav } from '../../../components/ui';
import type { SideNavItem } from '../../../components/ui/SideNav';
import {
  getAdminNavigationEntries,
  getRouteHref,
  matchRouteCatalogEntry,
  normalizeRouteLocation,
  type AdminNavigationMode,
  type ResolvedAdminNavigationEntry,
} from '../../../routes/routeCatalog';

export type AdminPanelNavMode = AdminNavigationMode;

const isActiveRoute = (
  route: ResolvedAdminNavigationEntry,
  currentPath: string
): boolean => {
  const normalizedCurrentPath = normalizeRouteLocation(currentPath);
  const matchedRoute = matchRouteCatalogEntry(normalizedCurrentPath);

  if (matchedRoute?.id === route.id) {
    return true;
  }

  if (route.id === 'admin-settings' && matchedRoute?.id.startsWith('admin-settings')) {
    return true;
  }

  if (
    route.adminNav.matchPrefixes?.some((prefix) =>
      normalizedCurrentPath.startsWith(normalizeRouteLocation(prefix))
    )
  ) {
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
  title = mode === 'portal' ? 'Portal Ops' : 'Admin Workspaces',
}: AdminPanelNavProps) {
  const location = useLocation();
  const { user } = useAppSelector((state) => state.auth);
  const canOpenAdminSettings = canAccessAdminSettings(user);
  const effectiveCurrentPath =
    currentPath.includes('?') || location.pathname !== currentPath
      ? currentPath
      : `${location.pathname}${location.search}`;

  const items = useMemo<SideNavItem[]>(() => {
    return getAdminNavigationEntries(mode)
      .filter((route) => canOpenAdminSettings || route.authScope !== 'admin')
      .map((route) => ({
        key: route.id,
        label: route.adminNav.label || route.adminLabel || route.title,
        to: getRouteHref(route),
        icon: route.adminIcon,
        isActive: isActiveRoute(route, effectiveCurrentPath),
      }));
  }, [canOpenAdminSettings, effectiveCurrentPath, mode]);

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
