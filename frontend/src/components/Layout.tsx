/**
 * Layout Component
 * Wraps pages with navigation and common structure
 */

import Navigation from './Navigation';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-app-bg text-app-text">
      <Navigation />
      <main id="main-content">{children}</main>
    </div>
  );
};

export default Layout;
