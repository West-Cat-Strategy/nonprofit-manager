import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar from './Avatar';
import NavPopover from './navigation/NavPopover';
import MobileNavigationDrawer from './navigation/MobileNavigationDrawer';
import ThemePreviewSwatch from './theme/ThemePreviewSwatch';
import useStaffNavigationViewModel from '../features/navigation/hooks/useStaffNavigationViewModel';
import { classNames } from './ui/classNames';
import { THEME_REGISTRY } from '../theme/themeRegistry';

const StaffNavigationQuickLookupDialog = lazy(
  () => import('../features/navigation/components/StaffNavigationQuickLookupDialog')
);

export default function Navigation() {
  const {
    adminQuickActions,
    adminSettingsPath,
    branding,
    canOpenAdminSettings,
    currentLocation,
    currentRouteTitle,
    handleLogout,
    isNavItemActive,
    mobileAlertsLink,
    mobileDrawerUtilityLinks,
    mobileNavigationPreferences,
    navigationPreferences: { favoriteItems },
    prefetchQuickLookupDialog,
    themeState: { availableThemes, isDarkMode, setTheme, theme, toggleDarkMode },
    user,
  } = useStaffNavigationViewModel();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const userMenuButtonRef = useRef<HTMLButtonElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const previousSearchOpenRef = useRef(searchOpen);
  const previousUserMenuOpenRef = useRef(userMenuOpen);
  const previousMobileMenuOpenRef = useRef(mobileMenuOpen);
  const bodyOverflowRef = useRef<string | null>(null);

  const closeAllMenus = useCallback(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
    setSearchOpen(false);
  }, []);

  const cappedNavPopoverPanelClass = 'max-h-[min(28rem,calc(100vh-6rem))] overflow-y-auto';
  const topActionButtonClass =
    'inline-flex h-10 items-center justify-center gap-2 rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface px-3 text-sm font-semibold text-app-text shadow-sm transition hover:border-app-border hover:bg-app-surface-muted hover:text-app-text-heading focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2 focus:ring-offset-[var(--app-bg)]';
  const activeTopButtonClass =
    'border-app-accent bg-app-accent-soft text-app-accent-text hover:bg-app-accent-soft';

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeAllMenus();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [closeAllMenus]);

  useEffect(() => {
    closeAllMenus();
  }, [closeAllMenus, currentLocation]);

  useEffect(() => {
    const shouldLockBody = mobileMenuOpen || searchOpen;

    if (shouldLockBody) {
      if (bodyOverflowRef.current === null) {
        bodyOverflowRef.current = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
      }

      return () => {
        if (bodyOverflowRef.current !== null) {
          document.body.style.overflow = bodyOverflowRef.current;
          bodyOverflowRef.current = null;
        }
      };
    }

    if (bodyOverflowRef.current !== null) {
      document.body.style.overflow = bodyOverflowRef.current;
      bodyOverflowRef.current = null;
    }

    return undefined;
  }, [mobileMenuOpen, searchOpen]);

  useEffect(() => {
    if (previousUserMenuOpenRef.current && !userMenuOpen) {
      userMenuButtonRef.current?.focus();
    }
    previousUserMenuOpenRef.current = userMenuOpen;
  }, [userMenuOpen]);

  useEffect(() => {
    if (previousSearchOpenRef.current && !searchOpen) {
      searchButtonRef.current?.focus();
    }
    previousSearchOpenRef.current = searchOpen;
  }, [searchOpen]);

  useEffect(() => {
    if (previousMobileMenuOpenRef.current && !mobileMenuOpen) {
      mobileMenuButtonRef.current?.focus();
    }
    previousMobileMenuOpenRef.current = mobileMenuOpen;
  }, [mobileMenuOpen]);

  const openSearch = () => {
    closeAllMenus();
    setSearchOpen(true);
  };

  return (
    <nav
      aria-label="Global navigation"
      data-shell-transition
      className="app-shell-surface-opaque sticky top-0 z-50 border-b border-app-border-muted shadow-[0_1px_8px_rgba(15,23,42,0.04)]"
    >
      <div className="mx-auto flex h-14 max-w-[1920px] items-center gap-3 px-3 sm:h-16 sm:px-4 lg:px-6">
        <div className="flex min-w-0 shrink-0 items-center gap-3">
          <Link to="/dashboard" className="flex min-w-0 items-center gap-3">
            <div
              className={classNames(
                'flex h-9 w-9 items-center justify-center overflow-hidden rounded-[var(--ui-radius-sm)] sm:h-10 sm:w-10',
                branding.appIcon
                  ? 'bg-transparent shadow-none'
                  : 'app-accent-contrast-ink bg-app-accent shadow-sm'
              )}
            >
              {branding.appIcon ? (
                <img
                  src={branding.appIcon}
                  alt={branding.appName}
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-lg font-bold">
                  {(branding.appName || 'N')[0]?.toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-app-text-heading">
                {branding.appName || 'Nonprofit Manager'}
              </p>
              <p className="truncate text-xs text-app-text-muted">
                <span className="sm:hidden">{currentRouteTitle}</span>
                <span className="hidden sm:inline">Staff workspace</span>
              </p>
            </div>
          </Link>
        </div>

        <button
          type="button"
          ref={searchButtonRef}
          onClick={openSearch}
          onMouseEnter={prefetchQuickLookupDialog}
          onFocus={prefetchQuickLookupDialog}
          className="hidden min-w-0 flex-1 items-center gap-3 rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface px-3 py-2 text-left text-sm text-app-text-muted shadow-sm transition hover:border-app-border hover:bg-app-surface-muted focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2 focus:ring-offset-[var(--app-bg)] md:flex lg:max-w-2xl"
          aria-label="Search people, cases, notes, donations, and routes"
          aria-haspopup="dialog"
          aria-expanded={searchOpen}
          aria-controls="navigation-quick-lookup-dialog"
        >
          <svg
            className="h-4 w-4 shrink-0"
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
          <span className="min-w-0 flex-1 truncate">
            Search people, cases, notes, donations, and routes
          </span>
          <span className="hidden rounded border border-app-border-muted bg-app-surface-elevated px-1.5 py-0.5 text-[11px] font-semibold text-app-text-subtle lg:inline">
            ⌘ K
          </span>
        </button>

        <div className="relative z-20 ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            className={classNames(topActionButtonClass, 'md:hidden')}
            onClick={openSearch}
            onMouseEnter={prefetchQuickLookupDialog}
            onFocus={prefetchQuickLookupDialog}
            aria-label="Search"
            aria-haspopup="dialog"
            aria-expanded={searchOpen}
            aria-controls="navigation-quick-lookup-dialog"
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
          </button>

          <Link
            to={mobileAlertsLink.path}
            aria-label={mobileAlertsLink.label}
            aria-current={
              isNavItemActive(mobileAlertsLink.id, mobileAlertsLink.path) ? 'page' : undefined
            }
            className={classNames(
              topActionButtonClass,
              isNavItemActive(mobileAlertsLink.id, mobileAlertsLink.path) ? activeTopButtonClass : ''
            )}
          >
            <span aria-hidden="true">{mobileAlertsLink.icon}</span>
            <span className="hidden lg:inline">{mobileAlertsLink.shortLabel}</span>
          </Link>

          <div className="relative hidden lg:block">
            <button
              type="button"
              ref={userMenuButtonRef}
              onClick={() => {
                setMobileMenuOpen(false);
                setSearchOpen(false);
                setUserMenuOpen((open) => !open);
              }}
              className="relative z-20 inline-flex h-10 items-center gap-2 rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface px-2.5 text-sm font-semibold text-app-text shadow-sm transition hover:border-app-border hover:bg-app-surface-muted hover:text-app-text-heading focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2"
              aria-label="User menu"
              aria-expanded={userMenuOpen}
              aria-controls="topnav-user-menu"
            >
              <Avatar
                src={user?.profilePicture}
                firstName={user?.firstName}
                lastName={user?.lastName}
                size="sm"
              />
              <span className="hidden max-w-[140px] truncate lg:block">
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
              panelClassName={`${cappedNavPopoverPanelClass} w-80 py-2`}
              panelRef={userMenuRef}
            >
              <div id="topnav-user-menu" aria-label="User menu links">
                <div className="border-b border-app-border-muted px-4 py-3">
                  <p className="truncate text-sm font-medium text-app-text">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="truncate text-xs text-app-text-muted">{user?.email}</p>
                  <p className="mt-1 text-xs capitalize text-app-text-subtle">{user?.role}</p>
                </div>
                <Link
                  to="/dashboard"
                  className="block px-4 py-2 text-sm text-app-text transition hover:bg-app-hover"
                  onClick={() => setUserMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  to="/settings/user"
                  className="block px-4 py-2 text-sm text-app-text transition hover:bg-app-hover"
                  onClick={() => setUserMenuOpen(false)}
                >
                  User Settings
                </Link>
                {canOpenAdminSettings ? (
                  <div className="border-t border-app-border-muted px-3 py-3">
                    <Link
                      to={adminSettingsPath}
                      className="block rounded px-1 py-1.5 text-sm text-app-text transition hover:bg-app-hover"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Admin Settings
                    </Link>
                    <div className="mt-2 border-t border-app-border-muted pt-2">
                      {adminQuickActions.slice(0, 4).map((action) => (
                        <Link
                          key={action.id}
                          to={action.to}
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-app-text hover:bg-app-hover"
                        >
                          <span aria-hidden="true">{action.icon}</span>
                          <div>
                            <p className="font-medium text-app-text">{action.label}</p>
                            <p className="text-xs text-app-text-muted">{action.description}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="border-t border-app-border-muted px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-text-subtle">
                    Theme
                  </p>
                  <div className="mt-3 grid gap-1.5">
                    {availableThemes.map((availableTheme) => {
                      const option = THEME_REGISTRY[availableTheme];
                      const isSelected = theme === availableTheme;

                      return (
                        <button
                          key={availableTheme}
                          type="button"
                          onClick={() => {
                            setTheme(availableTheme);
                            setUserMenuOpen(false);
                          }}
                          data-theme-menu-item={availableTheme}
                          className={`flex w-full items-center gap-3 rounded-[var(--ui-radius-sm)] border px-3 py-2 text-left transition ${
                            isSelected
                              ? 'border-app-accent bg-app-accent-soft text-app-accent-text shadow-sm'
                              : 'border-transparent text-app-text hover:border-app-border-muted hover:bg-app-hover'
                          }`}
                        >
                          <ThemePreviewSwatch
                            themeId={availableTheme}
                            size="menu"
                            className="shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-app-text-subtle">
                                {option.shortLabel}
                              </span>
                              <span className="truncate text-sm font-semibold text-app-text-heading">
                                {option.label}
                              </span>
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-app-text-muted">
                              {option.menuDescription}
                            </p>
                          </div>
                          {isSelected ? <span className="ml-auto text-app-accent">✓</span> : null}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 border-t border-app-border-muted pt-2">
                    <button
                      type="button"
                      onClick={toggleDarkMode}
                      className="flex w-full items-center gap-2 rounded px-1 py-1.5 text-left text-sm text-app-text transition hover:bg-app-hover"
                    >
                      <span>{isDarkMode ? '☀️' : '🌙'}</span>
                      <span>{isDarkMode ? 'Switch to Light' : 'Switch to Dark'}</span>
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    handleLogout();
                  }}
                  className="block w-full px-4 py-2 text-left text-sm text-app-accent transition hover:bg-app-accent-soft"
                >
                  Logout
                </button>
              </div>
            </NavPopover>
          </div>

          <button
            type="button"
            ref={mobileMenuButtonRef}
            onClick={() => {
              setSearchOpen(false);
              setUserMenuOpen(false);
              setMobileMenuOpen((open) => !open);
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface text-app-text shadow-sm transition hover:border-app-border hover:bg-app-surface-muted hover:text-app-text-heading focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2 lg:hidden"
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
            className="app-popup-backdrop fixed inset-0 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          <MobileNavigationDrawer
            adminSettingsPath={adminSettingsPath}
            appName={branding.appName || 'Nonprofit Manager'}
            canOpenAdminSettings={canOpenAdminSettings}
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
            triggerRef={mobileMenuButtonRef}
            user={user}
            utilityNavLinks={mobileDrawerUtilityLinks}
          />
        </>
      ) : null}

      {searchOpen ? (
        <Suspense fallback={null}>
          <StaffNavigationQuickLookupDialog onClose={() => setSearchOpen(false)} />
        </Suspense>
      ) : null}
    </nav>
  );
}
