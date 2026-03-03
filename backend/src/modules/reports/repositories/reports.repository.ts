import type { ReportsPort } from '../types/ports';

export class ReportsRepository implements ReportsPort {
  readonly domain = 'reports' as const;
}
