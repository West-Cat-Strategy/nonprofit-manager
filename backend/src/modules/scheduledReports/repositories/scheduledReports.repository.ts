import type { ScheduledReportsPort } from '../types/ports';

export class ScheduledReportsRepository implements ScheduledReportsPort {
  readonly domain = 'scheduledReports' as const;
}
