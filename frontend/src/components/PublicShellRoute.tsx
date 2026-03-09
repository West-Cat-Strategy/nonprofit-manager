import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSetupCheck } from '../hooks/useSetupCheck';

const isSetupGateRoute = (pathname: string): boolean =>
  pathname === '/setup' ||
  pathname === '/login' ||
  pathname === '/register' ||
  pathname === '/forgot-password' ||
  pathname.startsWith('/accept-invitation/') ||
  pathname.startsWith('/reset-password/');

const shouldEnableSetupCheck = (pathname: string): boolean => isSetupGateRoute(pathname);

export default function PublicShellRoute() {
  const location = useLocation();
  const setupCheckEnabled = shouldEnableSetupCheck(location.pathname);
  const { setupRequired, loading } = useSetupCheck({ enabled: setupCheckEnabled });

  const setupStatusResolved = setupCheckEnabled && setupRequired !== null;

  if (setupStatusResolved && setupRequired === true && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />;
  }

  if (setupStatusResolved && setupRequired === false && location.pathname === '/setup') {
    return <Navigate to="/login" replace />;
  }

  if (setupCheckEnabled && loading) {
    return <Outlet />;
  }

  return <Outlet />;
}
