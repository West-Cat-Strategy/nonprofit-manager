import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logoutAsync } from '../store/slices/authSlice';

interface MainLayoutProps {
  children: ReactNode;
}

function MainLayout({ children }: MainLayoutProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logoutAsync()).finally(() => navigate('/login'));
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Accounts', path: '/accounts' },
    { label: 'Contacts', path: '/contacts' },
    { label: 'Volunteers', path: '/volunteers' },
    { label: 'Events', path: '/events' },
    { label: 'Donations', path: '/donations' },
    { label: 'Tasks', path: '/tasks' },
    { label: 'Follow-ups', path: '/follow-ups' },
    { label: 'Opportunities', path: '/opportunities' },
    { label: 'Analytics', path: '/analytics' },
    { label: 'Reports', path: '/reports' },
    { label: 'Scheduled Reports', path: '/reports/scheduled' },
  ];

  return (
    <div className="min-h-screen bg-app-bg">
      <nav className="bg-app-surface shadow-sm border-b border-app-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-app-text-heading">Nonprofit Manager</h1>
              <div className="hidden md:flex space-x-4">
                {navItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      window.location.pathname === item.path
                        ? 'bg-app-accent-soft text-app-accent-text'
                        : 'text-app-text-muted hover:bg-app-hover'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-app-text-muted">
                {user?.firstName} {user?.lastName}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main id="main-content" className="min-h-screen">{children}</main>
    </div>
  );
}

export default MainLayout;
