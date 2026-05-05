import { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { canAccessAdminSettings } from '../../auth/state/adminAccess';
import { useAppSelector } from '../../../store/hooks';
import type { SideNavItem } from '../../../components/ui/SideNav';
import { SideNav } from '../../../components/ui';
import { classNames } from '../../../components/ui/classNames';
import {
  getAdminNavigationEntries,
  getRouteHref,
  matchRouteCatalogEntry,
  normalizeRouteLocation,
  type AdminNavigationMode,
  type ResolvedAdminNavigationEntry,
} from '../../../routes/routeCatalog';

export type AdminPanelNavMode = AdminNavigationMode;

const isActiveRoute = (route: ResolvedAdminNavigationEntry, currentPath: string): boolean => {
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
  variant?: 'sidebar' | 'compact';
}

export default function AdminPanelNav({
  currentPath,
  mode = 'settings',
  title = mode === 'portal' ? 'Portal Ops' : 'Admin Workspaces',
  variant = 'sidebar',
}: AdminPanelNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
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

  const activeItem = items.find((item) => item.isActive) ?? items[0];

  if (variant === 'compact') {
    return (
      <section
        className="min-w-0 overflow-hidden rounded-[var(--ui-radius-md)] border border-app-border bg-app-surface-elevated p-3 shadow-sm"
        aria-label={`${title} compact navigation`}
      >
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="min-w-0 flex-1 space-y-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-app-text-label">
              {title}
            </span>
            <select
              value={activeItem?.key ?? ''}
              onChange={(event) => {
                const nextItem = items.find((item) => item.key === event.target.value);
                if (nextItem) {
                  navigate(nextItem.to);
                }
              }}
              className="w-full rounded-[var(--ui-radius-sm)] border border-app-input-border bg-app-input-bg px-3 py-2 text-sm font-semibold text-app-text focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg)]"
            >
              {items.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <div
            className="min-w-0 max-w-full overflow-x-auto pb-1 sm:max-w-[52%]"
            aria-label={`${title} shortcuts`}
          >
            <div className="flex w-max min-w-0 gap-2">
              {items.slice(0, 5).map((item) => (
                <Link
                  key={item.key}
                  to={item.to}
                  aria-current={item.isActive ? 'page' : undefined}
                  className={classNames(
                    'whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold',
                    item.isActive
                      ? 'border-app-accent bg-app-accent text-[var(--app-accent-foreground)]'
                      : 'border-app-border bg-app-surface text-app-text hover:bg-app-surface-muted'
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

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
