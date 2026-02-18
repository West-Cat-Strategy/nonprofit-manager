import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { portalFetchMe } from '../store/slices/portalAuthSlice';
import PortalLayout from './PortalLayout';

interface PortalProtectedRouteProps {
  children: React.ReactNode;
}

export default function PortalProtectedRoute({ children }: PortalProtectedRouteProps) {
  const dispatch = useAppDispatch();
  const { user, loading } = useAppSelector((state) => state.portalAuth);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const verifyPortalSession = async () => {
      if (!user) {
        try {
          await dispatch(portalFetchMe()).unwrap();
        } catch {
          // unauthenticated portal sessions are redirected below
        }
      }
      if (isMounted) {
        setAuthChecked(true);
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

  return <PortalLayout>{children}</PortalLayout>;
}
