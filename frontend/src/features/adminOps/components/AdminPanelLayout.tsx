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
  mobileNav?: ReactNode;
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
  mobileNav,
  children,
  className,
  contentClassName,
}: AdminPanelLayoutProps) {
  return (
    <NeoBrutalistLayout pageTitle={title.toUpperCase()}>
      <div
        className={classNames(
          'min-h-screen bg-[var(--app-bg)] px-3 py-4 pb-28 sm:px-5 sm:py-6 sm:pb-28',
          className
        )}
      >
        <div className="mx-auto max-w-7xl space-y-5">
          <PageHeader title={title} description={description} actions={actions} badge={badge} />
          {mobileNav ? <div className="lg:hidden">{mobileNav}</div> : null}
          <div
            className={classNames(
              sidebar ? 'grid grid-cols-1 gap-5 lg:grid-cols-[260px_minmax(0,1fr)]' : '',
              contentClassName
            )}
          >
            {sidebar ? (
              <div className="hidden lg:block lg:sticky lg:top-20 lg:self-start">{sidebar}</div>
            ) : null}
            <div className="min-w-0 space-y-5">{children}</div>
          </div>
        </div>
      </div>
    </NeoBrutalistLayout>
  );
}
