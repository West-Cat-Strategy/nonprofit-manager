import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { Link } from 'react-router-dom';
import Avatar from './Avatar';
import NavPopover from './navigation/NavPopover';
import MobileNavigationDrawer from './navigation/MobileNavigationDrawer';
import AdminQuickActionsBar from '../features/adminOps/components/AdminQuickActionsBar';
import useStaffNavigationViewModel from '../features/navigation/hooks/useStaffNavigationViewModel';
import { classNames } from './ui/classNames';
import { preloadContactsPeopleRoute } from '../routes/peopleRoutePreload';
import { preloadNavigationQuickLookupDialog } from './navigation/preloadNavigationQuickLookupDialog';
const NavigationQuickLookupDialog = lazy(preloadNavigationQuickLookupDialog);

export default function Navigation() {
  const {
    adminSettingsPath,
    branding,
    canOpenAdminSettings,
    currentLocation,
    currentRouteTitle,
    handleLogout,
    hasActiveSecondaryItem,
    hasActiveUtilityItem,
    isNavItemActive,
    mobileAlertsLink,
    mobileDrawerUtilityLinks,
    mobileNavigationPreferences,
    navigationPreferences: { favoriteItems, primaryItems, secondaryItems },
    themeLabels,
    themeState: { availableThemes, isDarkMode, setTheme, theme, toggleDarkMode },
    utilityNavLinks,
    user,
  } = useStaffNavigationViewModel();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [utilitiesMenuOpen, setUtilitiesMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const adminMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const utilitiesMenuRef = useRef<HTMLDivElement>(null);

  const closeAllMenus = useCallback(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
    setThemeMenuOpen(false);
    setAdminMenuOpen(false);
    setMoreMenuOpen(false);
    setUtilitiesMenuOpen(false);
  }, []);

  const focusFirstItem = (ref: RefObject<HTMLDivElement | null>) => {
    const item = ref.current?.querySelector<HTMLElement>(
      'a,button,input,[tabindex]:not([tabindex="-1"])'
    );
    item?.focus();
  };

  const handleQuickThemeCycle = useCallback(() => {
    const index = availableThemes.indexOf(theme);
    const nextIndex = (index + 1) % availableThemes.length;
    setTheme(availableThemes[nextIndex]);
  }, [availableThemes, setTheme, theme]);

  const prefetchStaffPeoplePath = useCallback(() => {
    void preloadContactsPeopleRoute();
  }, []);

  const prefetchQuickLookup = useCallback(() => {
    void preloadNavigationQuickLookupDialog();
  }, []);

  const desktopActionButtonClass =
    'inline-flex items-center gap-2 rounded-[var(--ui-radius-sm)] border border-app-border bg-app-surface-elevated px-2.5 py-2 text-sm font-semibold text-app-text shadow-sm transition hover:bg-app-surface-muted hover:text-app-text-heading focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2 sm:px-3';
  const desktopMenuButtonClass =
    'inline-flex items-center gap-2 rounded-[var(--ui-radius-sm)] border border-app-border bg-app-surface-elevated px-3 py-2 text-sm font-semibold text-app-text shadow-sm transition hover:bg-app-surface-muted hover:text-app-text-heading focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2';
  const activeDesktopButtonClass =
    'border-app-accent bg-app-accent text-[var(--app-accent-foreground)] hover:bg-app-accent-hover hover:text-[var(--app-accent-foreground)]';

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
  }, [closeAllMenus, currentLocation]);

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
    if (moreMenuOpen) {
      focusFirstItem(moreMenuRef);
    }
  }, [moreMenuOpen]);

  useEffect(() => {
    if (utilitiesMenuOpen) {
      focusFirstItem(utilitiesMenuRef);
    }
  }, [utilitiesMenuOpen]);

  useEffect(() => {
    if (!searchOpen) {
      searchButtonRef.current?.focus();
    }
  }, [searchOpen]);

  return (
    <nav
      aria-label="Global navigation"
      className="sticky top-0 z-50 border-b border-app-border bg-[var(--app-shell-surface)] shadow-sm"
    >
      <div className="mx-auto flex h-14 max-w-[1920px] items-center gap-3 px-3 sm:h-16 sm:px-4 lg:px-6">
        <div className="flex min-w-0 shrink-0 items-center gap-3">
          <Link to="/dashboard" className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-[var(--ui-radius-md)] bg-app-accent text-[var(--app-accent-foreground)] shadow-sm sm:h-10 sm:w-10">
              {branding.appIcon ? (
                <img
                  src={branding.appIcon}
                  alt={branding.appName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-lg font-bold">
                  {(branding.appName || 'N')[0]?.toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-app-text-subtle sm:text-sm sm:normal-case sm:tracking-normal sm:text-app-text-heading">
                {branding.appName || 'Nonprofit Manager'}
              </p>
              <p className="truncate text-sm font-semibold text-app-text-heading sm:hidden">
                {currentRouteTitle}
              </p>
              <p className="hidden text-xs text-app-text-muted sm:block">Staff workspace</p>
            </div>
          </Link>
        </div>

        <div className="hidden min-w-0 flex-1 items-center justify-center lg:flex">
          <div className="flex min-w-0 max-w-full items-center gap-1 rounded-full border border-app-border bg-app-surface-elevated px-1.5 py-1 shadow-sm">
            <div
              className="flex min-w-0 items-center gap-1 overflow-hidden"
              role="navigation"
              aria-label="Primary navigation"
            >
              {primaryItems.map((item) => (
                <Link
                  key={item.id}
                  to={item.path}
                  onMouseEnter={item.id === 'contacts' ? prefetchStaffPeoplePath : undefined}
                  onFocus={item.id === 'contacts' ? prefetchStaffPeoplePath : undefined}
                  aria-current={isNavItemActive(item.id, item.path) ? 'page' : undefined}
                  className={classNames(
                    'inline-flex min-w-0 max-w-[9rem] items-center rounded-full border px-3 py-2 text-sm font-semibold transition xl:max-w-[11rem]',
                    isNavItemActive(item.id, item.path)
                      ? 'border-app-accent bg-app-accent text-[var(--app-accent-foreground)] shadow-sm'
                      : 'border-transparent text-app-text hover:border-app-border hover:bg-app-surface-muted hover:text-app-text-heading'
                  )}
                >
                  <span className="truncate">{item.shortLabel ?? item.name}</span>
                </Link>
              ))}
            </div>

            {secondaryItems.length > 0 ? (
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setMoreMenuOpen((open) => !open);
                    setUtilitiesMenuOpen(false);
                    setUserMenuOpen(false);
                    setThemeMenuOpen(false);
                    setAdminMenuOpen(false);
                  }}
                  className={classNames(
                    'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition',
                    hasActiveSecondaryItem
                      ? 'border-app-accent bg-app-accent text-[var(--app-accent-foreground)] shadow-sm'
                      : 'border-transparent text-app-text hover:border-app-border hover:bg-app-surface-muted hover:text-app-text-heading'
                  )}
                  aria-label="More navigation"
                  aria-expanded={moreMenuOpen}
                  aria-haspopup="menu"
                  aria-controls="topnav-more-menu"
                >
                  <span>More</span>
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                <NavPopover
                  open={moreMenuOpen}
                  onClose={() => setMoreMenuOpen(false)}
                  panelClassName="w-72 p-2"
                  panelRef={moreMenuRef}
                >
                  <div id="topnav-more-menu" role="menu" aria-label="More navigation">
                    <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.18em] text-app-text-subtle">
                      More modules
                    </p>
                    <div className="grid gap-1">
                      {secondaryItems.map((item) => (
                        <Link
                          key={item.id}
                          to={item.path}
                          role="menuitem"
                          onMouseEnter={item.id === 'contacts' ? prefetchStaffPeoplePath : undefined}
                          onFocus={item.id === 'contacts' ? prefetchStaffPeoplePath : undefined}
                          onClick={() => setMoreMenuOpen(false)}
                          className={classNames(
                            'flex items-center gap-3 rounded-[var(--ui-radius-sm)] px-3 py-2 text-sm transition',
                            isNavItemActive(item.id, item.path)
                              ? 'bg-app-accent text-[var(--app-accent-foreground)]'
                              : 'text-app-text-heading hover:bg-app-surface-muted'
                          )}
                        >
                          <span aria-hidden="true" className="text-base">
                            {item.icon}
                          </span>
                          <span className="truncate font-medium">{item.name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </NavPopover>
              </div>
            ) : null}
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            ref={searchButtonRef}
            className={desktopActionButtonClass}
            onClick={() => setSearchOpen(true)}
            onMouseEnter={prefetchQuickLookup}
            onFocus={prefetchQuickLookup}
            aria-label="Search"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <span className="hidden xl:inline">Search</span>
          </button>

          <Link
            to={mobileAlertsLink.path}
            aria-label={mobileAlertsLink.label}
            aria-current={
              isNavItemActive(mobileAlertsLink.id, mobileAlertsLink.path) ? 'page' : undefined
            }
            className={classNames(
              desktopActionButtonClass,
              isNavItemActive(mobileAlertsLink.id, mobileAlertsLink.path)
                ? activeDesktopButtonClass
                : ''
            )}
          >
            <span aria-hidden="true">{mobileAlertsLink.icon}</span>
            <span className="hidden xl:inline">{mobileAlertsLink.shortLabel}</span>
          </Link>

          {utilityNavLinks.length > 0 ? (
            <div className="relative hidden lg:block">
              <button
                type="button"
                onClick={() => {
                  setUtilitiesMenuOpen((open) => !open);
                  setMoreMenuOpen(false);
                  setUserMenuOpen(false);
                  setThemeMenuOpen(false);
                  setAdminMenuOpen(false);
                }}
                className={classNames(
                  desktopMenuButtonClass,
                  hasActiveUtilityItem ? activeDesktopButtonClass : ''
                )}
                aria-label="Utilities"
                aria-expanded={utilitiesMenuOpen}
                aria-haspopup="menu"
                aria-controls="topnav-utilities-menu"
              >
                <span aria-hidden="true">🧰</span>
                <span className="hidden xl:inline">Utilities</span>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              <NavPopover
                open={utilitiesMenuOpen}
                onClose={() => setUtilitiesMenuOpen(false)}
                align="right"
                panelClassName="w-72 p-2"
                panelRef={utilitiesMenuRef}
              >
                <div id="topnav-utilities-menu" role="menu" aria-label="Utilities menu">
                  <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.18em] text-app-text-subtle">
                    Workspace utilities
                  </p>
                  <div className="grid gap-1">
                    {utilityNavLinks.map((link) => (
                      <Link
                        key={link.id}
                        to={link.path}
                        role="menuitem"
                        onClick={() => setUtilitiesMenuOpen(false)}
                        className={classNames(
                          'flex items-center gap-3 rounded-[var(--ui-radius-sm)] px-3 py-2 text-sm transition',
                          isNavItemActive(link.id, link.path)
                            ? 'bg-app-accent text-[var(--app-accent-foreground)]'
                            : 'text-app-text-heading hover:bg-app-surface-muted'
                        )}
                      >
                        <span aria-hidden="true" className="text-base">
                          {link.icon}
                        </span>
                        <span className="truncate font-medium">{link.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </NavPopover>
            </div>
          ) : null}

          {canOpenAdminSettings ? (
            <div className="relative hidden lg:block">
              <button
                type="button"
                onClick={() => {
                  setAdminMenuOpen((open) => !open);
                  setMoreMenuOpen(false);
                  setUtilitiesMenuOpen(false);
                  setUserMenuOpen(false);
                  setThemeMenuOpen(false);
                }}
                className={desktopMenuButtonClass}
                aria-label="Admin quick actions"
                aria-expanded={adminMenuOpen}
                aria-haspopup="menu"
                aria-controls="topnav-admin-actions"
              >
                <span className="hidden xl:inline">Admin</span>
                <span className="xl:hidden" aria-hidden="true">
                  ⚙️
                </span>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
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
                    role={user?.role}
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
                setMoreMenuOpen(false);
                setUtilitiesMenuOpen(false);
                setUserMenuOpen(false);
                setAdminMenuOpen(false);
              }}
              onDoubleClick={handleQuickThemeCycle}
              className={desktopMenuButtonClass}
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
                  <p className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                    Theme
                  </p>
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
                    <span className="text-[11px] font-semibold tracking-wide">
                      {themeLabels[availableTheme]}
                    </span>
                    <span className="capitalize">{availableTheme.replace(/-/g, ' ')}</span>
                    {theme === availableTheme ? (
                      <span className="ml-auto text-app-accent">✓</span>
                    ) : null}
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
                setMoreMenuOpen(false);
                setUtilitiesMenuOpen(false);
                setThemeMenuOpen(false);
                setAdminMenuOpen(false);
              }}
              className="inline-flex items-center gap-2 rounded-[var(--ui-radius-sm)] border border-app-border bg-app-surface-elevated px-2.5 py-1.5 text-sm font-semibold text-app-text shadow-sm transition hover:bg-app-surface-muted hover:text-app-text-heading focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2"
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
              <span className="hidden max-w-[140px] truncate xl:block">
                {user?.firstName} {user?.lastName}
              </span>
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
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
                {canOpenAdminSettings ? (
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
                        role={user?.role}
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
            className="inline-flex items-center justify-center rounded-[var(--ui-radius-sm)] border border-app-border bg-app-surface-elevated p-2 text-app-text shadow-sm transition hover:bg-app-surface-muted hover:text-app-text-heading lg:hidden"
            aria-label="Main menu"
            aria-expanded={mobileMenuOpen}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
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

      {mobileMenuOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/45 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          <MobileNavigationDrawer
            adminSettingsPath={adminSettingsPath}
            appName={branding.appName || 'Nonprofit Manager'}
            favoriteItems={favoriteItems}
            isDarkMode={isDarkMode}
            isNavItemActive={isNavItemActive}
            onClose={() => setMobileMenuOpen(false)}
            onLogout={() => {
              setMobileMenuOpen(false);
              handleLogout();
            }}
            onToggleDarkMode={toggleDarkMode}
            primaryItems={mobileNavigationPreferences.primaryItems}
            secondaryItems={mobileNavigationPreferences.secondaryItems}
            user={user}
            utilityNavLinks={mobileDrawerUtilityLinks}
          />
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
