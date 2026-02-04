/**
 * Admin Routes
 * Handles settings and admin-only pages
 */

import { lazy } from 'react';
import type { ReactNode } from 'react';
import { Route } from 'react-router-dom';

// Lazy load admin pages
const AdminSettings = lazy(() => import('../pages/admin/AdminSettings'));
const UserSettings = lazy(() => import('../pages/admin/UserSettings'));
const ApiSettings = lazy(() => import('../pages/admin/ApiSettings'));
const AlertsConfig = lazy(() => import('../pages/admin/AlertsConfig'));
const NavigationSettings = lazy(() => import('../pages/admin/NavigationSettings'));
const DataBackup = lazy(() => import('../pages/admin/DataBackup'));
const EmailMarketing = lazy(() => import('../pages/admin/EmailMarketing'));

interface RouteWrapperProps {
  children: ReactNode;
}

interface AdminRouteProps {
  ProtectedRoute: React.ComponentType<RouteWrapperProps>;
  AdminRoute: React.ComponentType<RouteWrapperProps>;
  NeoBrutalistRoute: React.ComponentType<RouteWrapperProps>;
}

export function createAdminRoutes({ ProtectedRoute, AdminRoute, NeoBrutalistRoute }: AdminRouteProps) {
  return (
    <>
      <Route
        path="/settings/email-marketing"
        element={<ProtectedRoute><EmailMarketing /></ProtectedRoute>}
      />
      <Route
        path="/settings/api"
        element={<ProtectedRoute><ApiSettings /></ProtectedRoute>}
      />
      <Route
        path="/settings/navigation"
        element={<ProtectedRoute><NavigationSettings /></ProtectedRoute>}
      />
      <Route
        path="/settings/user"
        element={<NeoBrutalistRoute><UserSettings /></NeoBrutalistRoute>}
      />
      <Route
        path="/settings/admin"
        element={<AdminRoute><AdminSettings /></AdminRoute>}
      />
      <Route
        path="/settings/backup"
        element={<AdminRoute><DataBackup /></AdminRoute>}
      />
    </>
  );
}

// Re-export lazy components for backwards compatibility
export {
  AdminSettings,
  UserSettings,
  ApiSettings,
  AlertsConfig,
  NavigationSettings,
  DataBackup,
  EmailMarketing,
};
