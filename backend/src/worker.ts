/**
 * Nonprofit Manager - Background Worker Process
 * Handles all scheduled tasks and background workers.
 */

import dotenv from 'dotenv';
import { logger } from './config/logger';
import { initializeRedis, closeRedis } from './config/redis';
import pool from './config/database';
import { eventReminderSchedulerService } from './services/eventReminderSchedulerService';
import { followUpReminderSchedulerService } from './services/followUpReminderSchedulerService';
import { appointmentReminderSchedulerService } from './services/appointmentReminderSchedulerService';
import { publicReportSnapshotCleanupSchedulerService } from './services/publicReportSnapshotCleanupSchedulerService';
import { scheduledReportSchedulerService } from './services/scheduledReportSchedulerService';
import {
  LOCAL_CAMPAIGN_DELIVERY_HEALTH_NAME,
  localCampaignDeliverySchedulerService,
} from '@modules/communications/services/localCampaignDeliverySchedulerService';
import { socialMediaSyncSchedulerService } from '@modules/socialMedia/services/socialMediaSyncSchedulerService';
import { webhookRetrySchedulerService } from '@modules/webhooks/services/webhookRetrySchedulerService';
import { schedulerHealthService } from './services/queue/schedulerHealthService';

// Load environment variables
dotenv.config({ path: '.env', quiet: true });

const startWorker = async () => {
  logger.info('Starting background worker process...');

  try {
    // Initialize shared resources
    await initializeRedis();
    logger.info('Worker: Redis initialized');

    // Start all enabled schedulers
    const schedulers = [
      {
        name: 'Event Reminders',
        healthName: 'event_reminders',
        enabled: process.env.EVENT_REMINDER_SCHEDULER_ENABLED === 'true',
        service: eventReminderSchedulerService,
      },
      {
        name: 'Follow-up Reminders',
        healthName: 'follow_up_reminders',
        enabled: process.env.FOLLOW_UP_REMINDER_SCHEDULER_ENABLED === 'true',
        service: followUpReminderSchedulerService,
      },
      {
        name: 'Appointment Reminders',
        healthName: 'appointment_reminders',
        enabled: process.env.APPOINTMENT_REMINDER_SCHEDULER_ENABLED === 'true',
        service: appointmentReminderSchedulerService,
      },
      {
        name: 'Scheduled Reports',
        healthName: 'scheduled_reports',
        enabled: process.env.SCHEDULED_REPORT_SCHEDULER_ENABLED === 'true',
        service: scheduledReportSchedulerService,
      },
      {
        name: 'Local Campaign Delivery',
        healthName: LOCAL_CAMPAIGN_DELIVERY_HEALTH_NAME,
        enabled: process.env.LOCAL_CAMPAIGN_DELIVERY_SCHEDULER_ENABLED === 'true',
        service: localCampaignDeliverySchedulerService,
      },
      {
        name: 'Public Report Cleanup',
        healthName: 'public_report_cleanup',
        enabled: process.env.REPORT_PUBLIC_SNAPSHOT_CLEANUP_ENABLED === 'true',
        service: publicReportSnapshotCleanupSchedulerService,
      },
      {
        name: 'Social Media Sync',
        healthName: 'social_media_sync',
        enabled: process.env.SOCIAL_MEDIA_SYNC_SCHEDULER_ENABLED === 'true',
        service: socialMediaSyncSchedulerService,
      },
      {
        name: 'Webhook Retries',
        healthName: 'webhook_retries',
        enabled: process.env.WEBHOOK_RETRY_SCHEDULER_ENABLED === 'true',
        service: webhookRetrySchedulerService,
      },
    ];

    for (const scheduler of schedulers) {
      await schedulerHealthService.recordSchedulerState(scheduler.healthName, scheduler.enabled);
      if (scheduler.enabled) {
        scheduler.service.start();
        logger.info(`Worker: Started ${scheduler.name} scheduler`);
      } else {
        logger.info(`Worker: ${scheduler.name} scheduler disabled (skipped)`);
      }
    }

    logger.info('Background worker process fully initialized');
  } catch (error) {
    logger.error('Worker: Failed to initialize background processes', error);
    process.exit(1);
  }
};

const stopWorker = async (signal: string) => {
  logger.info(`${signal} received, closing worker gracefully...`);
  
  // Stop all schedulers
  eventReminderSchedulerService.stop();
  followUpReminderSchedulerService.stop();
  appointmentReminderSchedulerService.stop();
  scheduledReportSchedulerService.stop();
  localCampaignDeliverySchedulerService.stop();
  publicReportSnapshotCleanupSchedulerService.stop();
  socialMediaSyncSchedulerService.stop();
  webhookRetrySchedulerService.stop();

  await Promise.allSettled([
    schedulerHealthService.recordSchedulerStopped('event_reminders'),
    schedulerHealthService.recordSchedulerStopped('follow_up_reminders'),
    schedulerHealthService.recordSchedulerStopped('appointment_reminders'),
    schedulerHealthService.recordSchedulerStopped('scheduled_reports'),
    schedulerHealthService.recordSchedulerStopped(LOCAL_CAMPAIGN_DELIVERY_HEALTH_NAME),
    schedulerHealthService.recordSchedulerStopped('public_report_cleanup'),
    schedulerHealthService.recordSchedulerStopped('social_media_sync'),
    schedulerHealthService.recordSchedulerStopped('webhook_retries'),
  ]);

  try {
    await Promise.all([closeRedis(), pool.end()]);
    logger.info('Worker: Shared resources closed');
  } catch (error) {
    logger.error('Worker: Error closing resources', error);
  }

  process.exit(0);
};

process.on('SIGTERM', () => stopWorker('SIGTERM'));
process.on('SIGINT', () => stopWorker('SIGINT'));

startWorker();
