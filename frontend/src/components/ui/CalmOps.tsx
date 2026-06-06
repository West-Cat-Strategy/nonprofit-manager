import type { ReactNode } from 'react';
import { classNames } from './classNames';

type StatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

const statusToneClasses: Record<StatusTone, string> = {
  neutral: 'border-app-border-muted bg-app-surface-muted text-app-text-muted',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  danger: 'border-red-200 bg-red-50 text-red-700',
  info: 'border-blue-200 bg-blue-50 text-blue-700',
  accent: 'border-app-accent bg-app-accent-soft text-app-accent-text',
};

interface StatusPillProps {
  children: ReactNode;
  tone?: StatusTone;
  className?: string;
}

export function StatusPill({ children, tone = 'neutral', className }: StatusPillProps) {
  return (
    <span
      className={classNames(
        'inline-flex min-h-6 items-center rounded-[var(--ui-radius-sm)] border px-2 py-0.5 text-xs font-semibold',
        statusToneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

interface ToolbarRowProps {
  children: ReactNode;
  className?: string;
}

export function ToolbarRow({ children, className }: ToolbarRowProps) {
  return (
    <div
      className={classNames(
        'flex flex-col gap-2 rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface px-3 py-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center',
        className
      )}
    >
      {children}
    </div>
  );
}

interface MetricStripProps {
  items: Array<{
    label: string;
    value: string | number;
    description?: string;
    tone?: StatusTone;
  }>;
  className?: string;
}

export function MetricStrip({ items, className }: MetricStripProps) {
  return (
    <dl
      className={classNames(
        'grid overflow-hidden rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface shadow-sm sm:grid-cols-2 xl:grid-cols-4',
        className
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="border-b border-app-border-muted px-4 py-3 last:border-b-0 sm:border-r sm:last:border-r-0 xl:border-b-0"
        >
          <dt className="text-xs font-medium text-app-text-muted">{item.label}</dt>
          <dd className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-app-text-heading">{item.value}</span>
            {item.tone ? <StatusPill tone={item.tone}>{item.tone}</StatusPill> : null}
          </dd>
          {item.description ? (
            <p className="mt-1 text-xs leading-5 text-app-text-subtle">{item.description}</p>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
