/**
 * Layout Component
 * Wraps pages with navigation and common structure
 */

import Navigation from './Navigation';
import SkipLink from './SkipLink';
import { AppShell } from './ui';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-app-bg text-app-text">
      <SkipLink />
      <AppShell topNav={<Navigation />}>{children}</AppShell>
    </div>
  );
};

export default Layout;
