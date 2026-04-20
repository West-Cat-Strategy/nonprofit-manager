import type { MouseEvent } from 'react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  const routeMeta = getRouteMeta(`${location.pathname}${location.search}`);
  const localNavigation =
    routeMeta.surface === 'portal' ? routeMeta.localNavigation : [];
  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await dispatch(portalLogoutAsync());
      navigate('/portal/login', { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

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
    <div className="min-h-screen bg-app-bg text-app-text">
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
    </div>
  );
}
