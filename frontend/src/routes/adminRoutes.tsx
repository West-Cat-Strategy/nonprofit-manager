/**
 * Admin Routes
 * Handles settings and admin-only pages
 */

import type { ReactNode } from 'react';
import { Navigate, Route } from 'react-router-dom';
import { adminRouteManifest } from '../features/adminOps/adminRouteManifest';
import type { PortalAdminPanel } from '../features/adminOps/adminRoutePaths';
import {
  AdminSettingsSectionRoute,
  CommunicationsPage,
  ApiSettings,
  DataBackup,
  NavigationSettings,
  PortalAdminPage,
  SocialMedia,
  UserSettings,
} from '../features/adminOps/routeComponents';
import { getAdminSettingsPath } from '../features/adminOps/adminRoutePaths';

// Lazy load admin pages

interface RouteWrapperProps {
  children: ReactNode;
}

interface AdminRouteProps {
  ProtectedRoute: React.ComponentType<RouteWrapperProps>;
  AdminRoute: React.ComponentType<RouteWrapperProps>;
  NeoBrutalistRoute: React.ComponentType<RouteWrapperProps>;
}

const [
  legacyEmailMarketingRoute,
  legacyAdminSettingsRoute,
  legacyAdminPortalRoute,
  legacyOrganizationSettingsRoute,
  legacyAuditLogsRoute,
] = adminRouteManifest.compatibility;

const portalPanelByRouteId: Record<string, PortalAdminPanel> = {
  'portal-admin-access': 'access',
  'portal-admin-users': 'users',
  'portal-admin-conversations': 'conversations',
  'portal-admin-appointments': 'appointments',
  'portal-admin-slots': 'slots',
};

export function createAdminRoutes({
  ProtectedRoute,
  AdminRoute,
  NeoBrutalistRoute,
}: AdminRouteProps) {
  return (
    <>
      <Route
        path="/settings/communications"
        element={
          <ProtectedRoute>
            <CommunicationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/email-marketing"
        element={
          <ProtectedRoute>
            <CommunicationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/social-media"
        element={
          <AdminRoute>
            <SocialMedia />
          </AdminRoute>
        }
      />
      <Route
        path="/settings/api"
        element={
          <ProtectedRoute>
            <ApiSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/navigation"
        element={
          <ProtectedRoute>
            <NavigationSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/user"
        element={
          <NeoBrutalistRoute>
            <UserSettings />
          </NeoBrutalistRoute>
        }
      />
      <Route
        path={legacyEmailMarketingRoute.path}
        element={
          <ProtectedRoute>
            <Navigate to={legacyEmailMarketingRoute.redirectsTo} replace />
          </ProtectedRoute>
        }
      />
      <Route
        path={legacyAdminSettingsRoute.path}
        element={
          <AdminRoute>
            <Navigate to={legacyAdminSettingsRoute.redirectsTo} replace />
          </AdminRoute>
        }
      />
      <Route
        path="/settings/admin/email"
        element={
          <AdminRoute>
            <Navigate to={getAdminSettingsPath('communications')} replace />
          </AdminRoute>
        }
      />
      {adminRouteManifest.portal.map((entry) => (
        <Route
          key={entry.id}
          path={entry.path}
          element={
            <AdminRoute>
              <PortalAdminPage panel={portalPanelByRouteId[entry.id]} />
            </AdminRoute>
          }
        />
      ))}
      <Route
        path="/settings/admin/:section"
        element={
          <AdminRoute>
            <AdminSettingsSectionRoute />
          </AdminRoute>
        }
      />
      <Route
        path={legacyAdminPortalRoute.path}
        element={
          <AdminRoute>
            <Navigate to={legacyAdminPortalRoute.redirectsTo} replace />
          </AdminRoute>
        }
      />
      <Route
        path={legacyOrganizationSettingsRoute.path}
        element={
          <AdminRoute>
            <Navigate to={legacyOrganizationSettingsRoute.redirectsTo} replace />
          </AdminRoute>
        }
      />
      <Route
        path="/settings/backup"
        element={
          <AdminRoute>
            <DataBackup />
          </AdminRoute>
        }
      />
      <Route
        path={legacyAuditLogsRoute.path}
        element={
          <AdminRoute>
            <Navigate to={legacyAuditLogsRoute.redirectsTo} replace />
          </AdminRoute>
        }
      />
    </>
  );
}
