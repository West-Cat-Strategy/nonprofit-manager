import type { RouteCatalogEntry } from './types';
import { staffRoute } from './shared';
import { peopleRouteDescriptors } from '../peopleRouteDescriptors';

export const staffPeopleRouteCatalogEntries: readonly RouteCatalogEntry[] = peopleRouteDescriptors.map(
  (descriptor) =>
    staffRoute({
      ...descriptor.catalog,
      section: 'People',
    })
);
