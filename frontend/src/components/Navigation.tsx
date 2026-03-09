import { lazy, Suspense, useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logoutAsync } from '../features/auth/state';
import { useNavigationPreferences } from '../hooks/useNavigationPreferences';
import { useBranding } from '../contexts/BrandingContext';
import { useTheme } from '../contexts/ThemeContext';
import Avatar from './Avatar';
import { getSurfaceAreaNavigation } from '../routes/routeCatalog';
import { getStartupStaffUtilityEntries } from '../routes/startupRouteCatalog';
import type { ThemeId } from '../theme/themeRegistry';
import NavPopover from './navigation/NavPopover';
import AdminQuickActionsBar from '../features/adminOps/components/AdminQuickActionsBar';
import { getAdminSettingsPath } from '../features/adminOps/adminRoutePaths';

const NavigationQuickLookupDialog = lazy(() => import('./navigation/NavigationQuickLookupDialog'));

const routeFlags = {
  VITE_TEAM_CHAT_ENABLED: import.meta.env.VITE_TEAM_CHAT_ENABLED,
};

export default function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { branding } = useBranding();
  const { theme, setTheme, isDarkMode, toggleDarkMode, availableThemes } = useTheme();
  const {
    favoriteItems,
    enabledRouteIds,
  } = useNavigationPreferences();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const adminMenuRef = useRef<HTMLDivElement>(null);

  const currentLocation = `${location.pathname}${location.search}`;
  const areaNavigation = getSurfaceAreaNavigation('staff', currentLocation, {
    flags: routeFlags,
    enabledRouteIds,
  });
  const utilityNavLinks = getStartupStaffUtilityEntries(routeFlags).map((entry) => ({
    path: entry.href || entry.path,
    label: entry.staffNav?.label || entry.title,
    icon: entry.staffNav?.icon || '•',
  }));
  const adminSettingsPath = getAdminSettingsPath('dashboard');

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
    setThemeMenuOpen(false);
    setAdminMenuOpen(false);
  }, []);

  const focusFirstItem = (ref: RefObject<HTMLDivElement | null>) => {
    const item = ref.current?.querySelector<HTMLElement>('a,button,input,[tabindex]:not([tabindex="-1"])');
    item?.focus();
  };

  const handleQuickThemeCycle = useCallback(() => {
    const index = availableThemes.indexOf(theme);
    const nextIndex = (index + 1) % availableThemes.length;
    setTheme(availableThemes[nextIndex]);
  }, [availableThemes, setTheme, theme]);

  const handleLogout = () => {
    dispatch(logoutAsync()).finally(() => navigate('/login'));
  };

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeAllMenus();
        setSearchOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [closeAllMenus]);

  useEffect(() => {
    closeAllMenus();
  }, [closeAllMenus, location.pathname]);

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
    if (userMenuOpen) {
      focusFirstItem(userMenuRef);
    }
  }, [userMenuOpen]);

  useEffect(() => {
    if (themeMenuOpen) {
      focusFirstItem(themeMenuRef);
    }
  }, [themeMenuOpen]);

  useEffect(() => {
    if (adminMenuOpen) {
      focusFirstItem(adminMenuRef);
    }
  }, [adminMenuOpen]);

  useEffect(() => {
    if (!searchOpen) {
      searchButtonRef.current?.focus();
    }
  }, [searchOpen]);

  return (
    <nav className="sticky top-0 z-50 border-b border-app-border/70 bg-app-surface-elevated/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1920px] items-center gap-3 px-3 sm:px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/dashboard" className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-[var(--ui-radius-md)] bg-app-accent text-[var(--app-accent-foreground)] shadow-sm">
              {branding.appIcon ? (
                <img src={branding.appIcon} alt={branding.appName} className="h-full w-full object-cover" />
              ) : (
                <span className="text-lg font-bold">{(branding.appName || 'N')[0]?.toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-app-text-heading">
                {branding.appName || 'Nonprofit Manager'}
              </p>
              <p className="hidden text-xs text-app-text-muted sm:block">Staff workspace</p>
            </div>
          </Link>
        </div>

        <div className="hidden min-w-0 flex-1 items-center justify-center lg:flex">
          <div className="flex flex-wrap items-center gap-1 rounded-full border border-app-border-muted bg-app-surface px-2 py-1 shadow-sm">
            {areaNavigation.map((item) => (
              <Link
                key={item.area}
                to={item.href}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition ${
                  item.isActive
                    ? 'bg-app-accent-soft text-app-accent-text'
                    : 'text-app-text-muted hover:bg-app-hover hover:text-app-text'
                }`}
              >
                {item.icon ? <span aria-hidden="true">{item.icon}</span> : null}
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            ref={searchButtonRef}
            className="hidden items-center gap-2 rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface px-3 py-2 text-sm font-medium text-app-text-muted transition hover:bg-app-hover hover:text-app-text lg:inline-flex"
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <span className="hidden xl:inline">Search workspace</span>
          </button>

          <Link
            to="/alerts"
            className="hidden items-center gap-2 rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface px-3 py-2 text-sm font-medium text-app-text-muted transition hover:bg-app-hover hover:text-app-text lg:inline-flex"
            aria-label="Notifications"
          >
            <span aria-hidden="true">🔔</span>
            <span className="hidden xl:inline">Notifications</span>
          </Link>

          {utilityNavLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="hidden items-center gap-2 rounded-[var(--ui-radius-sm)] px-3 py-2 text-sm font-medium text-app-text-muted transition hover:bg-app-hover hover:text-app-text xl:inline-flex"
            >
              <span aria-hidden="true">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}

          {user?.role === 'admin' ? (
            <div className="relative hidden lg:block">
              <button
                type="button"
                onClick={() => {
                  setAdminMenuOpen((open) => !open);
                  setUserMenuOpen(false);
                  setThemeMenuOpen(false);
                }}
                className="inline-flex items-center gap-2 rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface px-3 py-2 text-sm font-medium text-app-text-muted transition hover:bg-app-hover hover:text-app-text"
                aria-label="Admin quick actions"
                aria-expanded={adminMenuOpen}
                aria-haspopup="menu"
                aria-controls="topnav-admin-actions"
              >
                <span>Admin</span>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
          ) : null}

          <div className="relative hidden lg:block">
            <button
              type="button"
              onClick={() => {
                setThemeMenuOpen((open) => !open);
                setUserMenuOpen(false);
                setAdminMenuOpen(false);
              }}
              onDoubleClick={handleQuickThemeCycle}
              className="inline-flex items-center gap-2 rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface px-3 py-2 text-sm font-medium text-app-text-muted transition hover:bg-app-hover hover:text-app-text"
              aria-label="Theme settings"
              aria-expanded={themeMenuOpen}
              aria-haspopup="menu"
              aria-controls="topnav-theme-menu"
              title="Click to pick theme, double-click to cycle"
            >
              <span>{themeLabels[theme]}</span>
              {isDarkMode ? <span aria-hidden="true">🌙</span> : null}
            </button>

            <NavPopover
              open={themeMenuOpen}
              onClose={() => setThemeMenuOpen(false)}
              align="right"
              panelClassName="w-56 py-2"
              panelRef={themeMenuRef}
            >
              <div id="topnav-theme-menu" role="menu" aria-label="Theme settings">
                <div className="mb-1 border-b border-app-border-muted px-3 pb-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">Theme</p>
                </div>
                {availableThemes.map((availableTheme) => (
                  <button
                    key={availableTheme}
                    type="button"
                    onClick={() => {
                      setTheme(availableTheme);
                      setThemeMenuOpen(false);
                    }}
                    role="menuitem"
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition ${
                      theme === availableTheme
                        ? 'bg-app-accent-soft font-medium text-app-accent-text'
                        : 'text-app-text hover:bg-app-hover'
                    }`}
                  >
                    <span className="text-[11px] font-semibold tracking-wide">{themeLabels[availableTheme]}</span>
                    <span className="capitalize">{availableTheme.replace(/-/g, ' ')}</span>
                    {theme === availableTheme ? <span className="ml-auto text-app-accent">✓</span> : null}
                  </button>
                ))}
                <div className="mt-1 border-t border-app-border-muted px-3 pt-2">
                  <button
                    type="button"
                    onClick={toggleDarkMode}
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded px-1 py-1.5 text-left text-sm text-app-text transition hover:bg-app-hover"
                  >
                    <span>{isDarkMode ? '☀️' : '🌙'}</span>
                    <span>{isDarkMode ? 'Switch to Light' : 'Switch to Dark'}</span>
                  </button>
                </div>
              </div>
            </NavPopover>
          </div>

          <div className="relative hidden lg:block">
            <button
              type="button"
              onClick={() => {
                setUserMenuOpen((open) => !open);
                setThemeMenuOpen(false);
                setAdminMenuOpen(false);
              }}
              className="inline-flex items-center gap-2 rounded-[var(--ui-radius-sm)] px-2 py-1.5 text-sm font-medium text-app-text-muted transition hover:bg-app-hover hover:text-app-text"
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
              <span className="hidden max-w-[150px] truncate xl:block">
                {user?.firstName} {user?.lastName}
              </span>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
                <div className="border-b border-app-border px-4 py-3">
                  <p className="truncate text-sm font-medium text-app-text">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="truncate text-xs text-app-text-muted">{user?.email}</p>
                  <p className="mt-1 text-xs capitalize text-app-text-subtle">{user?.role}</p>
                </div>
                <Link
                  to="/dashboard"
                  role="menuitem"
                  className="block px-4 py-2 text-sm text-app-text transition hover:bg-app-hover"
                  onClick={() => setUserMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  to="/settings/user"
                  role="menuitem"
                  className="block px-4 py-2 text-sm text-app-text transition hover:bg-app-hover"
                  onClick={() => setUserMenuOpen(false)}
                >
                  User Settings
                </Link>
                {user?.role === 'admin' ? (
                  <>
                    <Link
                      to={adminSettingsPath}
                      role="menuitem"
                      className="block px-4 py-2 text-sm text-app-text transition hover:bg-app-hover"
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
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    handleLogout();
                  }}
                  role="menuitem"
                  className="block w-full px-4 py-2 text-left text-sm text-app-accent transition hover:bg-app-accent-soft"
                >
                  Logout
                </button>
              </div>
            </NavPopover>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="inline-flex items-center justify-center rounded-[var(--ui-radius-sm)] p-2 text-app-text-muted transition hover:bg-app-hover hover:text-app-text lg:hidden"
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

      {mobileMenuOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/45 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          <div
            ref={mobileMenuRef}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col overflow-y-auto bg-app-surface shadow-xl lg:hidden"
          >
            <div className="flex items-center justify-between border-b border-app-border px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-app-text-heading">{branding.appName || 'Nonprofit Manager'}</p>
                <p className="text-xs text-app-text-muted">Staff workspace</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-[var(--ui-radius-sm)] p-2 text-app-text-muted transition hover:bg-app-hover hover:text-app-text"
                aria-label="Close menu"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6 px-4 py-5">
              <section>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-subtle">Areas</p>
                <div className="mt-3 space-y-2">
                  {areaNavigation.map((item) => (
                    <Link
                      key={item.area}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-[var(--ui-radius-md)] border px-3 py-3 text-sm font-medium transition ${
                        item.isActive
                          ? 'border-app-accent bg-app-accent-soft text-app-accent-text'
                          : 'border-app-border-muted bg-app-surface text-app-text hover:bg-app-hover'
                      }`}
                    >
                      {item.icon ? <span aria-hidden="true">{item.icon}</span> : null}
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              </section>

              {favoriteItems.length > 0 ? (
                <section>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-subtle">Favorites</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {favoriteItems.map((item) => (
                      <Link
                        key={item.id}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-surface px-3 py-2 text-sm font-medium text-app-text transition hover:bg-app-hover"
                      >
                        <span aria-hidden="true">{item.icon}</span>
                        <span>{item.shortLabel ?? item.name}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}

              <section>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-subtle">Utilities</p>
                <div className="mt-3 space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setSearchOpen(true);
                    }}
                    className="flex w-full items-center gap-3 rounded-[var(--ui-radius-md)] border border-app-border-muted bg-app-surface px-3 py-3 text-left text-sm font-medium text-app-text transition hover:bg-app-hover"
                  >
                    <span aria-hidden="true">🔎</span>
                    <span>Search workspace</span>
                  </button>
                  <Link
                    to="/alerts"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-[var(--ui-radius-md)] border border-app-border-muted bg-app-surface px-3 py-3 text-sm font-medium text-app-text transition hover:bg-app-hover"
                  >
                    <span aria-hidden="true">🔔</span>
                    <span>Notifications</span>
                  </Link>
                  {utilityNavLinks.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 rounded-[var(--ui-radius-md)] border border-app-border-muted bg-app-surface px-3 py-3 text-sm font-medium text-app-text transition hover:bg-app-hover"
                    >
                      <span aria-hidden="true">{link.icon}</span>
                      <span>{link.label}</span>
                    </Link>
                  ))}
                  <button
                    type="button"
                    onClick={toggleDarkMode}
                    className="flex w-full items-center gap-3 rounded-[var(--ui-radius-md)] border border-app-border-muted bg-app-surface px-3 py-3 text-left text-sm font-medium text-app-text transition hover:bg-app-hover"
                  >
                    <span>{isDarkMode ? '☀️' : '🌙'}</span>
                    <span>{isDarkMode ? 'Switch to Light' : 'Switch to Dark'}</span>
                  </button>
                </div>
              </section>
            </div>

            <div className="mt-auto border-t border-app-border px-4 py-4">
              <div className="flex items-center gap-3 rounded-[var(--ui-radius-md)] bg-app-surface-muted px-3 py-3">
                <Avatar
                  src={user?.profilePicture}
                  firstName={user?.firstName}
                  lastName={user?.lastName}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-app-text">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="truncate text-xs text-app-text-muted">{user?.email}</p>
                </div>
              </div>
              <div className="mt-3 grid gap-2">
                <Link
                  to="/settings/user"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex items-center justify-center rounded-[var(--ui-radius-sm)] border border-app-border bg-app-surface px-4 py-2 text-sm font-semibold text-app-text transition hover:bg-app-hover"
                >
                  User Settings
                </Link>
                {user?.role === 'admin' ? (
                  <Link
                    to={adminSettingsPath}
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex items-center justify-center rounded-[var(--ui-radius-sm)] border border-app-border bg-app-surface px-4 py-2 text-sm font-semibold text-app-text transition hover:bg-app-hover"
                  >
                    Admin Settings
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="inline-flex items-center justify-center rounded-[var(--ui-radius-sm)] border border-app-accent bg-app-accent px-4 py-2 text-sm font-semibold text-[var(--app-accent-foreground)] transition hover:bg-app-accent-hover"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {searchOpen ? (
        <Suspense fallback={null}>
          <NavigationQuickLookupDialog onClose={() => setSearchOpen(false)} />
        </Suspense>
      ) : null}
    </nav>
  );
}
