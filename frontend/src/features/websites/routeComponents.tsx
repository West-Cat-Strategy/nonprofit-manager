import { lazy } from 'react';

/**
 * MODULE-OWNERSHIP: websites route boundary
 *
 * Route components for website console routes must resolve through feature ownership.
 */

export const WebsitesListPage = lazy(() => import('./pages/WebsitesListPage'));
export const WebsiteOverviewPage = lazy(() => import('./pages/WebsiteOverviewPage'));
export const WebsiteContentPage = lazy(() => import('./pages/WebsiteContentPage'));
export const WebsiteNewslettersPage = lazy(() => import('./pages/WebsiteNewslettersPage'));
export const WebsiteFormsPage = lazy(() => import('./pages/WebsiteFormsPage'));
export const WebsiteIntegrationsPage = lazy(() => import('./pages/WebsiteIntegrationsPage'));
export const WebsitePublishingPage = lazy(() => import('./pages/WebsitePublishingPage'));
