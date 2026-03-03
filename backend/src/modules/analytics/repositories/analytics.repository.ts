import type { AnalyticsQueryPort } from '../types/ports';

export class AnalyticsRepository implements AnalyticsQueryPort {
  readonly domain = 'analytics' as const;
}
