/**
 * Navigation Bar Component
 * Main navigation for the application
 * Fully responsive with mobile, tablet, and desktop optimizations
 */

import { lazy, Suspense, useState, useEffect, useRef, useCallback, type RefObject } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logoutAsync } from '../features/auth/state';
import { useNavigationPreferences } from '../hooks/useNavigationPreferences';
import { useBranding } from '../contexts/BrandingContext';
import { useTheme } from '../contexts/ThemeContext';
import Avatar from './Avatar';
import { getRouteMeta } from '../routes/routeMeta';
import { getStartupStaffUtilityEntries } from '../routes/startupRouteCatalog';
import type { ThemeId } from '../theme/themeRegistry';
import NavPopover from './navigation/NavPopover';
import PinnedNavStrip from './navigation/PinnedNavStrip';
import AdminQuickActionsBar from '../features/adminOps/components/AdminQuickActionsBar';
import { getAdminSettingsPath } from '../features/adminOps/adminRoutePaths';

const NavigationQuickLookupDialog = lazy(() => import('./navigation/NavigationQuickLookupDialog'));

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
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const adminMenuRef = useRef<HTMLDivElement>(null);
  const routeMeta = getRouteMeta(`${location.pathname}${location.search}`);

  const themeLabels: Record<ThemeId, string> = {
    neobrutalist: 'NB',
    'sea-breeze': 'SB',
    corporate: 'CP',
    'clean-modern': 'CM',
    glass: 'GL',
    'high-contrast': 'HC',
  };

  const closeAllMenus = useCallback(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
    setMoreMenuOpen(false);
    setThemeMenuOpen(false);
    setAdminMenuOpen(false);
  }, []);

  const focusFirstItem = (ref: RefObject<HTMLDivElement | null>) => {
    const item = ref.current?.querySelector<HTMLElement>('a,button,input,[tabindex]:not([tabindex="-1"])');
    item?.focus();
  };

  const handleQuickThemeCycle = useCallback(() => {
    const idx = availableThemes.indexOf(theme);
    const nextIdx = (idx + 1) % availableThemes.length;
    setTheme(availableThemes[nextIdx]);
  }, [theme, availableThemes, setTheme]);

  // Close menus on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeAllMenus();
        setSearchOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [closeAllMenus]);

  // Close menus when route changes
  useEffect(() => {
    closeAllMenus();
  }, [closeAllMenus, location.pathname]);

  // Prevent body scroll when mobile menu or search is open
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

  useEffect(() => {
    if (moreMenuOpen) focusFirstItem(moreMenuRef);
  }, [moreMenuOpen]);

  useEffect(() => {
    if (userMenuOpen) focusFirstItem(userMenuRef);
  }, [userMenuOpen]);

  useEffect(() => {
    if (themeMenuOpen) focusFirstItem(themeMenuRef);
  }, [themeMenuOpen]);

  useEffect(() => {
    if (adminMenuOpen) focusFirstItem(adminMenuRef);
  }, [adminMenuOpen]);

  const handleLogout = () => {
    dispatch(logoutAsync()).finally(() => navigate('/login'));
  };

  const handleSearch = () => {
    setSearchOpen(true);
  };

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === path;
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const {
    pinnedItems,
    primaryItems,
    secondaryItems,
    enabledItems,
    togglePinned,
  } = useNavigationPreferences();

  const primaryNavLinks = primaryItems.map((item) => ({
    ...item,
    shortLabel: item.shortLabel ?? item.name,
    ariaLabel: item.ariaLabel ?? item.name,
  }));

  const secondaryNavLinks = secondaryItems.map((item) => ({
    ...item,
    shortLabel: item.shortLabel ?? item.name,
    ariaLabel: item.ariaLabel ?? item.name,
  }));

  const allNavLinks = enabledItems.map((item) => ({
    ...item,
    shortLabel: item.shortLabel ?? item.name,
    ariaLabel: item.ariaLabel ?? item.name,
  }));
  const utilityNavLinks = getStartupStaffUtilityEntries({
    VITE_TEAM_CHAT_ENABLED: import.meta.env.VITE_TEAM_CHAT_ENABLED,
  }).map((entry) => ({
    path: entry.href || entry.path,
    label: entry.staffNav?.label || entry.title,
    icon: entry.staffNav?.icon || '•',
  }));
  const adminSettingsPath = getAdminSettingsPath('dashboard');

  const openMenu = (menu: 'user' | 'more' | 'theme' | 'admin') => {
    setUserMenuOpen(menu === 'user' ? (prev) => !prev : false);
    setMoreMenuOpen(menu === 'more' ? (prev) => !prev : false);
    setThemeMenuOpen(menu === 'theme' ? (prev) => !prev : false);
    setAdminMenuOpen(menu === 'admin' ? (prev) => !prev : false);
  };

  useEffect(() => {
    if (!searchOpen) {
      searchButtonRef.current?.focus();
    }
  }, [searchOpen]);

  return (
    <nav className="bg-app-surface shadow-md border-b border-app-border sticky top-0 z-50">
      <div className="mx-auto px-3 sm:px-4 lg:px-6 max-w-[1920px]">
        <div className="flex justify-between h-14 sm:h-16">
          <div className="flex items-center min-w-0">
            <Link to="/dashboard" className="flex items-center space-x-2 mr-3 sm:mr-6 lg:mr-8 flex-shrink-0">
              <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg shadow-sm overflow-hidden bg-app-accent">
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

            <span className="hidden md:inline-flex items-center rounded-full border border-app-border px-2 py-1 text-xs font-semibold text-app-text-muted">
              You are here: {routeMeta.section}
            </span>

            <PinnedNavStrip items={pinnedItems} isActive={isActive} onUnpin={togglePinned} className="ml-3" />

            <div className="hidden lg:flex lg:space-x-1 lg:ml-3">
              {primaryNavLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  aria-label={link.ariaLabel}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive(link.path)
                      ? 'bg-app-accent-soft text-app-accent-text'
                      : 'text-app-text-muted hover:bg-app-hover hover:text-app-text'
                  }`}
                >
                  <span className="mr-1.5" aria-hidden="true">{link.icon}</span>
                  {link.shortLabel}
                </Link>
              ))}

              <div className="relative">
                <button
                  onClick={() => openMenu('more')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    secondaryNavLinks.some((link) => isActive(link.path))
                      ? 'bg-app-accent-soft text-app-accent-text'
                      : 'text-app-text-muted hover:bg-app-hover hover:text-app-text'
                  }`}
                  aria-haspopup="menu"
                  aria-expanded={moreMenuOpen}
                  aria-controls="topnav-more-menu"
                >
                  More
                  <svg className="inline-block w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <NavPopover
                  open={moreMenuOpen}
                  onClose={() => setMoreMenuOpen(false)}
                  panelClassName="w-52"
                  panelRef={moreMenuRef}
                >
                  <div id="topnav-more-menu" role="menu" aria-label="More navigation links">
                    {secondaryNavLinks.map((link) => (
                      <Link
                        key={link.path}
                        to={link.path}
                        role="menuitem"
                        aria-label={link.ariaLabel}
                        onClick={() => setMoreMenuOpen(false)}
                        className={`block px-4 py-2 text-sm ${
                          isActive(link.path)
                            ? 'bg-app-accent-soft text-app-accent-text font-medium'
                            : 'text-app-text-muted hover:bg-app-hover'
                        }`}
                      >
                        <span className="mr-2" aria-hidden="true">{link.icon}</span>
                        {link.shortLabel}
                      </Link>
                    ))}
                  </div>
                </NavPopover>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4">
            <button
              type="button"
              ref={searchButtonRef}
              className="hidden xl:flex items-center px-3 py-1.5 text-sm text-app-text-subtle bg-app-surface-muted rounded-md hover:bg-app-hover transition-colors"
              onClick={handleSearch}
              aria-label="Search"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <span className="hidden xl:inline">Search</span>
            </button>

            {utilityNavLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-app-text-muted rounded-md hover:bg-app-hover transition-colors whitespace-nowrap"
              >
                <span aria-hidden="true">{link.icon}</span>
                <span className="hidden xl:inline">{link.label}</span>
              </Link>
            ))}

            <Link
              to="/settings/user"
              className="hidden lg:flex items-center px-3 py-2 text-sm font-medium text-app-text-muted rounded-md hover:bg-app-hover transition-colors whitespace-nowrap"
            >
              <svg className="w-4 h-4 lg:mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <span className="hidden xl:inline">My Profile</span>
            </Link>

            {user?.role === 'admin' && (
              <div className="relative hidden lg:block">
                <button
                  type="button"
                  onClick={() => openMenu('admin')}
                  className="flex items-center gap-1.5 px-2.5 py-2 text-sm rounded-md hover:bg-app-hover transition-colors"
                  aria-label="Admin quick actions"
                  aria-expanded={adminMenuOpen}
                  aria-haspopup="menu"
                  aria-controls="topnav-admin-actions"
                >
                  <span className="text-xs font-semibold tracking-wide">Admin</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <NavPopover
                  open={adminMenuOpen}
                  onClose={() => setAdminMenuOpen(false)}
                  align="right"
                  panelClassName="w-80 p-2"
                  panelRef={adminMenuRef}
                >
                  <div id="topnav-admin-actions" role="menu" aria-label="Admin quick actions">
                    <AdminQuickActionsBar
                      role={user.role}
                      compact
                      maxItems={5}
                      onActionClick={() => setAdminMenuOpen(false)}
                    />
                  </div>
                </NavPopover>
              </div>
            )}

            <div className="relative hidden lg:block">
              <button
                type="button"
                onClick={() => openMenu('theme')}
                onDoubleClick={handleQuickThemeCycle}
                className="flex items-center px-2 py-2 text-sm rounded-md hover:bg-app-hover transition-colors"
                aria-label="Theme settings"
                aria-expanded={themeMenuOpen}
                aria-haspopup="menu"
                aria-controls="topnav-theme-menu"
                title="Click to pick theme, double-click to cycle"
              >
                <span className="text-xs font-semibold tracking-wide">{themeLabels[theme]}</span>
                {isDarkMode && <span className="ml-0.5 text-xs" aria-hidden="true">🌙</span>}
              </button>

              <NavPopover
                open={themeMenuOpen}
                onClose={() => setThemeMenuOpen(false)}
                align="right"
                panelClassName="w-52 py-2"
                panelRef={themeMenuRef}
              >
                <div id="topnav-theme-menu" role="menu" aria-label="Theme settings">
                  <div className="px-3 pb-2 mb-1 border-b border-app-border-muted">
                    <p className="text-xs font-semibold text-app-text-muted uppercase tracking-wider">Theme</p>
                  </div>
                  {availableThemes.map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setTheme(t);
                        setThemeMenuOpen(false);
                      }}
                      role="menuitem"
                      className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 transition-colors ${
                        theme === t
                          ? 'bg-app-accent-soft text-app-accent-text font-medium'
                          : 'text-app-text hover:bg-app-hover'
                      }`}
                    >
                      <span className="text-[11px] font-semibold tracking-wide">{themeLabels[t]}</span>
                      <span className="capitalize">{t.replace(/-/g, ' ')}</span>
                      {theme === t && <span className="ml-auto text-app-accent">✓</span>}
                    </button>
                  ))}
                  <div className="px-3 pt-2 mt-1 border-t border-app-border-muted">
                    <button
                      onClick={toggleDarkMode}
                      role="menuitem"
                      className="w-full text-left text-sm flex items-center gap-2 py-1.5 text-app-text hover:bg-app-hover rounded px-1 transition-colors"
                    >
                      <span>{isDarkMode ? '☀️' : '🌙'}</span>
                      <span>{isDarkMode ? 'Switch to Light' : 'Switch to Dark'}</span>
                    </button>
                  </div>
                </div>
              </NavPopover>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => openMenu('user')}
                className="flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-3 py-2 text-sm font-medium text-app-text-muted rounded-md hover:bg-app-hover transition-colors"
                aria-label="User menu"
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                aria-controls="topnav-user-menu"
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
                <svg className="w-4 h-4 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <NavPopover
                open={userMenuOpen}
                onClose={() => setUserMenuOpen(false)}
                align="right"
                panelClassName="w-72"
                panelRef={userMenuRef}
              >
                <div id="topnav-user-menu" role="menu" aria-label="User menu links">
                  <div className="px-4 py-3 border-b border-app-border">
                    <p className="text-sm font-medium text-app-text truncate">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-app-text-muted truncate">{user?.email}</p>
                    <p className="text-xs text-app-text-subtle mt-1 capitalize">{user?.role}</p>
                  </div>
                  <Link
                    to="/dashboard"
                    role="menuitem"
                    className="block px-4 py-2 text-sm text-app-text hover:bg-app-hover transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/settings/user"
                    role="menuitem"
                    className="block px-4 py-2 text-sm text-app-text hover:bg-app-hover transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    User Settings
                  </Link>
                  {user?.role === 'admin' && (
                    <>
                      <Link
                        to={adminSettingsPath}
                        role="menuitem"
                        className="block px-4 py-2 text-sm text-app-text hover:bg-app-hover transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Admin Settings
                      </Link>
                      <div className="border-t border-app-border px-2 py-2">
                        <AdminQuickActionsBar
                          role={user.role}
                          compact
                          maxItems={4}
                          onActionClick={() => setUserMenuOpen(false)}
                        />
                      </div>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleLogout();
                    }}
                    role="menuitem"
                    className="block w-full text-left px-4 py-2 text-sm text-app-accent hover:bg-app-accent-soft transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </NavPopover>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden inline-flex items-center justify-center p-2 rounded-md text-app-text-muted hover:bg-app-hover focus:outline-none focus:ring-2 focus:ring-inset focus:ring-app-accent transition-colors"
              aria-label="Main menu"
              aria-expanded={mobileMenuOpen}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          <div
            ref={mobileMenuRef}
            className="fixed inset-y-0 right-0 max-w-xs w-full bg-app-surface shadow-xl z-50 lg:hidden overflow-y-auto transform transition-transform duration-300 ease-in-out"
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-app-border">
              <div className="flex items-center space-x-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg shadow-sm overflow-hidden bg-app-accent">
                  {branding.appIcon ? (
                    <img src={branding.appIcon} alt={branding.appName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-lg font-bold">
                      {(branding.appName || 'N')[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="text-lg font-bold text-app-text-heading truncate max-w-[150px]">
                  {branding.appName || 'Menu'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-md text-app-text-muted hover:bg-app-hover transition-colors"
                aria-label="Close menu"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-3 py-4 space-y-4">
              <PinnedNavStrip
                items={pinnedItems}
                isActive={isActive}
                compact
                onUnpin={togglePinned}
              />

              <div className="space-y-1">
                <div className="text-xs font-semibold text-app-text-subtle uppercase tracking-wider px-3 mb-2">
                  Main Navigation
                </div>
                {allNavLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    aria-label={link.ariaLabel}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-3 py-3 rounded-lg text-base font-medium transition-colors ${
                      isActive(link.path)
                        ? 'bg-app-accent-soft text-app-accent-text'
                        : 'text-app-text-muted hover:bg-app-hover'
                    }`}
                  >
                    <span className="text-xl mr-3" aria-hidden="true">{link.icon}</span>
                    <span>{link.name}</span>
                    {isActive(link.path) && (
                      <svg className="ml-auto w-5 h-5 text-app-accent-text" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </Link>
                ))}
              </div>
            </div>

            <div className="px-3 py-4 border-t border-app-border space-y-1">
              <div className="text-xs font-semibold text-app-text-subtle uppercase tracking-wider px-3 mb-2">
                Utilities
              </div>
              {utilityNavLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-3 rounded-lg text-base font-medium text-app-text-muted hover:bg-app-hover transition-colors"
                >
                  <span aria-hidden="true">{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              ))}
              <Link
                to="/settings/user"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center px-3 py-3 rounded-lg text-base font-medium text-app-text-muted hover:bg-app-hover transition-colors"
              >
                User Settings
              </Link>
              {user?.role === 'admin' && (
                <>
                  <Link
                    to={adminSettingsPath}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center px-3 py-3 rounded-lg text-base font-medium text-app-text-muted hover:bg-app-hover transition-colors"
                  >
                    Admin Settings
                  </Link>
                  <div className="rounded-lg border border-app-border bg-app-surface-muted p-2">
                    <AdminQuickActionsBar
                      role={user.role}
                      compact
                      maxItems={4}
                      onActionClick={() => setMobileMenuOpen(false)}
                    />
                  </div>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleSearch();
                }}
                className="flex items-center w-full px-3 py-3 rounded-lg text-base font-medium text-app-text-muted hover:bg-app-hover transition-colors"
              >
                Search
              </button>
            </div>

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
                className="flex items-center w-full px-3 py-3 mt-2 rounded-lg text-base font-medium text-app-accent hover:bg-app-accent-soft transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </>
      )}

      {searchOpen && (
        <Suspense fallback={null}>
          <NavigationQuickLookupDialog onClose={() => setSearchOpen(false)} />
        </Suspense>
      )}
    </nav>
  );
};

export default Navigation;
