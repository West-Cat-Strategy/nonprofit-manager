import { logger } from '@config/logger';
import {
  cancelPendingJobsForNonSendableAppointments,
  claimDueJobs,
  markJobResult,
  sendAppointmentReminders,
  type AppointmentReminderSendSummary,
} from '@services/appointmentReminderService';
import { IntervalBatchRunner } from '@services/queue/intervalBatchRunner';

const DEFAULT_INTERVAL_MS = 60_000;
const DEFAULT_BATCH_SIZE = 25;
const DEFAULT_RETRY_ATTEMPTS = 1;
const DEFAULT_RETRY_DELAY_MS = 1_000;
const DEFAULT_TIMEOUT_MS = 60_000;

const toNumberOrDefault = (rawValue: string | undefined, fallback: number): number => {
  if (!rawValue) return fallback;
  const parsed = Number.parseInt(rawValue, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
};

const computeJobStatus = (
  channel: 'email' | 'sms',
  summary: AppointmentReminderSendSummary
): 'sent' | 'failed' | 'skipped' => {
  const channelSummary = channel === 'email' ? summary.email : summary.sms;
  if (channelSummary.sent > 0 && channelSummary.failed === 0 && channelSummary.skipped === 0) {
    return 'sent';
  }
  if (channelSummary.failed > 0) {
    return 'failed';
  }
  return 'skipped';
};

class AppointmentReminderSchedulerService {
  private runner: IntervalBatchRunner | null = null;
  private batchSize = DEFAULT_BATCH_SIZE;

  start(): void {
    if (this.runner) return;

    const intervalMs = toNumberOrDefault(
      process.env.APPOINTMENT_REMINDER_SCHEDULER_INTERVAL_MS,
      DEFAULT_INTERVAL_MS
    );

    this.batchSize = toNumberOrDefault(
      process.env.APPOINTMENT_REMINDER_SCHEDULER_BATCH_SIZE,
      DEFAULT_BATCH_SIZE
    );

    const retryAttempts = toNumberOrDefault(
      process.env.APPOINTMENT_REMINDER_SCHEDULER_RETRY_ATTEMPTS,
      DEFAULT_RETRY_ATTEMPTS
    );
    const retryDelayMs = toNumberOrDefault(
      process.env.APPOINTMENT_REMINDER_SCHEDULER_RETRY_DELAY_MS,
      DEFAULT_RETRY_DELAY_MS
    );
    const timeoutMs = toNumberOrDefault(
      process.env.APPOINTMENT_REMINDER_SCHEDULER_TIMEOUT_MS,
      DEFAULT_TIMEOUT_MS
    );

    this.runner = new IntervalBatchRunner({
      name: 'Appointment reminder scheduler',
      intervalMs,
      runBatch: async () => this.runBatch(),
      retryAttempts,
      retryDelayMs,
      timeoutMs,
    });

    this.runner.start();
  }

  stop(): void {
    if (!this.runner) return;
    this.runner.stop();
    this.runner = null;
  }

  async tick(): Promise<number> {
    if (this.runner) {
      return this.runner.tick();
    }

    return this.runBatch();
  }

  private async runBatch(): Promise<number> {
    await cancelPendingJobsForNonSendableAppointments(this.batchSize * 4);
    const jobs = await claimDueJobs(this.batchSize);

    let processed = 0;
    for (const job of jobs) {
      processed += 1;
      try {
        const summary = await sendAppointmentReminders(
          job.appointment_id,
          {
            sendEmail: job.channel === 'email',
            sendSms: job.channel === 'sms',
          },
          {
            triggerType: 'automated',
            sentBy: null,
            jobId: job.id,
          }
        );

        await markJobResult(job.id, {
          status: computeJobStatus(job.channel, summary),
          error: null,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown reminder failure';
        logger.warn('Appointment reminder job failed', {
          jobId: job.id,
          appointmentId: job.appointment_id,
          channel: job.channel,
          error: message,
        });

        await markJobResult(job.id, {
          status: 'failed',
          error: message,
        });
      }
    }

    return processed;
  }
}

export const appointmentReminderSchedulerService = new AppointmentReminderSchedulerService();
