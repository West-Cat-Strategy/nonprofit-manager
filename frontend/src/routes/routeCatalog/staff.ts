import type { RouteCatalogEntry } from './types';
import {
  staffAdminRouteCatalogEntries,
} from './staffAdminRoutes';
import { staffEngagementRouteCatalogEntries } from './staffEngagementRoutes';
import { staffFinanceRouteCatalogEntries } from './staffFinanceRoutes';
import { staffHomeRouteCatalogEntries } from './staffHomeRoutes';
import { staffInsightsRouteCatalogEntries } from './staffInsightsRoutes';
import { staffPeopleRouteCatalogEntries } from './staffPeopleRoutes';
import { staffPublishingRouteCatalogEntries } from './staffPublishingRoutes';

export const staffRouteCatalogEntries: readonly RouteCatalogEntry[] = [
  ...staffHomeRouteCatalogEntries,
  ...staffPeopleRouteCatalogEntries,
  ...staffEngagementRouteCatalogEntries,
  ...staffFinanceRouteCatalogEntries,
  ...staffInsightsRouteCatalogEntries,
  ...staffAdminRouteCatalogEntries,
  ...staffPublishingRouteCatalogEntries,
];
