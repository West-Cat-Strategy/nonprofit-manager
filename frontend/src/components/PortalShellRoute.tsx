import { Suspense, useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { portalFetchMe } from '../features/portalAuth/state';
import PortalLayout from './PortalLayout';

const PortalRouteFallback = () => (
  <div className="p-4 text-sm text-app-text-muted">Loading portal page...</div>
);

export default function PortalShellRoute() {
  const dispatch = useAppDispatch();
  const { user, loading } = useAppSelector((state) => state.portalAuth);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (user) {
      setAuthChecked(true);
      return;
    }

    let isMounted = true;
    setAuthChecked(false);
    const verifyPortalSession = async () => {
      try {
        await dispatch(portalFetchMe()).unwrap();
      } catch {
        // Unauthenticated portal sessions are redirected below.
      } finally {
        if (isMounted) {
          setAuthChecked(true);
        }
      }
    };

    void verifyPortalSession();

    return () => {
      isMounted = false;
    };
  }, [user, dispatch]);

  if (!authChecked || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-surface-muted">
        <div className="text-sm text-app-text-muted">Loading portal...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/portal/login" replace />;
  }

  return (
    <PortalLayout>
      <Suspense fallback={<PortalRouteFallback />}>
        <Outlet />
      </Suspense>
    </PortalLayout>
  );
}
