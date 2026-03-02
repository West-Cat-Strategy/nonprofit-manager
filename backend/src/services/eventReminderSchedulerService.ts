/**
 * Event Reminder Scheduler Service
 * Polls and processes due event reminder automations.
 */

import { services } from '../container/services';
import {
  claimDueAutomations,
  markAutomationAttemptResult,
} from '@services/eventReminderAutomationService';
import type {
  EventReminderSummary,
  EventReminderAttemptStatus,
} from '@app-types/event';
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

const computeAttemptStatus = (summary: EventReminderSummary): EventReminderAttemptStatus => {
  const sentCount = summary.email.sent + summary.sms.sent;
  const failedCount = summary.email.failed + summary.sms.failed;
  const skippedCount = summary.email.skipped + summary.sms.skipped;

  if (sentCount > 0 && failedCount === 0 && skippedCount === 0) {
    return 'sent';
  }
  if (sentCount > 0 && (failedCount > 0 || skippedCount > 0)) {
    return 'partial';
  }
  if (failedCount > 0) {
    return 'failed';
  }
  return 'skipped';
};

class EventReminderSchedulerService {
  private runner: IntervalBatchRunner | null = null;
  private batchSize = DEFAULT_BATCH_SIZE;

  start(): void {
    if (this.runner) return;

    const pollIntervalMs = toNumberOrDefault(
      process.env.EVENT_REMINDER_SCHEDULER_INTERVAL_MS,
      DEFAULT_INTERVAL_MS
    );

    this.batchSize = toNumberOrDefault(
      process.env.EVENT_REMINDER_SCHEDULER_BATCH_SIZE,
      DEFAULT_BATCH_SIZE
    );

    const retryAttempts = toNumberOrDefault(
      process.env.EVENT_REMINDER_SCHEDULER_RETRY_ATTEMPTS,
      DEFAULT_RETRY_ATTEMPTS
    );
    const retryDelayMs = toNumberOrDefault(
      process.env.EVENT_REMINDER_SCHEDULER_RETRY_DELAY_MS,
      DEFAULT_RETRY_DELAY_MS
    );
    const timeoutMs = toNumberOrDefault(
      process.env.EVENT_REMINDER_SCHEDULER_TIMEOUT_MS,
      DEFAULT_TIMEOUT_MS
    );

    this.runner = new IntervalBatchRunner({
      name: 'Event reminder scheduler',
      intervalMs: pollIntervalMs,
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

  async tick(): Promise<void> {
    if (this.runner) {
      await this.runner.tick();
      return;
    }

    await this.runBatch();
  }

  private async runBatch(): Promise<number> {
    const dueAutomations = await claimDueAutomations(this.batchSize);

    let processed = 0;
    for (const automation of dueAutomations) {
      processed += 1;
      try {
        const summary = await services.event.sendEventReminders(
          automation.event_id,
          {
            sendEmail: automation.send_email,
            sendSms: automation.send_sms,
            customMessage: automation.custom_message || undefined,
          },
          {
            triggerType: 'automated',
            automationId: automation.id,
            sentBy: null,
          }
        );

        const status = computeAttemptStatus(summary);
        await markAutomationAttemptResult(automation.id, {
          status,
          summary: summary as unknown as Record<string, unknown>,
          error: null,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';

        await markAutomationAttemptResult(automation.id, {
          status: 'failed',
          summary: {
            automationId: automation.id,
            eventId: automation.event_id,
            error: message,
          },
          error: message,
        });
      }
    }

    return processed;
  }
}

export const eventReminderSchedulerService = new EventReminderSchedulerService();
