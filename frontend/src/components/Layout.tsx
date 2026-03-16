/**
 * Layout Component
 * Wraps pages with navigation and common structure
 */

import Navigation from './Navigation';
import SkipLink from './SkipLink';
import { AppShell } from './ui';
import WorkspaceHeader from './workspace/WorkspaceHeader';
import TeamMessengerDock from '../features/teamChat/components/TeamMessengerDock';
import { TeamMessengerProvider } from '../features/teamChat/messenger/TeamMessengerContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-app-bg text-app-text">
      <SkipLink />
      <TeamMessengerProvider>
        <AppShell
          topNav={<Navigation />}
          header={<WorkspaceHeader />}
          contentClassName="pb-28 lg:pb-24"
        >
          {children}
        </AppShell>
        <TeamMessengerDock />
      </TeamMessengerProvider>
    </div>
  );
};

export default Layout;
