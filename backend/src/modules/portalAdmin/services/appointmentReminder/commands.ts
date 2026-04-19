import { ReminderJobStatus } from './types';
import { markJobResult as markJobResultRepo } from './repository';

interface MarkJobResultInput {
  status: Extract<ReminderJobStatus, 'sent' | 'failed' | 'skipped' | 'cancelled'>;
  error?: string | null;
}

export async function markJobResult(jobId: string, result: MarkJobResultInput): Promise<void> {
  await markJobResultRepo(jobId, result.status, result.error);
}
