/**
 * AdminRoute Component
 * Wraps routes that should only be accessible to admin users
 * Redirects non-admin users to the dashboard with an error message
 */

import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import Layout from './Layout';

interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin') {
    // Non-admin users are redirected to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout>{children}</Layout>;
}
