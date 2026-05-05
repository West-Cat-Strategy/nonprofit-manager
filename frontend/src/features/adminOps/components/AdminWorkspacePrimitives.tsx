import type { ReactNode } from 'react';
import { classNames } from '../../../components/ui/classNames';

export type AdminStatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const statusToneClassName: Record<AdminStatusTone, string> = {
  neutral: 'border-app-border bg-app-surface-muted text-app-text-muted',
  success: 'border-app-border bg-app-accent-soft text-app-accent-text',
  warning: 'border-app-border bg-app-accent-soft text-app-accent-text',
  danger:
    'border-red-300 bg-red-50 text-red-700 dark:border-red-500/60 dark:bg-red-950/40 dark:text-red-200',
  info: 'border-app-border bg-app-surface-elevated text-app-text',
};

export const adminControlClassName =
  'w-full min-w-0 rounded-[var(--ui-radius-sm)] border border-app-input-border bg-app-input-bg px-3 py-2 text-sm text-app-text placeholder:text-app-text-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg)] disabled:cursor-not-allowed disabled:opacity-50';

export const adminSecondaryButtonClassName =
  'inline-flex min-w-0 items-center justify-center whitespace-normal rounded-[var(--ui-radius-sm)] border border-app-border bg-app-surface px-3 py-2 text-center text-sm font-semibold text-app-text hover:bg-app-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg)] disabled:cursor-not-allowed disabled:opacity-50';

export const adminPrimaryButtonClassName =
  'inline-flex min-w-0 items-center justify-center whitespace-normal rounded-[var(--ui-radius-sm)] border border-app-accent bg-app-accent px-3 py-2 text-center text-sm font-semibold text-[var(--app-accent-foreground)] hover:bg-app-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg)] disabled:cursor-not-allowed disabled:opacity-50';

export const adminSubtleButtonClassName =
  'inline-flex min-w-0 items-center justify-center whitespace-normal rounded-[var(--ui-radius-sm)] border border-transparent bg-app-surface-muted px-3 py-2 text-center text-sm font-semibold text-app-text hover:border-app-border hover:bg-app-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg)] disabled:cursor-not-allowed disabled:opacity-50';

interface AdminWorkspaceSectionProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function AdminWorkspaceSection({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: AdminWorkspaceSectionProps) {
  return (
    <section
        className={classNames(
        'min-w-0 overflow-hidden rounded-[var(--ui-radius-md)] border border-app-border bg-app-surface shadow-sm',
        className
      )}
    >
      <div className="border-b border-app-border bg-app-surface-muted px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <h2 className="break-words text-lg font-semibold text-app-text-heading">{title}</h2>
            {description ? (
              <p className="break-words text-sm text-app-text-muted">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex min-w-0 flex-wrap gap-2 sm:shrink-0">{actions}</div> : null}
        </div>
      </div>
      <div className={classNames('min-w-0 space-y-4 p-4 sm:p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

interface AdminMetricTileProps {
  label: string;
  value: ReactNode;
  helper?: ReactNode;
  tone?: AdminStatusTone;
}

export function AdminMetricTile({ label, value, helper, tone = 'neutral' }: AdminMetricTileProps) {
  return (
    <div
      className={classNames(
        'min-w-0 rounded-[var(--ui-radius-sm)] border px-3 py-2',
        statusToneClassName[tone]
      )}
    >
      <p className="break-words text-xs font-semibold uppercase tracking-wide opacity-80">
        {label}
      </p>
      <p className="mt-1 break-words text-xl font-semibold leading-none text-app-text-heading">
        {value}
      </p>
      {helper ? <p className="mt-1 break-words text-xs opacity-80">{helper}</p> : null}
    </div>
  );
}

export function AdminMetricGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={classNames(
        'grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-3',
        className
      )}
    >
      {children}
    </div>
  );
}

export function AdminStatusPill({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: AdminStatusTone;
  className?: string;
}) {
  return (
    <span
      className={classNames(
        'inline-flex max-w-full min-w-0 items-center rounded-full border px-2.5 py-1 text-left text-xs font-semibold leading-tight',
        statusToneClassName[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function AdminFilterToolbar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={classNames(
        'grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-2 rounded-[var(--ui-radius-sm)] border border-app-border bg-app-surface-muted p-3',
        className
      )}
    >
      {children}
    </div>
  );
}

export function AdminActionGroup({
  children,
  align = 'end',
  className,
}: {
  children: ReactNode;
  align?: 'start' | 'end';
  className?: string;
}) {
  return (
    <div
      className={classNames(
        'flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap [&>*]:w-full sm:[&>*]:w-auto',
        align === 'end' ? 'items-stretch sm:items-center sm:justify-end' : 'items-stretch sm:items-center sm:justify-start',
        className
      )}
    >
      {children}
    </div>
  );
}
