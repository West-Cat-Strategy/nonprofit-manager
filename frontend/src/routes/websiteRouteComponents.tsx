/**
 * @deprecated Import website-console route components from `frontend/src/features/websites/routeComponents.tsx`
 * and builder route components from `frontend/src/features/builder/routeComponents.tsx`.
 * This root route surface remains as a thin compatibility facade for tests and tooling.
 */
export {
  WebsitesListPage,
  WebsiteOverviewPage,
  WebsiteContentPage,
  WebsiteFormsPage,
  WebsiteIntegrationsPage,
  WebsitePublishingPage,
} from '../features/websites/routeComponents';
export { PageEditor as WebsiteBuilderPage } from '../features/builder/routeComponents';
