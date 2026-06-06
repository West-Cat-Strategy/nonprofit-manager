import { Link } from 'react-router-dom';
import useStaffNavigationViewModel from '../../features/navigation/hooks/useStaffNavigationViewModel';
import { classNames } from '../ui/classNames';
import type { NavigationItem } from '../../hooks/useNavigationPreferences';
import type { RouteArea } from '../../routes/routeCatalog';

const orderedAreas: RouteArea[] = [
  'Home',
  'Service',
  'People',
  'Engagement',
  'Finance',
  'Publishing',
  'Insights',
  'Admin',
];

const areaLabels: Partial<Record<RouteArea, string>> = {
  Home: 'Work',
  Service: 'Service',
  People: 'People',
  Engagement: 'Engagement',
  Finance: 'Finance',
  Publishing: 'Publishing',
  Insights: 'Insights',
  Admin: 'Admin',
};

function groupNavigationItems(items: NavigationItem[]): [RouteArea, NavigationItem[]][] {
  const grouped = new Map<RouteArea, NavigationItem[]>();

  for (const item of items) {
    const current = grouped.get(item.area) ?? [];
    current.push(item);
    grouped.set(item.area, current);
  }

  return orderedAreas
    .map((area) => [area, grouped.get(area) ?? []] as [RouteArea, NavigationItem[]])
    .filter(([, entries]) => entries.length > 0);
}

export default function StaffSideNavigation() {
  const {
    isNavItemActive,
    navigationPreferences: { enabledItems },
    utilityNavLinks,
  } = useStaffNavigationViewModel();

  const groupedItems = groupNavigationItems(enabledItems.filter((item) => item.group !== 'utility'));

  return (
    <aside
      className="hidden lg:block"
      aria-label="Workspace navigation"
      data-shell-transition
    >
      <div className="rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface p-2 shadow-sm">
        <nav className="space-y-4" aria-label="Primary workspace areas">
          {groupedItems.map(([area, items]) => (
            <section key={area} aria-labelledby={`side-nav-${area}`}>
              <p
                id={`side-nav-${area}`}
                className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-app-text-subtle"
              >
                {areaLabels[area] ?? area}
              </p>
              <div className="grid gap-1">
                {items.map((item) => {
                  const active = isNavItemActive(item.id, item.path);
                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      aria-current={active ? 'page' : undefined}
                      className={classNames(
                        'flex min-w-0 items-center gap-2 rounded-[var(--ui-radius-sm)] px-2.5 py-2 text-sm font-medium transition',
                        active
                          ? 'bg-app-accent-soft text-app-accent-text shadow-[inset_3px_0_0_var(--app-accent)]'
                          : 'text-app-text-muted hover:bg-app-surface-muted hover:text-app-text-heading'
                      )}
                    >
                      <span aria-hidden="true" className="w-5 shrink-0 text-center text-base">
                        {item.icon}
                      </span>
                      <span className="truncate">{item.shortLabel ?? item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}

          {utilityNavLinks.length > 0 ? (
            <section aria-labelledby="side-nav-utilities">
              <p
                id="side-nav-utilities"
                className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-app-text-subtle"
              >
                Utilities
              </p>
              <div className="grid gap-1">
                {utilityNavLinks.map((link) => {
                  const active = isNavItemActive(link.id, link.path);
                  return (
                    <Link
                      key={link.id}
                      to={link.path}
                      aria-current={active ? 'page' : undefined}
                      className={classNames(
                        'flex min-w-0 items-center gap-2 rounded-[var(--ui-radius-sm)] px-2.5 py-2 text-sm font-medium transition',
                        active
                          ? 'bg-app-accent-soft text-app-accent-text shadow-[inset_3px_0_0_var(--app-accent)]'
                          : 'text-app-text-muted hover:bg-app-surface-muted hover:text-app-text-heading'
                      )}
                    >
                      <span aria-hidden="true" className="w-5 shrink-0 text-center text-base">
                        {link.icon}
                      </span>
                      <span className="truncate">{link.shortLabel}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}
        </nav>
      </div>
    </aside>
  );
}
