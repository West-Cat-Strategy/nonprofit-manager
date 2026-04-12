/**
 * Admin Routes
 * Handles settings and admin-only pages
 */

import type { ReactNode } from 'react';
import { Navigate, Route } from 'react-router-dom';
import {
  AdminSettingsSectionRoute,
<<<<<<< HEAD
  CommunicationsPage,
  ApiSettings,
  DataBackup,
=======
  ApiSettings,
  DataBackup,
  EmailMarketing,
>>>>>>> origin/main
  NavigationSettings,
  PortalAdminPage,
  SocialMedia,
  UserSettings,
} from '../features/adminOps/routeComponents';
import {
  getAdminSettingsPath,
  getPortalAdminPath,
} from '../features/adminOps/adminRoutePaths';

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
<<<<<<< HEAD
        path="/settings/communications"
        element={<ProtectedRoute><CommunicationsPage /></ProtectedRoute>}
=======
        path="/settings/email-marketing"
        element={<ProtectedRoute><EmailMarketing /></ProtectedRoute>}
>>>>>>> origin/main
      />
      <Route
        path="/settings/social-media"
        element={<AdminRoute><SocialMedia /></AdminRoute>}
      />
      <Route
        path="/email-marketing"
<<<<<<< HEAD
        element={<ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute>}
      />
      <Route
        path="/settings/email-marketing"
        element={<ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute>}
=======
        element={<ProtectedRoute><Navigate to="/settings/email-marketing" replace /></ProtectedRoute>}
>>>>>>> origin/main
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
        element={<AdminRoute><Navigate to={getAdminSettingsPath('dashboard')} replace /></AdminRoute>}
      />
      <Route
<<<<<<< HEAD
        path="/settings/admin/email"
        element={<AdminRoute><Navigate to={getAdminSettingsPath('communications')} replace /></AdminRoute>}
      />
      <Route
=======
>>>>>>> origin/main
        path="/settings/admin/portal"
        element={<AdminRoute><Navigate to={getPortalAdminPath('access')} replace /></AdminRoute>}
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
        path="/settings/admin/:section"
        element={<AdminRoute><AdminSettingsSectionRoute /></AdminRoute>}
      />
      <Route
        path="/settings/organization"
<<<<<<< HEAD
        element={<AdminRoute><Navigate to="/dashboard" replace /></AdminRoute>}
      />
      <Route
        path="/admin/audit-logs"
        element={<AdminRoute><Navigate to="/dashboard" replace /></AdminRoute>}
=======
        element={<AdminRoute><Navigate to={getAdminSettingsPath('organization')} replace /></AdminRoute>}
      />
      <Route
        path="/admin/audit-logs"
        element={<AdminRoute><Navigate to={getAdminSettingsPath('audit_logs')} replace /></AdminRoute>}
>>>>>>> origin/main
      />
      <Route
        path="/settings/backup"
        element={<AdminRoute><DataBackup /></AdminRoute>}
      />
    </>
  );
}
