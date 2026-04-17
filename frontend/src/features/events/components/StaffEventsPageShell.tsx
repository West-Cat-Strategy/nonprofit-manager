import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export const staffEventsPrimaryActionClassName =
  'app-focus-ring inline-flex items-center justify-center rounded-md bg-app-accent px-4 py-2 text-sm font-medium text-[var(--app-accent-foreground)] transition-colors hover:bg-app-accent-hover focus:outline-none disabled:opacity-60';

export const staffEventsSecondaryActionClassName =
  'app-focus-ring inline-flex items-center justify-center rounded-md border border-app-input-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text transition-colors hover:bg-app-surface-muted focus:outline-none disabled:opacity-60';

export const staffEventsMetadataBadgeClassName =
  'rounded-full border border-app-border bg-app-surface-muted px-3 py-1 text-xs font-medium text-app-text-muted';

interface StaffEventsPageShellProps {
  title: string;
  description?: ReactNode;
  badge?: string;
  backHref?: string;
  backLabel?: string;
  metadata?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

export default function StaffEventsPageShell({
  title,
  description,
  badge = 'Engagement',
  backHref,
  backLabel,
  metadata,
  actions,
  children,
}: StaffEventsPageShellProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-app-border bg-app-surface p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-4xl">
            {backHref && backLabel ? (
              <Link
                to={backHref}
                className="app-focus-ring inline-flex items-center gap-2 rounded-md px-1 py-1 text-sm font-medium text-app-text-muted transition-colors hover:text-app-text focus:outline-none"
              >
                <span aria-hidden="true">&lt;</span>
                <span>{backLabel}</span>
              </Link>
            ) : null}

            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-app-text-muted">
              {badge}
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-app-text">{title}</h1>
            {description ? (
              <div className="mt-2 max-w-3xl text-sm text-app-text-muted">{description}</div>
            ) : null}
            {metadata ? <div className="mt-3 flex flex-wrap gap-2">{metadata}</div> : null}
          </div>

          {actions ? (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          ) : null}
        </div>
      </section>

      {children}
    </div>
  );
}
