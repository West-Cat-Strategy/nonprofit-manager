/**
 * Builder Routes
 * Handles website builder pages
 */

import type { ReactNode } from 'react';
import { Route } from 'react-router-dom';
import { TemplateGallery, PageEditor, TemplatePreview } from './builderRouteComponents';

// Lazy load builder pages

interface RouteWrapperProps {
  children: ReactNode;
}

export function createBuilderRoutes(ProtectedRoute: React.ComponentType<RouteWrapperProps>) {
  return (
    <>
      <Route
        path="/website-builder"
        element={<ProtectedRoute><TemplateGallery /></ProtectedRoute>}
      />
      <Route
        path="/website-builder/:templateId/preview"
        element={<ProtectedRoute><TemplatePreview /></ProtectedRoute>}
      />
      <Route
        path="/website-builder/:templateId"
        element={<ProtectedRoute><PageEditor /></ProtectedRoute>}
      />
    </>
  );
}
