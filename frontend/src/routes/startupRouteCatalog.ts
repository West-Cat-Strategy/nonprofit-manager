import {
  normalizeRouteLocation,
  type RouteSection,
} from './routeCatalog';

export type StartupRouteSection = RouteSection;

export const normalizeStartupRouteLocation = (value: string): string =>
  normalizeRouteLocation(value);
