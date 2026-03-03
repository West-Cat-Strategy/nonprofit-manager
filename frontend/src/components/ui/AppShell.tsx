import type { ReactNode } from 'react';
import { classNames } from './classNames';

interface AppShellProps {
  topNav: ReactNode;
  sidebar?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export default function AppShell({ topNav, sidebar, children, className, contentClassName }: AppShellProps) {
  const shellClassName = sidebar
    ? 'mx-auto grid max-w-[1920px] grid-cols-1 gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-6'
    : 'mx-auto max-w-[1920px] px-3 py-4 sm:px-4 lg:px-6';

  return (
    <div className={classNames('min-h-screen bg-app-bg text-app-text', className)}>
      {topNav}
      <div className={shellClassName}>
        {sidebar ? <div className="lg:sticky lg:top-20 lg:h-fit">{sidebar}</div> : null}
        <main id="main-content" className={classNames('min-w-0', contentClassName)}>
          {children}
        </main>
      </div>
    </div>
  );
}
