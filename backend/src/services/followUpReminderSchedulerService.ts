import { logger } from '@config/logger';
import { sendMail } from '@services/emailService';
import { followUpService } from '@services/followUpService';
import { IntervalBatchRunner } from '@services/queue/intervalBatchRunner';

const DEFAULT_INTERVAL_MS = 60_000;
const DEFAULT_BATCH_SIZE = 25;

const toNumberOrDefault = (rawValue: string | undefined, fallback: number): number => {
  if (!rawValue) return fallback;
  const parsed = Number.parseInt(rawValue, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
};

class FollowUpReminderSchedulerService {
  private runner: IntervalBatchRunner | null = null;
  private batchSize = DEFAULT_BATCH_SIZE;

  start(): void {
    if (this.runner) return;

    const intervalMs = toNumberOrDefault(
      process.env.FOLLOW_UP_REMINDER_SCHEDULER_INTERVAL_MS,
      DEFAULT_INTERVAL_MS
    );

    this.batchSize = toNumberOrDefault(
      process.env.FOLLOW_UP_REMINDER_SCHEDULER_BATCH_SIZE,
      DEFAULT_BATCH_SIZE
    );

    this.runner = new IntervalBatchRunner({
      name: 'Follow-up reminder scheduler',
      intervalMs,
      runBatch: async () => this.runBatch(),
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
    const notifications = await followUpService.claimDueNotifications(this.batchSize);

    let processed = 0;
    for (const notification of notifications) {
      processed += 1;

      try {
        if (!notification.recipient_email) {
          await followUpService.markNotificationResult(notification.id, {
            status: 'skipped',
            errorMessage: 'No recipient email configured',
          });
          continue;
        }

        const followUp = await followUpService.getFollowUpById(
          notification.organization_id,
          notification.follow_up_id
        );

        if (!followUp) {
          await followUpService.markNotificationResult(notification.id, {
            status: 'failed',
            errorMessage: 'Follow-up record not found',
          });
          continue;
        }

        const deliveryOk = await sendMail({
          to: notification.recipient_email,
          subject: `Follow-up reminder: ${followUp.title}`,
          text: [
            `This is a reminder for your follow-up: ${followUp.title}`,
            `Date: ${followUp.scheduled_date}`,
            followUp.scheduled_time ? `Time: ${followUp.scheduled_time}` : undefined,
            followUp.description ? `Notes: ${followUp.description}` : undefined,
          ]
            .filter(Boolean)
            .join('\n'),
          html: [
            `<p>This is a reminder for your follow-up: <strong>${followUp.title}</strong></p>`,
            `<p>Date: ${followUp.scheduled_date}</p>`,
            followUp.scheduled_time ? `<p>Time: ${followUp.scheduled_time}</p>` : undefined,
            followUp.description ? `<p>Notes: ${followUp.description}</p>` : undefined,
          ]
            .filter(Boolean)
            .join(''),
        });

        await followUpService.markNotificationResult(notification.id, {
          status: deliveryOk ? 'sent' : 'failed',
          errorMessage: deliveryOk ? null : 'Email delivery failed',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown reminder delivery error';

        logger.error('Follow-up reminder delivery failed', {
          notificationId: notification.id,
          followUpId: notification.follow_up_id,
          error,
        });

        await followUpService.markNotificationResult(notification.id, {
          status: 'failed',
          errorMessage: message,
        });
      }
    }

    return processed;
  }
}

export const followUpReminderSchedulerService = new FollowUpReminderSchedulerService();
