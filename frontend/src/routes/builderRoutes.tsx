/**
 * Builder Routes
 * Handles website builder pages
 */

import { lazy } from 'react';
import type { ReactNode } from 'react';
import { Route } from 'react-router-dom';

// Lazy load builder pages
const TemplateGallery = lazy(() => import('../pages/builder/TemplateGallery'));
const PageEditor = lazy(() => import('../pages/builder/PageEditor'));
const TemplatePreview = lazy(() => import('../pages/builder/TemplatePreview'));

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

// Re-export lazy components for backwards compatibility
export {
  TemplateGallery,
  PageEditor,
  TemplatePreview,
};
