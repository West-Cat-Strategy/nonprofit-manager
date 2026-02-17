/**
 * Navigation Bar Component
 * Main navigation for the application
 * Fully responsive with mobile, tablet, and desktop optimizations
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logoutAsync } from '../store/slices/authSlice';
import { useNavigationPreferences } from '../hooks/useNavigationPreferences';
import { useBranding } from '../contexts/BrandingContext';
import { useTheme } from '../contexts/ThemeContext';
import Avatar from './Avatar';
import { useQuickLookup } from './dashboard';

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { branding } = useBranding();
  const { theme, setTheme, isDarkMode, toggleDarkMode, availableThemes } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  const themeLabels: Record<string, string> = {
    'neobrutalist': '🎨',
    'sea-breeze': '🌊',
    'corporate': '💼',
    'clean-modern': '✨',
    'glass': '🔮',
    'high-contrast': '👁️',
  };

  const handleQuickThemeCycle = useCallback(() => {
    const idx = availableThemes.indexOf(theme);
    const nextIdx = (idx + 1) % availableThemes.length;
    setTheme(availableThemes[nextIdx]);
  }, [theme, availableThemes, setTheme]);

  const lookup = useQuickLookup({ debounceMs: 250 });

  // Close menus on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setUserMenuOpen(false);
        setMoreMenuOpen(false);
        setSearchOpen(false);
        setThemeMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen || searchOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen, searchOpen]);

  const handleLogout = () => {
    dispatch(logoutAsync()).finally(() => navigate('/login'));
  };

  const handleSearch = () => {
    setSearchOpen(true);
    lookup.clearSearch();
  };

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  // Get navigation items from user preferences
  const { primaryItems, secondaryItems, enabledItems } = useNavigationPreferences();

  // Map preference items to nav link format
  const primaryNavLinks = primaryItems.map((item) => ({
    name: item.name,
    path: item.path,
    icon: item.icon,
  }));

  const secondaryNavLinks = secondaryItems.map((item) => ({
    name: item.name,
    path: item.path,
    icon: item.icon,
  }));

  const allNavLinks = enabledItems.map((item) => ({
    name: item.name,
    path: item.path,
    icon: item.icon,
  }));

  useEffect(() => {
    if (!searchOpen) return;
    searchInputRef.current?.focus();
  }, [searchOpen]);

  return (
    <nav className="bg-app-surface shadow-md border-b border-app-border sticky top-0 z-50">
      <div className="mx-auto px-3 sm:px-4 lg:px-6 max-w-[1920px]">
        <div className="flex justify-between h-14 sm:h-16">
          {/* Logo and primary navigation */}
          <div className="flex items-center min-w-0">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center space-x-2 mr-3 sm:mr-6 lg:mr-8 flex-shrink-0">
              <div
                className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg shadow-sm overflow-hidden"
                style={{
                  background: `linear-gradient(to bottom right, ${branding.primaryColour}, ${branding.secondaryColour})`,
                }}
              >
                {branding.appIcon ? (
                  <img src={branding.appIcon} alt={branding.appName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-lg sm:text-xl font-bold">
                    {(branding.appName || 'N')[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-lg sm:text-xl font-bold text-app-text-heading hidden sm:block truncate">
                {branding.appName || 'Nonprofit Manager'}
              </span>
            </Link>

            {/* Desktop navigation - Primary links */}
            <div className="hidden lg:flex lg:space-x-1">
              {primaryNavLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive(link.path)
                      ? 'bg-app-accent-soft text-app-accent-text'
                      : 'text-app-text-muted hover:bg-app-hover hover:text-app-text'
                  }`}
                >
                  <span className="mr-1.5">{link.icon}</span>
                  {link.name}
                </Link>
              ))}

              {/* More dropdown for secondary links */}
              <div className="relative">
                <button
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    secondaryNavLinks.some(link => isActive(link.path))
                      ? 'bg-app-accent-soft text-app-accent-text'
                      : 'text-app-text-muted hover:bg-app-hover hover:text-app-text'
                  }`}
                >
                  More
                  <svg className="inline-block w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* More dropdown menu */}
                {moreMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setMoreMenuOpen(false)}
                    />
                    <div
                      ref={moreMenuRef}
                      className="menu-surface-opaque absolute left-0 mt-2 w-48 rounded-lg shadow-lg border border-app-border py-1 z-20 animate-fadeIn"
                    >
                      {secondaryNavLinks.map((link) => (
                        <Link
                          key={link.path}
                          to={link.path}
                          onClick={() => setMoreMenuOpen(false)}
                          className={`block px-4 py-2 text-sm ${
                            isActive(link.path)
                              ? 'bg-app-accent-soft text-app-accent-text font-medium'
                              : 'text-app-text-muted hover:bg-app-hover'
                          }`}
                        >
                          <span className="mr-2">{link.icon}</span>
                          {link.name}
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right side - Search, Reports, Settings, User menu */}
          <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4">
            {/* Search button - hidden on mobile and tablet */}
            <button
              type="button"
              className="hidden xl:flex items-center px-3 py-1.5 text-sm text-app-text-subtle bg-app-surface-muted rounded-md hover:bg-app-hover transition-colors"
              onClick={() => {
                handleSearch();
              }}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <span className="hidden xl:inline">Search</span>
            </button>

            {/* Reports link - hidden on mobile */}
            <Link
              to="/reports/builder"
              className="hidden lg:flex items-center px-3 py-2 text-sm font-medium text-app-text-muted rounded-md hover:bg-app-hover transition-colors whitespace-nowrap"
            >
              <svg className="w-4 h-4 lg:mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span className="hidden xl:inline">Reports</span>
            </Link>

            {/* User Settings link - hidden on mobile */}
            <Link
              to="/settings/user"
              className="hidden lg:flex items-center px-3 py-2 text-sm font-medium text-app-text-muted rounded-md hover:bg-app-hover transition-colors whitespace-nowrap"
            >
              <svg className="w-4 h-4 lg:mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <span className="hidden xl:inline">My Profile</span>
            </Link>

            {/* Theme quick-access */}
            <div className="relative hidden lg:block">
              <button
                type="button"
                onClick={() => setThemeMenuOpen(!themeMenuOpen)}
                onDoubleClick={handleQuickThemeCycle}
                className="flex items-center px-2 py-2 text-sm rounded-md hover:bg-app-hover transition-colors"
                aria-label="Theme settings"
                aria-expanded={themeMenuOpen}
                title="Click to pick theme, double-click to cycle"
              >
                <span className="text-base">{themeLabels[theme] || '🎨'}</span>
                {isDarkMode && <span className="ml-0.5 text-xs">🌙</span>}
              </button>

              {themeMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setThemeMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div
                    ref={themeMenuRef}
                    className="menu-surface-opaque absolute right-0 mt-2 w-52 rounded-lg shadow-lg border border-app-border py-2 z-20 animate-fadeIn"
                  >
                    <div className="px-3 pb-2 mb-1 border-b border-app-border-muted">
                      <p className="text-xs font-semibold text-app-text-muted uppercase tracking-wider">Theme</p>
                    </div>
                    {availableThemes.map(t => (
                      <button
                        key={t}
                        onClick={() => { setTheme(t); setThemeMenuOpen(false); }}
                        className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 transition-colors ${
                          theme === t
                            ? 'bg-app-accent-soft text-app-accent-text font-medium'
                            : 'text-app-text hover:bg-app-hover'
                        }`}
                      >
                        <span>{themeLabels[t] || '🎨'}</span>
                        <span className="capitalize">{t.replace(/-/g, ' ')}</span>
                        {theme === t && <span className="ml-auto text-app-accent">✓</span>}
                      </button>
                    ))}
                    <div className="px-3 pt-2 mt-1 border-t border-app-border-muted">
                      <button
                        onClick={() => { toggleDarkMode(); }}
                        className="w-full text-left text-sm flex items-center gap-2 py-1.5 text-app-text hover:bg-app-hover rounded px-1 transition-colors"
                      >
                        <span>{isDarkMode ? '☀️' : '🌙'}</span>
                        <span>{isDarkMode ? 'Switch to Light' : 'Switch to Dark'}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* User menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-3 py-2 text-sm font-medium text-app-text-muted rounded-md hover:bg-app-hover transition-colors"
                aria-label="User menu"
                aria-expanded={userMenuOpen ? "true" : "false"}
              >
                <Avatar
                  src={user?.profilePicture}
                  firstName={user?.firstName}
                  lastName={user?.lastName}
                  size="sm"
                />
                <span className="hidden md:block truncate max-w-[120px] lg:max-w-[150px]">
                  {user?.firstName} {user?.lastName}
                </span>
                <svg className="w-4 h-4 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* User dropdown menu */}
              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setUserMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div
                    ref={userMenuRef}
                    className="menu-surface-opaque absolute right-0 mt-2 w-56 rounded-lg shadow-lg border border-app-border py-1 z-20 animate-fadeIn"
                  >
                    <div className="px-4 py-3 border-b border-app-border">
                      <p className="text-sm font-medium text-app-text truncate">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-app-text-muted truncate">{user?.email}</p>
                      <p className="text-xs text-app-text-subtle mt-1 capitalize">{user?.role}</p>
                    </div>
                    <Link
                      to="/dashboard"
                      className="block px-4 py-2 text-sm text-app-text-muted hover:bg-app-hover transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <svg className="inline-block w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      Dashboard
                    </Link>
                    <Link
                      to="/settings/user"
                      className="block px-4 py-2 text-sm text-app-text-muted hover:bg-app-hover transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <svg className="inline-block w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      User Settings
                    </Link>
                    {user?.role === 'admin' && (
                      <Link
                        to="/settings/admin"
                        className="block px-4 py-2 text-sm text-app-text-muted hover:bg-app-hover transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <svg className="inline-block w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Admin Settings
                        <span className="ml-2 px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                          Admin
                        </span>
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <svg className="inline-block w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden inline-flex items-center justify-center p-2 rounded-md text-app-text-muted hover:bg-app-hover focus:outline-none focus:ring-2 focus:ring-inset focus:ring-app-accent transition-colors"
              aria-label="Main menu"
              aria-expanded={mobileMenuOpen ? "true" : "false"}
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet menu with backdrop and smooth animation */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-in menu panel */}
          <div
            ref={mobileMenuRef}
            className="fixed inset-y-0 right-0 max-w-xs w-full bg-app-surface shadow-xl z-50 lg:hidden overflow-y-auto transform transition-transform duration-300 ease-in-out"
          >
            {/* Mobile menu header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-app-border">
              <div className="flex items-center space-x-2">
                <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg">
                  <span className="text-white text-lg font-bold">N</span>
                </div>
                <span className="text-lg font-bold text-app-text-heading">Menu</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-md text-app-text-muted hover:bg-app-hover transition-colors"
                aria-label="Close menu"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Navigation links */}
            <div className="px-3 py-4 space-y-1">
              <div className="text-xs font-semibold text-app-text-subtle uppercase tracking-wider px-3 mb-2">
                Main Navigation
              </div>
              {allNavLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center px-3 py-3 rounded-lg text-base font-medium transition-colors ${
                    isActive(link.path)
                      ? 'bg-app-accent-soft text-app-accent-text'
                      : 'text-app-text-muted hover:bg-app-hover'
                  }`}
                >
                  <span className="text-xl mr-3">{link.icon}</span>
                  <span>{link.name}</span>
                  {isActive(link.path) && (
                    <svg className="ml-auto w-5 h-5 text-app-accent-text" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </Link>
              ))}
            </div>

            {/* Utilities section */}
            <div className="px-3 py-4 border-t border-app-border space-y-1">
              <div className="text-xs font-semibold text-app-text-subtle uppercase tracking-wider px-3 mb-2">
                Utilities
              </div>
              <Link
                to="/reports/builder"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center px-3 py-3 rounded-lg text-base font-medium text-app-text-muted hover:bg-app-hover transition-colors"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Reports
              </Link>
              <Link
                to="/settings/user"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center px-3 py-3 rounded-lg text-base font-medium text-app-text-muted hover:bg-app-hover transition-colors"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                User Settings
              </Link>
              {user?.role === 'admin' && (
                <Link
                  to="/settings/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center px-3 py-3 rounded-lg text-base font-medium text-app-text-muted hover:bg-app-hover transition-colors"
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Admin Settings
                  <span className="ml-2 px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                    Admin
                  </span>
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleSearch();
                }}
                className="flex items-center w-full px-3 py-3 rounded-lg text-base font-medium text-app-text-muted hover:bg-app-hover transition-colors"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search
              </button>
            </div>

            {/* User section at bottom */}
            <div className="px-3 py-4 border-t border-app-border mt-auto">
              <div className="flex items-center space-x-3 px-3 py-3 bg-app-surface-muted rounded-lg">
                <Avatar
                  src={user?.profilePicture}
                  firstName={user?.firstName}
                  lastName={user?.lastName}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-app-text truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-app-text-muted truncate">{user?.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="flex items-center w-full px-3 py-3 mt-2 rounded-lg text-base font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </>
      )}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-40 p-4">
          <div className="bg-app-surface rounded-lg shadow-xl w-full max-w-2xl mt-16">
            <div className="p-4 border-b border-app-border flex items-center justify-between">
              <h2 className="text-lg font-semibold text-app-text-heading">Search People</h2>
              <button
                onClick={() => setSearchOpen(false)}
                className="p-1 text-app-text-subtle hover:text-app-text-muted rounded"
                type="button"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={lookup.searchTerm}
                  onChange={lookup.handleSearchChange}
                  placeholder="Search by name, email, or phone..."
                  className="w-full px-4 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-transparent bg-app-input-bg text-app-text"
                />
                {lookup.isLoading && (
                  <div className="absolute right-3 top-2.5 text-app-text-subtle text-sm">
                    Searching...
                  </div>
                )}
              </div>

              <div className="mt-4 max-h-80 overflow-auto border border-app-border rounded-lg">
                {lookup.searchTerm.trim().length < 2 ? (
                  <div className="p-4 text-sm text-app-text-muted">
                    Type at least 2 characters to search.
                  </div>
                ) : lookup.results.length === 0 ? (
                  <div className="p-4 text-sm text-app-text-muted">
                    No matches for &quot;{lookup.searchTerm}&quot;.
                  </div>
                ) : (
                  <ul className="divide-y divide-app-border">
                    {lookup.results.map((result) => (
                      <li key={result.contact_id}>
                        <Link
                          to={`/contacts/${result.contact_id}`}
                          onClick={() => setSearchOpen(false)}
                          className="block px-4 py-3 hover:bg-app-hover"
                        >
                          <div className="font-medium text-app-text">
                            {result.first_name} {result.last_name}
                          </div>
                          <div className="text-sm text-app-text-muted">
                            {result.email || result.mobile_phone || result.phone || 'No contact info'}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setSearchOpen(false);
                    navigate('/contacts');
                  }}
                  className="px-4 py-2 border border-app-border rounded-lg text-sm text-app-text hover:bg-app-hover"
                >
                  View All People
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
