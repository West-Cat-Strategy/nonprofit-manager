/**
 * Event Reminder Scheduler Service
 * Polls and processes due event reminder automations.
 */

import { logger } from '@config/logger';
import { services } from '../container/services';
import {
  claimDueAutomations,
  markAutomationAttemptResult,
} from '@services/eventReminderAutomationService';
import type {
  EventReminderSummary,
  EventReminderAttemptStatus,
} from '@app-types/event';

const DEFAULT_INTERVAL_MS = 60_000;
const DEFAULT_BATCH_SIZE = 25;

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
  private intervalId: NodeJS.Timeout | null = null;
  private pollIntervalMs = DEFAULT_INTERVAL_MS;
  private batchSize = DEFAULT_BATCH_SIZE;
  private tickInFlight = false;

  start(): void {
    if (this.intervalId) return;

    this.pollIntervalMs = toNumberOrDefault(
      process.env.EVENT_REMINDER_SCHEDULER_INTERVAL_MS,
      DEFAULT_INTERVAL_MS
    );
    this.batchSize = toNumberOrDefault(
      process.env.EVENT_REMINDER_SCHEDULER_BATCH_SIZE,
      DEFAULT_BATCH_SIZE
    );

    this.intervalId = setInterval(() => {
      void this.tick();
    }, this.pollIntervalMs);

    logger.info('Event reminder scheduler started', {
      intervalMs: this.pollIntervalMs,
      batchSize: this.batchSize,
    });

    // Run one immediate pass at startup.
    void this.tick();
  }

  stop(): void {
    if (!this.intervalId) return;
    clearInterval(this.intervalId);
    this.intervalId = null;
    logger.info('Event reminder scheduler stopped');
  }

  async tick(): Promise<void> {
    if (this.tickInFlight) return;
    this.tickInFlight = true;
    const startedAt = Date.now();

    let processed = 0;
    try {
      const dueAutomations = await claimDueAutomations(this.batchSize);

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
          logger.error('Automated reminder processing failed', {
            automationId: automation.id,
            eventId: automation.event_id,
            error: message,
          });

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
    } catch (error) {
      logger.error('Event reminder scheduler tick failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      const durationMs = Date.now() - startedAt;
      logger.info('Event reminder scheduler tick complete', {
        processed,
        durationMs,
      });
      this.tickInFlight = false;
    }
  }
}

export const eventReminderSchedulerService = new EventReminderSchedulerService();
