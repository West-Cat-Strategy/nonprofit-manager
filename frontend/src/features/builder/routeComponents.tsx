import { lazy } from 'react';

/**
 * MODULE-OWNERSHIP: builder route boundary
 *
 * Route components for builder routes must resolve through feature ownership.
 */

export const TemplateGallery = lazy(() => import('./pages/TemplateGalleryPage'));
export const PageEditor = lazy(() => import('./pages/PageEditorPage'));
export const TemplatePreview = lazy(() => import('./pages/TemplatePreviewPage'));
