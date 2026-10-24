import type { MouseEvent } from 'react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  EllipsisHorizontalIcon,
  HomeIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { portalLogoutAsync } from '../features/portalAuth/state';
import { AppShell, TopNav, SecondaryButton } from './ui';
import SkipLink from './SkipLink';
import SurfaceContextBar from './workspace/SurfaceContextBar';
import { getRouteMeta } from '../routes/routeMeta';

interface PortalLayoutProps {
  children: React.ReactNode;
}

export default function PortalLayout({ children }: PortalLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const portalUser = useAppSelector((state) => state.portalAuth.user);
  const [signingOut, setSigningOut] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const routeMeta = getRouteMeta(`${location.pathname}${location.search}`);
  const localNavigation =
    routeMeta.surface === 'portal' ? routeMeta.localNavigation : [];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMoreOpen(false);
      }
    };
    if (isMoreOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMoreOpen]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await dispatch(portalLogoutAsync());
      navigate('/portal/login', { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  const primaryTabs = [
    { href: '/portal', label: 'Dashboard', icon: HomeIcon },
    { href: '/portal/appointments', label: 'Appointments', icon: CalendarIcon },
    { href: '/portal/messages', label: 'Messages', icon: ChatBubbleLeftRightIcon },
    { href: '/portal/documents', label: 'Documents', icon: DocumentTextIcon },
  ];

  const isTabActive = (href: string) => {
    if (href === '/portal') {
      return location.pathname === '/portal';
    }
    return location.pathname.startsWith(href);
  };

  const highFreqHrefs = new Set(primaryTabs.map((t) => t.href));
  const secondaryNavItems = localNavigation.filter((item) => !highFreqHrefs.has(item.href));
  const hasProfile = secondaryNavItems.some((item) => item.href === '/portal/profile');

  const portalAccountMenu = (
    <div className="relative sm:hidden">
      <details className="relative">
        <summary className="flex items-center justify-between gap-2 rounded-full border border-app-border bg-app-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-app-text-heading">
          Account
        </summary>
        <div className="absolute right-0 z-10 mt-2 w-40 rounded-[var(--ui-radius-sm)] border border-app-border bg-app-surface shadow-lg">
          <Link
            to="/portal/profile"
            className="block px-4 py-2 text-sm font-medium text-app-text-heading hover:bg-app-surface-muted"
            onClick={(event: MouseEvent<HTMLAnchorElement>) => event.currentTarget.closest('details')?.removeAttribute('open')}
          >
            Profile
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full rounded-b-[var(--ui-radius-sm)] border-t border-app-border px-4 py-2 text-left text-sm font-medium text-app-accent hover:bg-app-surface-muted"
          >
            {signingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      </details>
    </div>
  );

  const topNav = (
    <TopNav
      left={
        <div className="min-w-0">
          <Link
            to="/portal"
            className="text-base font-semibold text-app-text-heading"
          >
            Client Portal
          </Link>
          {portalUser?.email ? (
            <p className="mt-1 max-w-[12rem] truncate text-xs text-app-text-muted sm:max-w-[16rem]">
              {portalUser.email}
            </p>
          ) : null}
        </div>
      }
      right={
        <>
          {portalAccountMenu}
          <div className="flex items-center gap-2">
            <Link
              to="/portal/profile"
              className="hidden sm:inline-flex items-center rounded-[var(--ui-radius-sm)] border border-app-border bg-app-surface-elevated px-4 py-2 text-sm font-semibold text-app-text-heading shadow-sm transition hover:bg-app-surface-muted"
            >
              Account
            </Link>
            <SecondaryButton
              disabled={signingOut}
              onClick={handleSignOut}
            >
              {signingOut ? 'Signing out...' : 'Sign out'}
            </SecondaryButton>
          </div>
        </>
      }
    />
  );

  return (
    <div className="min-h-screen bg-app-bg text-app-text pb-20 md:pb-0">
      <SkipLink />
      <AppShell
        topNav={topNav}
        header={
          <SurfaceContextBar
            showLocalNavigation={false}
            secondaryAction={{ label: 'Account Settings', to: '/portal/profile' }}
          />
        }
        contentClassName="space-y-6 rounded-[var(--ui-radius-md)] bg-app-surface p-4 shadow-sm sm:p-6"
      >
        {localNavigation.length > 0 ? (
          <section className="space-y-4">
            <details
              data-testid="portal-local-navigation-mobile"
              className="rounded-[var(--ui-radius-md)] border border-app-border-muted bg-app-surface-elevated p-4 shadow-sm md:hidden"
            >
              <summary
                data-testid="portal-local-navigation-mobile-summary"
                className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-app-text-heading"
              >
                <span>Browse portal</span>
                <span aria-hidden="true" className="text-app-text-muted">
                  +
                </span>
              </summary>
              <nav aria-label="Portal navigation" className="mt-3 flex flex-col gap-2">
                {localNavigation.map((item) => (
                  <Link
                    key={item.id}
                    to={item.href}
                    aria-current={item.isActive ? 'page' : undefined}
                    onClick={(event: MouseEvent<HTMLAnchorElement>) =>
                      event.currentTarget.closest('details')?.removeAttribute('open')
                    }
                    className={`inline-flex items-center gap-2 rounded-[var(--ui-radius-sm)] border px-3 py-2 text-sm font-medium transition ${
                      item.isActive
                        ? 'app-accent-contrast-ink border border-app-accent bg-app-accent shadow-sm'
                        : 'border-app-border bg-app-surface text-app-text hover:bg-app-surface-muted hover:text-app-text-heading'
                    }`}
                  >
                    {item.icon ? <span aria-hidden="true">{item.icon}</span> : null}
                    <span>{item.shortLabel}</span>
                  </Link>
                ))}
              </nav>
            </details>
            <section
              aria-label="Browse portal"
              data-testid="portal-local-navigation-desktop"
              className="hidden rounded-[var(--ui-radius-md)] border border-app-border-muted bg-app-surface-elevated p-4 shadow-sm md:block"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-text-subtle">
                Browse portal
              </p>
              <nav aria-label="Browse portal" className="mt-3 flex flex-wrap gap-2">
                {localNavigation.map((item) => (
                  <Link
                    key={item.id}
                    to={item.href}
                    aria-current={item.isActive ? 'page' : undefined}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition ${
                      item.isActive
                        ? 'app-accent-contrast-ink border border-app-accent bg-app-accent shadow-sm'
                        : 'border-app-border bg-app-surface text-app-text hover:bg-app-surface-muted hover:text-app-text-heading'
                    }`}
                  >
                    {item.icon ? <span aria-hidden="true">{item.icon}</span> : null}
                    <span>{item.shortLabel}</span>
                  </Link>
                ))}
              </nav>
            </section>
          </section>
        ) : null}
        {children}
      </AppShell>

      {/* Persistent Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile portal navigation"
        data-testid="portal-mobile-bottom-nav"
        className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-app-border bg-app-surface shadow-lg md:hidden"
      >
        {primaryTabs.map((tab) => {
          const Icon = tab.icon;
          const active = isTabActive(tab.href);
          return (
            <Link
              key={tab.href}
              to={tab.href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center justify-center py-1 px-2 text-xs font-semibold transition ${
                active
                  ? 'text-app-accent font-bold'
                  : 'text-app-text-muted hover:text-app-text-heading'
              }`}
            >
              <Icon className="h-5 w-5 mb-0.5" aria-hidden="true" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          aria-expanded={isMoreOpen}
          aria-controls="portal-more-drawer"
          onClick={() => setIsMoreOpen(!isMoreOpen)}
          className={`flex flex-col items-center justify-center py-1 px-2 text-xs font-semibold transition ${
            isMoreOpen || (!primaryTabs.some((t) => isTabActive(t.href)) && location.pathname.startsWith('/portal'))
              ? 'text-app-accent font-bold'
              : 'text-app-text-muted hover:text-app-text-heading'
          }`}
        >
          <EllipsisHorizontalIcon className="h-5 w-5 mb-0.5" aria-hidden="true" />
          <span>More</span>
        </button>
      </nav>

      {/* Overflow Drawer for Secondary Routes */}
      {isMoreOpen && (
        <div
          id="portal-more-drawer"
          data-testid="portal-mobile-more-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="More navigation options"
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 md:hidden"
          onClick={() => setIsMoreOpen(false)}
        >
          <div
            className="rounded-t-2xl border-t border-app-border bg-app-surface p-6 shadow-xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-app-border mb-4">
              <h2 className="text-base font-bold text-app-text-heading">More Options</h2>
              <button
                type="button"
                aria-label="Close more options"
                onClick={() => setIsMoreOpen(false)}
                className="rounded p-1 text-app-text-muted hover:bg-app-surface-muted hover:text-app-text-heading"
              >
                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {!hasProfile && (
                <Link
                  to="/portal/profile"
                  onClick={() => setIsMoreOpen(false)}
                  className="rounded-lg border border-app-border p-3 text-sm font-medium text-app-text hover:bg-app-surface-muted"
                >
                  Profile
                </Link>
              )}
              {secondaryNavItems.map((item) => (
                <Link
                  key={item.id}
                  to={item.href}
                  onClick={() => setIsMoreOpen(false)}
                  className={`rounded-lg border p-3 text-sm font-medium transition ${
                    item.isActive
                      ? 'border-app-accent bg-app-accent text-white'
                      : 'border-app-border text-app-text hover:bg-app-surface-muted'
                  }`}
                >
                  {item.shortLabel || item.label}
                </Link>
              ))}
            </div>
            <button
              type="button"
              disabled={signingOut}
              onClick={() => {
                setIsMoreOpen(false);
                handleSignOut();
              }}
              className="w-full rounded-lg border border-app-border bg-app-surface-elevated py-3 text-sm font-semibold text-app-accent hover:bg-app-surface-muted"
            >
              {signingOut ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

