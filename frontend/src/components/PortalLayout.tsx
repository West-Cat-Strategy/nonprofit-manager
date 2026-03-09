import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { portalLogoutAsync } from '../features/portalAuth/state';
import { AppShell, TopNav, SecondaryButton } from './ui';
import SurfaceContextBar from './workspace/SurfaceContextBar';

interface PortalLayoutProps {
  children: React.ReactNode;
}

export default function PortalLayout({ children }: PortalLayoutProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const portalUser = useAppSelector((state) => state.portalAuth.user);
  const [signingOut, setSigningOut] = useState(false);

  const topNav = (
    <TopNav
      left={
        <div>
          <Link to="/portal" className="text-base font-semibold text-app-text-heading">
            Client Portal
          </Link>
          {portalUser?.email ? <p className="text-xs text-app-text-muted">{portalUser.email}</p> : null}
        </div>
      }
      right={
        <>
          <Link
            to="/portal/profile"
            className="hidden sm:inline-flex items-center rounded-[var(--ui-radius-sm)] border border-app-border bg-app-surface px-4 py-2 text-sm font-semibold text-app-text transition hover:bg-app-hover"
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
        </>
      }
    />
  );

  return (
    <AppShell
      topNav={topNav}
      header={<SurfaceContextBar secondaryAction={{ label: 'Account Settings', to: '/portal/profile' }} />}
      contentClassName="space-y-6 rounded-[var(--ui-radius-md)] bg-app-surface p-4 shadow-sm sm:p-6"
    >
      {children}
    </AppShell>
  );
}
