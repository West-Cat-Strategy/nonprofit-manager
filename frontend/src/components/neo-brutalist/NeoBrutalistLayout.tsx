/**
 * Neo-Brutalist Layout - Two-column layout with sidebar
 * Precision-refined: No top whitespace, unified header bar
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import NeoBrutalistSidebar from './NeoBrutalistSidebar';
import SkipLink from '../SkipLink';

interface NeoBrutalistLayoutProps {
  children: ReactNode;
  pageTitle?: string;
}

export default function NeoBrutalistLayout({ children, pageTitle }: NeoBrutalistLayoutProps) {
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  // Close menu on escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && showMenu) {
      setShowMenu(false);
      menuButtonRef.current?.focus();
    }
  }, [showMenu]);

  // Close menu when clicking outside
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
    <div className="flex h-screen overflow-hidden bg-[var(--app-bg)] transition-colors duration-300">
      {/* Skip to content link for keyboard users */}
      <SkipLink targetId="main-content" />

      {/* Left Sidebar */}
      <NeoBrutalistSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Unified Top Bar - Page Title Left, Profile Right */}
        <header
          className="relative z-50 bg-[var(--app-bg)] border-b-2 border-[var(--app-border)] pl-6 pr-0 py-0 flex items-center justify-between transition-colors duration-300"
          role="banner"
        >
          {/* Page Title (Left Side) */}
          <h1 className="text-xl font-black uppercase tracking-tight py-3 text-[var(--app-text)]">
            {pageTitle || 'WORKBENCH OVERVIEW'}
          </h1>

          {/* Profile Menu (Right Side) - Flush Right & Jumbo */}
          <div className="relative h-full" ref={menuRef}>
            <button
              ref={menuButtonRef}
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-6 px-8 h-[96px] border-l-2 border-[var(--app-border)] bg-[var(--app-bg)] hover:bg-[var(--app-surface)] font-bold shadow-none transition-all active:opacity-80 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--app-border)]"
              aria-label={`User menu for ${user?.firstName || 'User'}`}
              aria-haspopup="menu"
              aria-expanded={showMenu}
              aria-controls="user-menu"
            >
              <div className="flex items-center gap-6">
                {user?.profilePicture ? (
                  <img
                    key={user.profilePicture}
                    src={user.profilePicture}
                    alt=""
                    className="w-16 h-16 rounded-full border-2 border-[var(--app-border)] object-cover"
                  />
                ) : (
                  <div
                    className="w-16 h-16 bg-[var(--app-border)] text-[var(--app-bg)] flex items-center justify-center text-3xl font-black rounded-full border-2 border-[var(--app-border)]"
                    aria-hidden="true"
                  >
                    {user?.firstName?.[0] || 'U'}
                  </div>
                )}
                <span className="text-3xl font-black italic text-[var(--app-text)] truncate max-w-xs">
                  {user?.firstName ? `${user.firstName} ${user.lastName}` : 'User'}
                </span>
              </div>
              <svg
                className="w-8 h-8 ml-2 text-[var(--app-text)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu - High z-index to appear above brutal borders */}
            {showMenu && (
              <div
                id="user-menu"
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="user-menu-button"
                className="absolute right-0 mt-2 w-48 bg-[var(--app-surface)] border-2 border-[var(--app-border)] shadow-[6px_6px_0px_0px_var(--shadow-color)] z-[100] opacity-100"
              >
                <button
                  role="menuitem"
                  onClick={() => {
                    setShowMenu(false);
                    navigate('/settings/user');
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-[var(--app-border)] hover:text-[var(--app-bg)] font-bold text-sm border-b-2 border-[var(--app-border)] text-[var(--app-text)] transition-colors focus:outline-none focus:bg-[var(--app-border)] focus:text-[var(--app-bg)]"
                >
                  Settings
                </button>
                {user?.role === 'admin' && (
                  <button
                    role="menuitem"
                    onClick={() => {
                      setShowMenu(false);
                      navigate('/settings/admin');
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-[var(--app-surface-muted)] font-bold text-sm border-b-2 border-[var(--app-border)] text-[var(--app-text)] focus:outline-none focus:bg-[var(--app-surface-muted)]"
                  >
                    Organization Admin
                  </button>
                )}
                <button
                  role="menuitem"
                  onClick={() => {
                    setShowMenu(false);
                    handleLogout();
                  }}
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
    </div>
  );
}
