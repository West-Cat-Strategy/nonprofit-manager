import {
  getAdminRouteDefinition,
  getAdminSettingsSectionDefinitionByRouteId,
  getAdminWorkspaceDefinitionByRouteId,
  type AdminRouteId,
  type AdminSettingsSectionRouteId,
  type AdminWorkspaceRouteId,
} from '../../features/adminOps/adminNavigationCatalog';

export const getAdminRouteMeta = <RouteId extends AdminRouteId>(routeId: RouteId) =>
  getAdminRouteDefinition(routeId);

export const getAdminSettingsRouteMeta = <RouteId extends AdminSettingsSectionRouteId>(
  routeId: RouteId
) => getAdminSettingsSectionDefinitionByRouteId(routeId);

export const getAdminWorkspaceRouteMeta = <RouteId extends AdminWorkspaceRouteId>(
  routeId: RouteId
) => getAdminWorkspaceDefinitionByRouteId(routeId);
