import {
  adminRouteDescriptors,
  adminSectionRouteEntry,
  type AdminRouteDescriptor,
  type AdminRouteManifestEntry,
  type AdminRoutePageView,
  type AdminRouteWrapper,
} from './adminRouteDescriptors';

export type { AdminRouteManifestEntry, AdminRoutePageView, AdminRouteWrapper };

const buildAdminRouteManifestEntry = (
  descriptor: AdminRouteDescriptor
): AdminRouteManifestEntry => {
  const baseEntry = {
    id: descriptor.routeId,
    title: descriptor.title,
    path: descriptor.path,
    wrapper: descriptor.wrapper,
    ...(descriptor.description ? { description: descriptor.description } : {}),
    ...(descriptor.adminSurface ? { adminSurface: descriptor.adminSurface } : {}),
  };

  switch (descriptor.kind) {
    case 'page':
      return {
        ...baseEntry,
        kind: 'page',
        view: descriptor.view,
      };
    case 'redirect':
      return {
        ...baseEntry,
        kind: 'redirect',
        redirectsTo: descriptor.redirectsTo,
      };
    case 'portal-panel':
      return {
        ...baseEntry,
        kind: 'portal-panel',
        panel: descriptor.panel,
      };
  }
};

export const adminRouteManifest = [
  ...adminRouteDescriptors.map(buildAdminRouteManifestEntry),
  adminSectionRouteEntry,
] as const satisfies readonly AdminRouteManifestEntry[];

export default adminRouteManifest;
