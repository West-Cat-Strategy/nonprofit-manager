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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Client Portal</h1>
            {portalUser?.email && <p className="text-sm text-gray-500">{portalUser.email}</p>}
          </div>
          <button
            onClick={() => dispatch(portalLogout())}
            className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        <nav className="bg-white rounded-lg shadow p-4">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="bg-white rounded-lg shadow p-6">{children}</main>
      </div>
    </div>
  );
}
