import { lazy } from 'react';

export const WebsitesListPage = lazy(
  () => import('../features/websites/pages/WebsitesListPage')
);
export const WebsiteOverviewPage = lazy(
  () => import('../features/websites/pages/WebsiteOverviewPage')
);
export const WebsiteContentPage = lazy(
  () => import('../features/websites/pages/WebsiteContentPage')
);
export const WebsiteFormsPage = lazy(
  () => import('../features/websites/pages/WebsiteFormsPage')
);
export const WebsiteIntegrationsPage = lazy(
  () => import('../features/websites/pages/WebsiteIntegrationsPage')
);
export const WebsitePublishingPage = lazy(
  () => import('../features/websites/pages/WebsitePublishingPage')
);
export const WebsiteBuilderPage = lazy(() => import('../pages/builder/PageEditor'));
