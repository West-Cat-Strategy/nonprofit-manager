import { Link, useLocation } from 'react-router-dom';
import { getRouteMeta } from '../../routes/routeMeta';

export interface SurfaceShortcutItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
  ariaLabel?: string;
}

interface SurfaceContextBarProps {
  shortcuts?: SurfaceShortcutItem[];
  secondaryAction?: {
    label: string;
    to: string;
  };
  shortcutLabel?: string;
}

export default function SurfaceContextBar({
  shortcuts = [],
  secondaryAction,
  shortcutLabel = 'Favorites',
}: SurfaceContextBarProps) {
  const location = useLocation();
  const routeMeta = getRouteMeta(`${location.pathname}${location.search}`);
  const browseLabel = routeMeta.surface === 'portal' ? 'Browse portal' : 'Browse workspace';

  return (
    <section className="border-b border-app-border/70 bg-app-surface/80 backdrop-blur supports-[backdrop-filter]:bg-app-surface/72">
      <div className="mx-auto max-w-[1920px] px-3 py-3 sm:px-4 lg:px-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-app-text-subtle">
              <span className="rounded-full border border-app-border/80 bg-app-surface px-2.5 py-1 text-app-text-muted">
                {routeMeta.areaLabel}
              </span>
              <span>{routeMeta.surface === 'portal' ? 'Client portal' : 'Staff workspace'}</span>
            </div>

            {routeMeta.breadcrumbs.length > 0 ? (
              <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm">
                {routeMeta.breadcrumbs.map((crumb, index) => (
                  <div
                    key={`${crumb.href}-${crumb.label}-${index}`}
                    className="flex items-center gap-2"
                  >
                    {index > 0 ? (
                      <span aria-hidden="true" className="text-app-text-subtle">
                        /
                      </span>
                    ) : null}
                    {crumb.current ? (
                      <span className="font-semibold text-app-text-heading">{crumb.label}</span>
                    ) : (
                      <Link
                        to={crumb.href}
                        className="text-app-text-muted transition hover:text-app-text-heading"
                      >
                        {crumb.label}
                      </Link>
                    )}
                  </div>
                ))}
              </nav>
            ) : (
              <p className="text-sm font-semibold text-app-text-heading">{routeMeta.title}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {secondaryAction ? (
              <Link
                to={secondaryAction.to}
                className="inline-flex items-center justify-center rounded-[var(--ui-radius-sm)] border border-app-border bg-app-surface px-4 py-2 text-sm font-semibold text-app-text transition hover:bg-app-hover focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2"
              >
                {secondaryAction.label}
              </Link>
            ) : null}
            {routeMeta.primaryAction ? (
              <Link
                to={routeMeta.primaryAction.path}
                className="inline-flex items-center justify-center rounded-[var(--ui-radius-sm)] border border-app-accent bg-app-accent px-4 py-2 text-sm font-semibold text-[var(--app-accent-foreground)] shadow-sm transition hover:bg-app-accent-hover focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2"
              >
                {routeMeta.primaryAction.label}
              </Link>
            ) : null}
          </div>
        </div>

        {routeMeta.localNavigation.length > 0 || shortcuts.length > 0 ? (
          <div className="mt-3 space-y-3 border-t border-app-border/70 pt-3">
            {routeMeta.localNavigation.length > 0 ? (
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-text-subtle">
                  {browseLabel}
                </p>
                <nav aria-label={browseLabel} className="flex flex-wrap gap-2">
                  {routeMeta.localNavigation.map((item) => (
                    <Link
                      key={item.id}
                      to={item.href}
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition ${
                        item.isActive
                          ? 'border border-app-accent bg-app-accent-soft text-app-accent-text'
                          : 'border border-app-border bg-app-surface text-app-text-muted hover:bg-app-hover hover:text-app-text'
                      }`}
                    >
                      {item.icon ? <span aria-hidden="true">{item.icon}</span> : null}
                      <span>{item.shortLabel}</span>
                    </Link>
                  ))}
                </nav>
              </div>
            ) : null}

            {shortcuts.length > 0 ? (
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-text-subtle">
                  {shortcutLabel}
                </p>
                <nav aria-label={shortcutLabel} className="flex flex-wrap gap-2">
                  {shortcuts.map((item) => (
                    <Link
                      key={item.id}
                      to={item.path}
                      aria-label={item.ariaLabel ?? item.label}
                      className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-surface px-3 py-2 text-sm font-medium text-app-text transition hover:bg-app-hover"
                    >
                      {item.icon ? <span aria-hidden="true">{item.icon}</span> : null}
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </nav>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
