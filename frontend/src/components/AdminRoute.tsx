/**
 * AdminRoute Component
 * Wraps routes that should only be accessible to admin users
 * Redirects non-admin users to the dashboard with an error message.
 *
 * Legacy redirect routes stay reachable for authenticated users so the
 * route catalog can hand off to the canonical admin path before the
 * admin-only guard runs there.
 * Layout is provided by the authenticated shell route.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { Suspense } from 'react';
import { adminRouteManifest } from '../features/adminOps/adminRouteManifest';
import { canAccessAdminSettings } from '../features/auth/state/adminAccess';
import { useAppSelector } from '../store/hooks';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRouteFallback = () => (
  <div className="p-6 text-sm text-app-text-muted">Loading admin page...</div>
);

export default function AdminRoute({ children }: AdminRouteProps) {
  const { isAuthenticated, user, authLoading } = useAppSelector((state) => state.auth);
  const location = useLocation();
  const routeEntry = adminRouteManifest.find(
    (entry) => entry.kind === 'redirect' && entry.path === location.pathname
  );

  if (authLoading || (isAuthenticated && !user)) {
    return <AdminRouteFallback />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (routeEntry?.kind === 'redirect') {
    return <Suspense fallback={<AdminRouteFallback />}>{children}</Suspense>;
  }

  if (!canAccessAdminSettings(user)) {
    // Non-admin users are redirected to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Suspense fallback={<AdminRouteFallback />}>{children}</Suspense>
  );
}
