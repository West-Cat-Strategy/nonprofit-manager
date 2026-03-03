import type { ReactNode } from 'react';
import { classNames } from './classNames';

interface StatCardProps {
  label: string;
  value: ReactNode;
  trend?: ReactNode;
  className?: string;
}

export default function StatCard({ label, value, trend, className }: StatCardProps) {
  return (
    <article
      className={classNames(
        'rounded-[var(--ui-radius-md)] border border-app-border-muted bg-app-surface p-4 shadow-sm',
        className
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-app-text-heading">{value}</p>
      {trend && <div className="mt-2 text-xs text-app-text-muted">{trend}</div>}
    </article>
  );
}
