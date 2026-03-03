import type { ReactNode } from 'react';
import { classNames } from './classNames';

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function SectionCard({ title, subtitle, actions, children, className }: SectionCardProps) {
  return (
    <section
      className={classNames(
        'rounded-[var(--ui-radius-md)] border border-app-border-muted bg-app-surface p-4 shadow-sm sm:p-5',
        className
      )}
    >
      {(title || subtitle || actions) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="text-lg font-semibold text-app-text-heading">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm text-app-text-muted">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
