import type { DashboardPort } from '../types/ports';

export class DashboardRepository implements DashboardPort {
  readonly domain = 'dashboard' as const;
}
