/**
 * Admin Routes
 * Handles settings and admin-only pages
 */

import type { ReactNode } from 'react';
import { Navigate, Route } from 'react-router-dom';
import {
  AdminSettings,
  UserSettings,
  ApiSettings,
  NavigationSettings,
  DataBackup,
  EmailMarketing,
  PortalAdminPage,
} from './adminRouteComponents';

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
        path="/settings/admin/portal"
        element={<AdminRoute><Navigate to="/settings/admin/portal/access" replace /></AdminRoute>}
      />
      <Route
        path="/settings/admin/portal/access"
        element={<AdminRoute><PortalAdminPage panel="access" /></AdminRoute>}
      />
      <Route
        path="/settings/admin/portal/users"
        element={<AdminRoute><PortalAdminPage panel="users" /></AdminRoute>}
      />
      <Route
        path="/settings/admin/portal/conversations"
        element={<AdminRoute><PortalAdminPage panel="conversations" /></AdminRoute>}
      />
      <Route
        path="/settings/admin/portal/appointments"
        element={<AdminRoute><PortalAdminPage panel="appointments" /></AdminRoute>}
      />
      <Route
        path="/settings/admin/portal/slots"
        element={<AdminRoute><PortalAdminPage panel="slots" /></AdminRoute>}
      />
      <Route
        path="/settings/backup"
        element={<AdminRoute><DataBackup /></AdminRoute>}
      />
      <Route path="/email-marketing" element={<Navigate to="/settings/email-marketing" replace />} />
      <Route path="/admin/audit-logs" element={<Navigate to="/settings/admin?section=audit_logs" replace />} />
      <Route path="/settings/organization" element={<Navigate to="/settings/admin?section=organization" replace />} />
    </>
  );
}
