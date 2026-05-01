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
  icon?: ReactNode;
}

export default function PortalListCard({
  title,
  subtitle,
  meta,
  badges,
  actions,
  children,
  className = '',
  icon,
}: PortalListCardProps) {
  return (
    <div
      className={classNames(
        'group rounded-[var(--ui-radius-md)] border border-app-border-muted bg-app-surface p-4 shadow-sm transition-[border-color,box-shadow,transform] duration-150 ease-out hover:-translate-y-0.5 hover:border-app-border hover:shadow-md',
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {icon && (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface-muted text-app-accent transition-colors duration-150 group-hover:border-app-accent">
              {icon}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-app-text">{title}</div>
            {subtitle && <div className="mt-1 text-xs text-app-text-muted">{subtitle}</div>}
            {meta && <div className="mt-1 text-xs text-app-text-muted">{meta}</div>}
            {badges && <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">{badges}</div>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
