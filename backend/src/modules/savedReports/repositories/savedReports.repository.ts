import type { SavedReportsPort } from '../types/ports';

export class SavedReportsRepository implements SavedReportsPort {
  readonly domain = 'savedReports' as const;
}
