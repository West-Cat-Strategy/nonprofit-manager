/**
 * Admin Routes
 * Handles settings and admin-only pages
 */

import type { ReactNode } from 'react';
import { Route } from 'react-router-dom';
import { AdminSettings, UserSettings, ApiSettings, NavigationSettings, DataBackup, EmailMarketing } from './adminRouteComponents';

// Lazy load admin pages

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
