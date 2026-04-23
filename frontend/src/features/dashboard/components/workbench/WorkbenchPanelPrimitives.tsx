import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { WorkbenchLink } from './types';

export const workbenchPanelClassName = 'rounded-3xl border border-app-border/70 bg-app-surface/90 p-5 shadow-sm';
export const workbenchActionClassName =
  'inline-flex items-center rounded-full border border-app-border bg-app-surface px-3 py-1.5 text-sm font-medium text-app-text transition hover:bg-app-hover focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2';
export const workbenchInteractiveCardClassName =
  'rounded-2xl border border-app-border bg-app-surface px-4 py-4 transition hover:-translate-y-0.5 hover:bg-app-hover focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2';

interface WorkbenchPanelHeaderProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function WorkbenchPanelHeader({ title, description, action }: WorkbenchPanelHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold text-app-text-heading">{title}</h2>
        <p className="mt-1 text-sm text-app-text-muted">{description}</p>
      </div>
      {action ?? null}
    </div>
  );
}

interface SummaryMetricProps {
  label: string;
  value: string;
  description: string;
}

export function SummaryMetric({ label, value, description }: SummaryMetricProps) {
  return (
    <div className="rounded-2xl border border-app-border/70 bg-app-surface px-4 py-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-text-subtle">{label}</p>
      <p className="mt-2 text-3xl font-black uppercase leading-none text-app-text-heading">{value}</p>
      <p className="mt-2 text-sm leading-5 text-app-text-muted">{description}</p>
    </div>
  );
}

interface FocusCardProps {
  label: string;
  value: string;
  detail: string;
  href: string;
  cta: string;
}

export function FocusCard({ label, value, detail, href, cta }: FocusCardProps) {
  return (
    <Link to={href} className={`${workbenchInteractiveCardClassName} shadow-sm`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-text-subtle">{label}</p>
      <p className="mt-3 text-3xl font-black uppercase leading-none text-app-text-heading">{value}</p>
      <p className="mt-2 text-sm leading-5 text-app-text-muted">{detail}</p>
      <p className="mt-3 text-sm font-semibold text-app-accent">{cta} →</p>
    </Link>
  );
}

interface WorkstreamPanelProps {
  title: string;
  description: string;
  items: WorkbenchLink[];
  emptyState: string;
  manageLabel?: string;
  manageTo?: string;
  compact?: boolean;
}

export function WorkstreamPanel({
  title,
  description,
  items,
  emptyState,
  manageLabel,
  manageTo,
  compact = false,
}: WorkstreamPanelProps) {
  return (
    <section className={workbenchPanelClassName}>
      <WorkbenchPanelHeader
        title={title}
        description={description}
        action={
          manageLabel && manageTo ? (
            <Link to={manageTo} className={workbenchActionClassName}>
              {manageLabel}
            </Link>
          ) : undefined
        }
      />

      {items.length > 0 ? (
        <div className={`mt-5 grid gap-3 ${compact ? 'sm:grid-cols-1 lg:grid-cols-2' : 'sm:grid-cols-2'}`}>
          {items.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              className="group rounded-2xl border border-app-border bg-app-surface px-4 py-3 transition hover:-translate-y-0.5 hover:bg-app-hover focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2"
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-app-accent-soft text-lg text-app-accent-text"
                >
                  {item.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-app-text-heading">
                    {item.shortLabel ?? item.name}
                  </p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-app-text-subtle">
                    {item.sectionLabel}
                  </p>
                </div>
                <span className="text-app-text-subtle transition group-hover:text-app-text" aria-hidden="true">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-app-border bg-app-surface-muted/60 px-4 py-4 text-sm text-app-text-muted">
          {emptyState}
        </div>
      )}
    </section>
  );
}
