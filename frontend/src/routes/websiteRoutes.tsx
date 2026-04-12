import type { ReactNode } from 'react';
import { Navigate, Route } from 'react-router-dom';
import {
  WebsiteContentPage,
  WebsiteFormsPage,
  WebsiteIntegrationsPage,
  WebsiteNewslettersPage,
  WebsiteOverviewPage,
  WebsitePublishingPage,
  WebsitesListPage,
} from '../features/websites/routeComponents';
import { PageEditor as WebsiteBuilderPage } from '../features/builder/routeComponents';

interface RouteWrapperProps {
  children: ReactNode;
}

export function createWebsiteRoutes(ProtectedRoute: React.ComponentType<RouteWrapperProps>) {
  return (
    <>
      <Route
        path="/websites"
        element={<ProtectedRoute><WebsitesListPage /></ProtectedRoute>}
      />
      <Route
        path="/websites/:siteId"
        element={<ProtectedRoute><Navigate to="overview" replace /></ProtectedRoute>}
      />
      <Route
        path="/websites/:siteId/overview"
        element={<ProtectedRoute><WebsiteOverviewPage /></ProtectedRoute>}
      />
      <Route
        path="/websites/:siteId/content"
        element={<ProtectedRoute><WebsiteContentPage /></ProtectedRoute>}
      />
      <Route
        path="/websites/:siteId/newsletters"
        element={<ProtectedRoute><WebsiteNewslettersPage /></ProtectedRoute>}
      />
      <Route
        path="/websites/:siteId/forms"
        element={<ProtectedRoute><WebsiteFormsPage /></ProtectedRoute>}
      />
      <Route
        path="/websites/:siteId/integrations"
        element={<ProtectedRoute><WebsiteIntegrationsPage /></ProtectedRoute>}
      />
      <Route
        path="/websites/:siteId/publishing"
        element={<ProtectedRoute><WebsitePublishingPage /></ProtectedRoute>}
      />
      <Route
        path="/websites/:siteId/builder"
        element={<ProtectedRoute><WebsiteBuilderPage /></ProtectedRoute>}
      />
    </>
  );
}
