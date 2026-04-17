import { adminRouteDefinitionByRouteId } from '../../features/adminOps/adminNavigationCatalog';

export const getAdminRouteMeta = (routeId: string) => {
  const metadata = adminRouteDefinitionByRouteId.get(routeId);
  if (!metadata) {
    throw new Error(`Missing admin route metadata for ${routeId}`);
  }

  return metadata;
};
