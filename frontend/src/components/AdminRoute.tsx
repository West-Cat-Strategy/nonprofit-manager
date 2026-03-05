/**
 * AdminRoute Component
 * Wraps routes that should only be accessible to admin users
 * Redirects non-admin users to the dashboard with an error message
 * Layout is provided by the authenticated shell route.
 */

import { Navigate } from 'react-router-dom';
import { Suspense } from 'react';
import { useAppSelector } from '../store/hooks';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRouteFallback = () => (
  <div className="p-6 text-sm text-app-text-muted">Loading admin page...</div>
);

export default function AdminRoute({ children }: AdminRouteProps) {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin') {
    // Non-admin users are redirected to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Suspense fallback={<AdminRouteFallback />}>{children}</Suspense>
  );
}
