import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import Layout from '../Layout';
import PageLoader from '../PageLoader';
import { preloadAuthenticatedShellBootstrap } from '../../services/bootstrap/authenticatedShellBootstrap';

const AuthenticatedShellRoute = () => {
  const { isAuthenticated, authLoading } = useAppSelector((state) => state.auth);
  const [bootstrapReady, setBootstrapReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setBootstrapReady(false);
      return;
    }

    let isMounted = true;
    setBootstrapReady(false);
    void preloadAuthenticatedShellBootstrap().finally(() => {
      if (isMounted) {
        setBootstrapReady(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  if (authLoading || (isAuthenticated && !bootstrapReady)) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

export default AuthenticatedShellRoute;
