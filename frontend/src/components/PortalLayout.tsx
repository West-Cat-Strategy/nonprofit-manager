import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { portalLogoutAsync } from '../store/slices/portalAuthSlice';
import { AppShell, SideNav, TopNav, SecondaryButton } from './ui';

interface PortalLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { key: 'dashboard', label: 'Dashboard', path: '/portal' },
  { key: 'profile', label: 'Profile', path: '/portal/profile' },
  { key: 'people', label: 'People', path: '/portal/people' },
  { key: 'events', label: 'Events', path: '/portal/events' },
  { key: 'messages', label: 'Messages', path: '/portal/messages' },
  { key: 'cases', label: 'Cases', path: '/portal/cases' },
  { key: 'appointments', label: 'Appointments', path: '/portal/appointments' },
  { key: 'documents', label: 'Documents', path: '/portal/documents' },
  { key: 'notes', label: 'Notes', path: '/portal/notes' },
  { key: 'forms', label: 'Forms', path: '/portal/forms' },
  { key: 'reminders', label: 'Reminders', path: '/portal/reminders' },
];

export default function PortalLayout({ children }: PortalLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const portalUser = useAppSelector((state) => state.portalAuth.user);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => {
    if (path === '/portal') return location.pathname === '/portal';
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const sideItems = navItems.map((item) => ({
    key: item.key,
    label: item.label,
    to: item.path,
    isActive: isActive(item.path),
  }));

  const topNav = (
    <TopNav
      left={
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center rounded-[var(--ui-radius-sm)] border border-app-border px-2 py-1 text-xs font-semibold text-app-text lg:hidden"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-controls="portal-nav"
          >
            {mobileMenuOpen ? 'Hide menu' : 'Menu'}
          </button>
          <div>
            <h1 className="text-base font-semibold text-app-text-heading">Client Portal</h1>
            {portalUser?.email && <p className="text-xs text-app-text-muted">{portalUser.email}</p>}
          </div>
        </div>
      }
      right={
        <SecondaryButton
          onClick={async () => {
            await dispatch(portalLogoutAsync());
            navigate('/portal/login', { replace: true });
          }}
        >
          Sign out
        </SecondaryButton>
      }
    />
  );

  const sidebar = (
    <div id="portal-nav" className={mobileMenuOpen ? 'block' : 'hidden lg:block'}>
      <SideNav
        title="Portal"
        items={sideItems}
        footer={
          <Link
            to="/portal/profile"
            className="block text-xs font-medium text-app-accent hover:text-app-accent-text"
            onClick={() => setMobileMenuOpen(false)}
          >
            Manage your profile
          </Link>
        }
        onNavigate={() => setMobileMenuOpen(false)}
      />
    </div>
  );

  return (
    <AppShell topNav={topNav} sidebar={sidebar} contentClassName="rounded-[var(--ui-radius-md)] bg-app-surface p-4 shadow-sm sm:p-6">
      {children}
    </AppShell>
  );
}
