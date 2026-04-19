/**
 * Layout Component
 * Wraps pages with navigation and common structure
 */

import Navigation from './Navigation';
import SkipLink from './SkipLink';
import { AppShell } from './ui';
import WorkspaceHeader from './workspace/WorkspaceHeader';
import useMediaQuery from '../hooks/useMediaQuery';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const isMobileViewport = useMediaQuery('(max-width: 767px)');

  return (
    <div className="min-h-screen bg-app-bg text-app-text">
      <SkipLink />
      <AppShell
        topNav={<Navigation />}
        header={<WorkspaceHeader />}
        contentClassName={isMobileViewport ? 'pb-6' : 'pb-28 lg:pb-24'}
      >
        {children}
      </AppShell>
    </div>
  );
};

export default Layout;
