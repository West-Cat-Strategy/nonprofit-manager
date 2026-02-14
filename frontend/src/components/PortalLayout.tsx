import { Link, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { portalLogout } from '../store/slices/portalAuthSlice';

interface PortalLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { label: 'Dashboard', path: '/portal' },
  { label: 'Profile', path: '/portal/profile' },
  { label: 'People', path: '/portal/people' },
  { label: 'Events', path: '/portal/events' },
  { label: 'Appointments', path: '/portal/appointments' },
  { label: 'Documents', path: '/portal/documents' },
  { label: 'Notes', path: '/portal/notes' },
  { label: 'Forms', path: '/portal/forms' },
  { label: 'Reminders', path: '/portal/reminders' },
];

export default function PortalLayout({ children }: PortalLayoutProps) {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const portalUser = useAppSelector((state) => state.portalAuth.user);

  return (
    <div className="min-h-screen bg-app-surface-muted">
      <header className="bg-app-surface border-b border-app-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-app-text">Client Portal</h1>
            {portalUser?.email && <p className="text-sm text-app-text-muted">{portalUser.email}</p>}
          </div>
          <button
            onClick={() => dispatch(portalLogout())}
            className="px-4 py-2 text-sm bg-app-surface-muted rounded-lg hover:bg-app-surface-muted"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        <nav className="bg-app-surface rounded-lg shadow p-4">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive ? 'bg-app-accent-soft text-app-accent' : 'text-app-text-muted hover:bg-app-surface-muted'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="bg-app-surface rounded-lg shadow p-6">{children}</main>
      </div>
    </div>
  );
}
