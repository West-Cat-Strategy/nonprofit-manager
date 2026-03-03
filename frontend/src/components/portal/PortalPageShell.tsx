import type { ReactNode } from 'react';
import type { PageContract } from '../../types/ui';

interface PortalPageShellProps extends Pick<PageContract, 'title' | 'description'> {
  actions?: ReactNode;
  children: ReactNode;
}

export default function PortalPageShell({
  title,
  description,
  actions,
  children,
}: PortalPageShellProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-app-text-heading">{title}</h1>
          {description && <p className="mt-1 text-sm text-app-text-muted">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
