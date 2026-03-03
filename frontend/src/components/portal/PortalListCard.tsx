import type { ReactNode } from 'react';
import { classNames } from '../ui/classNames';

interface PortalListCardProps {
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  badges?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export default function PortalListCard({
  title,
  subtitle,
  meta,
  badges,
  actions,
  children,
  className = '',
}: PortalListCardProps) {
  return (
    <div className={classNames('rounded-[var(--ui-radius-md)] border border-app-border-muted bg-app-surface p-4 shadow-sm', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-app-text">{title}</div>
          {subtitle && <div className="mt-1 text-xs text-app-text-muted">{subtitle}</div>}
          {meta && <div className="mt-1 text-xs text-app-text-muted">{meta}</div>}
          {badges && <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">{badges}</div>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
