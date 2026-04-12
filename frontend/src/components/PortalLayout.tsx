import type { MouseEvent } from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { portalLogoutAsync } from '../features/portalAuth/state';
import { AppShell, TopNav, SecondaryButton } from './ui';
<<<<<<< HEAD
import SkipLink from './SkipLink';
=======
>>>>>>> origin/main
import SurfaceContextBar from './workspace/SurfaceContextBar';

interface PortalLayoutProps {
  children: React.ReactNode;
}

export default function PortalLayout({ children }: PortalLayoutProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const portalUser = useAppSelector((state) => state.portalAuth.user);
  const [signingOut, setSigningOut] = useState(false);

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
            onClick={async () => {
              setSigningOut(true);
              try {
                await dispatch(portalLogoutAsync());
                navigate('/portal/login', { replace: true });
              } finally {
                setSigningOut(false);
              }
            }}
            className="w-full rounded-b-[var(--ui-radius-sm)] border-t border-app-border px-4 py-2 text-left text-sm font-medium text-app-accent hover:bg-app-surface-muted"
          >
            {signingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      </details>
<<<<<<< HEAD
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
              onClick={async () => {
                setSigningOut(true);
                try {
                  await dispatch(portalLogoutAsync());
                  navigate('/portal/login', { replace: true });
                } finally {
                  setSigningOut(false);
                }
              }}
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
        {children}
      </AppShell>
=======
>>>>>>> origin/main
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
              onClick={async () => {
                setSigningOut(true);
                try {
                  await dispatch(portalLogoutAsync());
                  navigate('/portal/login', { replace: true });
                } finally {
                  setSigningOut(false);
                }
              }}
            >
              {signingOut ? 'Signing out...' : 'Sign out'}
            </SecondaryButton>
          </div>
        </>
      }
    />
  );

  return (
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
      {children}
    </AppShell>
  );
}
