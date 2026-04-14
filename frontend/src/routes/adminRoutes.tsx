/**
 * Admin Routes
 * Handles settings and admin-only pages
 */

import type { ReactNode } from 'react';
import { Navigate, Route } from 'react-router-dom';
import {
  adminRouteManifest,
  type AdminRouteManifestEntry,
  type AdminRoutePageView,
  type AdminRouteWrapper,
} from '../features/adminOps/adminRouteManifest';
import {
  AdminSettingsSectionRoute,
  ApiSettings,
  CommunicationsPage,
  DataBackup,
  NavigationSettings,
  PortalAdminPage,
  SocialMedia,
  UserSettings,
} from '../features/adminOps/routeComponents';

interface RouteWrapperProps {
  children: ReactNode;
}

interface AdminRouteProps {
  ProtectedRoute: React.ComponentType<RouteWrapperProps>;
  AdminRoute: React.ComponentType<RouteWrapperProps>;
  NeoBrutalistRoute: React.ComponentType<RouteWrapperProps>;
}

const pageComponentByView: Record<AdminRoutePageView, React.ComponentType> = {
  communications: CommunicationsPage,
  socialMedia: SocialMedia,
  api: ApiSettings,
  navigation: NavigationSettings,
  user: UserSettings,
  backup: DataBackup,
};

const renderRouteElement = (entry: AdminRouteManifestEntry): ReactNode => {
  switch (entry.kind) {
    case 'page': {
      const Page = pageComponentByView[entry.view];
      return <Page />;
    }
    case 'redirect':
      return <Navigate to={entry.redirectsTo} replace />;
    case 'portal-panel':
      return <PortalAdminPage panel={entry.panel} />;
    case 'section':
      return <AdminSettingsSectionRoute />;
    default:
      return null;
  }
};

export function createAdminRoutes({
  ProtectedRoute,
  AdminRoute,
  NeoBrutalistRoute,
}: AdminRouteProps) {
  const wrapperByKind: Record<AdminRouteWrapper, React.ComponentType<RouteWrapperProps>> = {
    protected: ProtectedRoute,
    admin: AdminRoute,
    neoBrutalist: NeoBrutalistRoute,
  };

  return (
    <>
      {adminRouteManifest.map((entry) => {
        const Wrapper = wrapperByKind[entry.wrapper];

        return (
          <Route
            key={entry.id}
            path={entry.path}
            element={<Wrapper>{renderRouteElement(entry)}</Wrapper>}
          />
        );
      })}
    </>
  );
}
