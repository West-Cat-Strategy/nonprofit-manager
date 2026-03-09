import type { ReactNode } from 'react';
import type { PageContract } from '../../types/ui';
import { PageHeader } from '../ui';

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
    <div className="space-y-5">
      <PageHeader title={title} description={description} actions={actions} />
      {children}
    </div>
  );
}
