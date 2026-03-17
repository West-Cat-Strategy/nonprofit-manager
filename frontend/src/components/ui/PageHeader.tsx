import type { ReactNode } from 'react';
import { classNames } from './classNames';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  badge?: ReactNode;
  className?: string;
}

export default function PageHeader({ title, description, actions, badge, className }: PageHeaderProps) {
  return (
    <header className={classNames('flex flex-col items-start gap-3 sm:flex-row sm:justify-between', className)}>
      <div className="min-w-0">
        {badge && <div className="mb-2 inline-flex items-center">{badge}</div>}
        <h1 className="text-2xl font-semibold text-app-text-heading sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-app-text-muted sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">{actions}</div>}
    </header>
  );
}
