/**
 * Neo-Brutalist Layout - Full-width layout with top navigation bar
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { logoutAsync } from '../../store/slices/authSlice';
import SkipLink from '../SkipLink';

interface TopNavLinkProps {
  to: string;
  label: string;
  active: boolean;
}

function TopNavLink({ to, label, active }: TopNavLinkProps) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center px-5 h-full border-r-2 border-[var(--app-border)] font-bold text-sm transition-colors ${
        active
          ? 'bg-[var(--app-border)] text-[var(--app-bg)]'
          : 'bg-[var(--app-bg)] text-[var(--app-text)] hover:bg-[var(--app-surface)]'
      }`}
    >
      {label}
    </Link>
  );
}

interface NeoBrutalistLayoutProps {
  children: ReactNode;
  pageTitle?: string;
}

export default function NeoBrutalistLayout({ children, pageTitle }: NeoBrutalistLayoutProps) {
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const handleLogout = () => {
    dispatch(logoutAsync()).finally(() => navigate('/login'));
  };

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && showMenu) {
      setShowMenu(false);
      menuButtonRef.current?.focus();
    }
  }, [showMenu]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showMenu, handleKeyDown]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--app-bg)] transition-colors duration-300">
      <SkipLink targetId="main-content" />

      {/* Top Navigation Bar */}
      <header
        className="relative z-50 bg-[var(--app-bg)] border-b-2 border-[var(--app-border)] flex items-stretch transition-colors duration-300"
        role="banner"
      >
        {/* Module Navigation (Left) */}
        <nav className="flex items-stretch" aria-label="Main navigation">
          <TopNavLink
            to="/dashboard"
            label="Dashboard"
            active={isActive('/dashboard') || location.pathname === '/'}
          />
          <TopNavLink to="/people" label="People" active={isActive('/people')} />
          <TopNavLink to="/cases" label="Cases" active={isActive('/cases')} />
          <TopNavLink to="/events" label="Events" active={isActive('/events')} />
          <TopNavLink to="/tasks" label="Tasks" active={isActive('/tasks')} />
          <TopNavLink to="/reports/builder" label="Reports" active={isActive('/reports')} />
        </nav>

        {/* Spacer */}
        <div className="flex-1" aria-hidden="true" />

        {/* Profile Menu (Right) */}
        <div className="relative" ref={menuRef}>
          <button
            ref={menuButtonRef}
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-4 px-6 h-full border-l-2 border-[var(--app-border)] bg-[var(--app-bg)] hover:bg-[var(--app-surface)] font-bold transition-all active:opacity-80 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--app-border)]"
            aria-label={`User menu for ${user?.firstName || 'User'}`}
            aria-haspopup="menu"
            aria-expanded={showMenu}
            aria-controls="user-menu"
          >
            <div className="flex items-center gap-3">
              {user?.profilePicture ? (
                <img
                  key={user.profilePicture}
                  src={user.profilePicture}
                  alt=""
                  className="w-8 h-8 rounded-full border-2 border-[var(--app-border)] object-cover"
                />
              ) : (
                <div
                  className="w-8 h-8 bg-[var(--app-border)] text-[var(--app-bg)] flex items-center justify-center text-sm font-black rounded-full border-2 border-[var(--app-border)]"
                  aria-hidden="true"
                >
                  {user?.firstName?.[0] || 'U'}
                </div>
              )}
              <span className="font-black italic text-[var(--app-text)]">
                {user?.firstName ? `${user.firstName} ${user.lastName}` : 'User'}
              </span>
            </div>
            <svg
              className="w-4 h-4 text-[var(--app-text)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <div
              id="user-menu"
              role="menu"
              aria-orientation="vertical"
              aria-labelledby="user-menu-button"
              className="absolute right-0 mt-2 w-48 bg-[var(--app-surface)] border-2 border-[var(--app-border)] shadow-[6px_6px_0px_0px_var(--shadow-color)] z-[100]"
            >
              <button
                role="menuitem"
                onClick={() => { setShowMenu(false); navigate('/settings/user'); }}
                className="w-full text-left px-4 py-2 hover:bg-[var(--app-border)] hover:text-[var(--app-bg)] font-bold text-sm border-b-2 border-[var(--app-border)] text-[var(--app-text)] transition-colors focus:outline-none focus:bg-[var(--app-border)] focus:text-[var(--app-bg)]"
              >
                Settings
              </button>
              {user?.role === 'admin' && (
                <button
                  role="menuitem"
                  onClick={() => { setShowMenu(false); navigate('/settings/admin'); }}
                  className="w-full text-left px-4 py-2 hover:bg-[var(--app-surface-muted)] font-bold text-sm border-b-2 border-[var(--app-border)] text-[var(--app-text)] focus:outline-none focus:bg-[var(--app-surface-muted)]"
                >
                  Organization Admin
                </button>
              )}
              <button
                role="menuitem"
                onClick={() => { setShowMenu(false); handleLogout(); }}
                className="w-full text-left px-4 py-2 hover:bg-[var(--app-border)] hover:text-[var(--app-bg)] font-bold text-sm text-[var(--app-text)] transition-colors focus:outline-none focus:bg-[var(--app-border)] focus:text-[var(--app-bg)]"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Scrollable Content */}
      <main
        id="main-content"
        className="flex-1 overflow-auto bg-[var(--app-bg)] transition-colors duration-300"
        role="main"
        aria-label={pageTitle || 'Main content'}
      >
        {children}
      </main>
    </div>
  );
}
