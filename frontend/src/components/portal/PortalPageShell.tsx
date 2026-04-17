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
    <section aria-label={title} className="space-y-5">
      <PageHeader title={title} description={description} actions={actions} />
      {children}
    </section>
  );
}
