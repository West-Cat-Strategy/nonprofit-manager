import type { ReactNode } from 'react';
import NeoBrutalistLayout from '../../../components/neo-brutalist/NeoBrutalistLayout';
import { PageHeader } from '../../../components/ui';
import { classNames } from '../../../components/ui/classNames';

interface AdminPanelLayoutProps {
  title: string;
  description?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  sidebar?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export default function AdminPanelLayout({
  title,
  description,
  badge,
  actions,
  sidebar,
  children,
  className,
  contentClassName,
}: AdminPanelLayoutProps) {
  return (
    <NeoBrutalistLayout pageTitle={title.toUpperCase()}>
      <div className={classNames('min-h-screen bg-[var(--app-bg)] p-4 sm:p-6', className)}>
        <div className="mx-auto max-w-7xl space-y-6">
          <PageHeader title={title} description={description} actions={actions} badge={badge} />
          <div
            className={classNames(
              sidebar ? 'grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]' : '',
              contentClassName
            )}
          >
            {sidebar ? <div>{sidebar}</div> : null}
            <div className="min-w-0 space-y-6">{children}</div>
          </div>
        </div>
      </div>
    </NeoBrutalistLayout>
  );
}
