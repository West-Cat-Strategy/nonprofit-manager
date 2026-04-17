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
  showLocalNavigation?: boolean;
}

export default function SurfaceContextBar({
  shortcuts = [],
  secondaryAction,
  shortcutLabel = 'Favorites',
  showLocalNavigation = true,
}: SurfaceContextBarProps) {
  const location = useLocation();
  const routeMeta = getRouteMeta(`${location.pathname}${location.search}`);
  const browseLabel = routeMeta.surface === 'portal' ? 'Browse portal' : 'Browse workspace';
  const mobilePrimaryAction = routeMeta.primaryAction
    ? {
        label: routeMeta.primaryAction.label,
        to: routeMeta.primaryAction.path,
        emphasis: 'primary' as const,
      }
    : secondaryAction
      ? {
          label: secondaryAction.label,
          to: secondaryAction.to,
          emphasis: 'secondary' as const,
        }
      : null;
  const mobileOverflowActions =
    routeMeta.primaryAction && secondaryAction
      ? [{ label: secondaryAction.label, to: secondaryAction.to }]
      : [];

  return (
    <section className="border-b border-app-border bg-app-surface shadow-sm">
      <div className="mx-auto max-w-[1920px] px-3 py-2 sm:px-4 sm:py-3 lg:px-6">
        <div className="space-y-2 md:hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-app-text-subtle">
                <span className="rounded-full border border-app-border bg-app-surface-elevated px-2.5 py-1 text-app-text-heading shadow-sm">
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
                          className="text-app-text transition hover:text-app-text-heading"
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

            {mobileOverflowActions.length > 0 ? (
              <details className="relative shrink-0">
                <summary className="cursor-pointer list-none rounded-[var(--ui-radius-sm)] border border-app-border bg-app-surface-elevated px-3 py-2 text-sm font-semibold text-app-text-heading shadow-sm">
                  More actions
                </summary>
                <div className="absolute right-0 z-10 mt-2 min-w-44 rounded-[var(--ui-radius-sm)] border border-app-border bg-app-surface p-2 shadow-lg">
                  {mobileOverflowActions.map((action) => (
                    <Link
                      key={action.to}
                      to={action.to}
                      className="block rounded-[var(--ui-radius-sm)] px-3 py-2 text-sm font-medium text-app-text-heading transition hover:bg-app-surface-muted"
                    >
                      {action.label}
                    </Link>
                  ))}
                </div>
              </details>
            ) : null}
          </div>

          {mobilePrimaryAction ? (
            <Link
              to={mobilePrimaryAction.to}
              className={
                mobilePrimaryAction.emphasis === 'primary'
                  ? 'app-accent-contrast-ink inline-flex w-full items-center justify-center rounded-[var(--ui-radius-sm)] border border-app-accent bg-app-accent px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-app-accent-hover focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2'
                  : 'inline-flex w-full items-center justify-center rounded-[var(--ui-radius-sm)] border border-app-border bg-app-surface-elevated px-4 py-2 text-sm font-semibold text-app-text-heading shadow-sm transition hover:bg-app-surface-muted focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2'
              }
            >
              {mobilePrimaryAction.label}
            </Link>
          ) : null}

          {showLocalNavigation && routeMeta.surface === 'portal' && routeMeta.localNavigation.length > 0 ? (
            <details className="rounded-[var(--ui-radius-sm)] border border-app-border bg-app-surface-elevated shadow-sm">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-app-text-heading">
                {browseLabel}
              </summary>
              <nav aria-label={browseLabel} className="space-y-2 border-t border-app-border px-3 py-3">
                {routeMeta.localNavigation.map((item) => (
                  <Link
                    key={item.id}
                    to={item.href}
                    aria-current={item.isActive ? 'page' : undefined}
                    className={`flex items-center gap-2 rounded-[var(--ui-radius-sm)] px-3 py-2 text-sm font-medium transition ${
                      item.isActive
                        ? 'app-accent-contrast-ink border border-app-accent bg-app-accent shadow-sm'
                        : 'border border-app-border bg-app-surface text-app-text hover:bg-app-surface-muted hover:text-app-text-heading'
                    }`}
                  >
                    {item.icon ? <span aria-hidden="true">{item.icon}</span> : null}
                    <span>{item.shortLabel}</span>
                  </Link>
                ))}
              </nav>
            </details>
          ) : null}
        </div>

        <div className="hidden md:block">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-app-text-subtle">
                <span className="rounded-full border border-app-border bg-app-surface-elevated px-2.5 py-1 text-app-text-heading shadow-sm">
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
                          className="text-app-text transition hover:text-app-text-heading"
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
                  className="inline-flex items-center justify-center rounded-[var(--ui-radius-sm)] border border-app-border bg-app-surface-elevated px-4 py-2 text-sm font-semibold text-app-text-heading shadow-sm transition hover:bg-app-surface-muted focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2"
                >
                  {secondaryAction.label}
                </Link>
              ) : null}
              {routeMeta.primaryAction ? (
                <Link
                  to={routeMeta.primaryAction.path}
                  className="app-accent-contrast-ink inline-flex items-center justify-center rounded-[var(--ui-radius-sm)] border border-app-accent bg-app-accent px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-app-accent-hover focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2"
                >
                  {routeMeta.primaryAction.label}
                </Link>
              ) : null}
            </div>
          </div>

          {(showLocalNavigation && routeMeta.localNavigation.length > 0) || shortcuts.length > 0 ? (
            <div className="mt-3 space-y-3 border-t border-app-border pt-3">
              {showLocalNavigation && routeMeta.localNavigation.length > 0 ? (
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
                            ? 'app-accent-contrast-ink border border-app-accent bg-app-accent shadow-sm'
                            : 'border border-app-border bg-app-surface-elevated text-app-text shadow-sm hover:bg-app-surface-muted hover:text-app-text-heading'
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
                        className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-surface-elevated px-3 py-2 text-sm font-medium text-app-text shadow-sm transition hover:bg-app-surface-muted hover:text-app-text-heading"
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
      </div>
    </section>
  );
}
