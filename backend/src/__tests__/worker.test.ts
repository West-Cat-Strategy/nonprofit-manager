jest.mock('@config/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@config/redis', () => ({
  initializeRedis: jest.fn().mockResolvedValue(undefined),
  closeRedis: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    end: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@services/queue/schedulerHealthService', () => ({
  schedulerHealthService: {
    recordSchedulerState: jest.fn().mockResolvedValue(undefined),
    recordSchedulerStopped: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@services/eventReminderSchedulerService', () => ({
  EVENT_REMINDER_SCHEDULER_HEALTH_NAME: 'event_reminders',
  eventReminderSchedulerService: {
    healthName: 'event_reminders',
    start: jest.fn(),
    stop: jest.fn(),
  },
}));

jest.mock('@services/followUpReminderSchedulerService', () => ({
  FOLLOW_UP_REMINDER_SCHEDULER_HEALTH_NAME: 'follow_up_reminders',
  followUpReminderSchedulerService: {
    healthName: 'follow_up_reminders',
    start: jest.fn(),
    stop: jest.fn(),
  },
}));

jest.mock('@services/appointmentReminderSchedulerService', () => ({
  APPOINTMENT_REMINDER_SCHEDULER_HEALTH_NAME: 'appointment_reminders',
  appointmentReminderSchedulerService: {
    healthName: 'appointment_reminders',
    start: jest.fn(),
    stop: jest.fn(),
  },
}));

jest.mock('@services/scheduledReportSchedulerService', () => ({
  SCHEDULED_REPORT_SCHEDULER_HEALTH_NAME: 'scheduled_reports',
  scheduledReportSchedulerService: {
    healthName: 'scheduled_reports',
    start: jest.fn(),
    stop: jest.fn(),
  },
}));

jest.mock('@modules/communications/services/localCampaignDeliverySchedulerService', () => ({
  LOCAL_CAMPAIGN_DELIVERY_HEALTH_NAME: 'local_campaign_delivery',
  localCampaignDeliverySchedulerService: {
    healthName: 'local_campaign_delivery',
    start: jest.fn(),
    stop: jest.fn(),
  },
}));

jest.mock('@services/publicReportSnapshotCleanupSchedulerService', () => ({
  PUBLIC_REPORT_CLEANUP_SCHEDULER_HEALTH_NAME: 'public_report_cleanup',
  publicReportSnapshotCleanupSchedulerService: {
    healthName: 'public_report_cleanup',
    start: jest.fn(),
    stop: jest.fn(),
  },
}));

jest.mock('@modules/socialMedia/services/socialMediaSyncSchedulerService', () => ({
  SOCIAL_MEDIA_SYNC_SCHEDULER_HEALTH_NAME: 'social_media_sync',
  socialMediaSyncSchedulerService: {
    healthName: 'social_media_sync',
    start: jest.fn(),
    stop: jest.fn(),
  },
}));

jest.mock('@modules/webhooks/services/webhookRetrySchedulerService', () => ({
  WEBHOOK_RETRY_SCHEDULER_HEALTH_NAME: 'webhook_retries',
  webhookRetrySchedulerService: {
    healthName: 'webhook_retries',
    start: jest.fn(),
    stop: jest.fn(),
  },
}));

import pool from '@config/database';
import { closeRedis, initializeRedis } from '@config/redis';
import { schedulerHealthService } from '@services/queue/schedulerHealthService';
import { eventReminderSchedulerService } from '@services/eventReminderSchedulerService';
import { followUpReminderSchedulerService } from '@services/followUpReminderSchedulerService';
import { appointmentReminderSchedulerService } from '@services/appointmentReminderSchedulerService';
import { scheduledReportSchedulerService } from '@services/scheduledReportSchedulerService';
import { localCampaignDeliverySchedulerService } from '@modules/communications/services/localCampaignDeliverySchedulerService';
import { publicReportSnapshotCleanupSchedulerService } from '@services/publicReportSnapshotCleanupSchedulerService';
import { socialMediaSyncSchedulerService } from '@modules/socialMedia/services/socialMediaSyncSchedulerService';
import { webhookRetrySchedulerService } from '@modules/webhooks/services/webhookRetrySchedulerService';
import { startWorker, stopWorker } from '../worker';

const SCHEDULER_ENV_KEYS = [
  'EVENT_REMINDER_SCHEDULER_ENABLED',
  'FOLLOW_UP_REMINDER_SCHEDULER_ENABLED',
  'APPOINTMENT_REMINDER_SCHEDULER_ENABLED',
  'SCHEDULED_REPORT_SCHEDULER_ENABLED',
  'LOCAL_CAMPAIGN_DELIVERY_SCHEDULER_ENABLED',
  'REPORT_PUBLIC_SNAPSHOT_CLEANUP_ENABLED',
  'SOCIAL_MEDIA_SYNC_SCHEDULER_ENABLED',
  'WEBHOOK_RETRY_SCHEDULER_ENABLED',
] as const;

const EXPECTED_HEALTH_NAMES = [
  'event_reminders',
  'follow_up_reminders',
  'appointment_reminders',
  'scheduled_reports',
  'local_campaign_delivery',
  'public_report_cleanup',
  'social_media_sync',
  'webhook_retries',
] as const;

const schedulerServices = [
  eventReminderSchedulerService,
  followUpReminderSchedulerService,
  appointmentReminderSchedulerService,
  scheduledReportSchedulerService,
  localCampaignDeliverySchedulerService,
  publicReportSnapshotCleanupSchedulerService,
  socialMediaSyncSchedulerService,
  webhookRetrySchedulerService,
] as Array<{ healthName: string; start: jest.Mock; stop: jest.Mock }>;

const clearSchedulerEnv = (): void => {
  for (const key of SCHEDULER_ENV_KEYS) {
    delete process.env[key];
  }
};

describe('worker lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearSchedulerEnv();
  });

  afterEach(() => {
    clearSchedulerEnv();
  });

  it('starts only env-enabled schedulers while recording every startup health row', async () => {
    process.env.EVENT_REMINDER_SCHEDULER_ENABLED = 'true';
    process.env.APPOINTMENT_REMINDER_SCHEDULER_ENABLED = 'true';
    process.env.LOCAL_CAMPAIGN_DELIVERY_SCHEDULER_ENABLED = 'true';
    process.env.SOCIAL_MEDIA_SYNC_SCHEDULER_ENABLED = 'true';

    await startWorker();

    expect(initializeRedis).toHaveBeenCalledTimes(1);
    for (const healthName of EXPECTED_HEALTH_NAMES) {
      expect(schedulerHealthService.recordSchedulerState).toHaveBeenCalledWith(
        healthName,
        ['event_reminders', 'appointment_reminders', 'local_campaign_delivery', 'social_media_sync'].includes(
          healthName
        )
      );
    }

    expect(eventReminderSchedulerService.start).toHaveBeenCalledTimes(1);
    expect(followUpReminderSchedulerService.start).not.toHaveBeenCalled();
    expect(appointmentReminderSchedulerService.start).toHaveBeenCalledTimes(1);
    expect(scheduledReportSchedulerService.start).not.toHaveBeenCalled();
    expect(localCampaignDeliverySchedulerService.start).toHaveBeenCalledTimes(1);
    expect(publicReportSnapshotCleanupSchedulerService.start).not.toHaveBeenCalled();
    expect(socialMediaSyncSchedulerService.start).toHaveBeenCalledTimes(1);
    expect(webhookRetrySchedulerService.start).not.toHaveBeenCalled();
  });

  it('stops all registered schedulers, records stop health, and closes shared resources', async () => {
    await stopWorker('TEST');

    for (const service of schedulerServices) {
      expect(service.stop).toHaveBeenCalledTimes(1);
    }
    for (const healthName of EXPECTED_HEALTH_NAMES) {
      expect(schedulerHealthService.recordSchedulerStopped).toHaveBeenCalledWith(healthName);
    }
    expect(closeRedis).toHaveBeenCalledTimes(1);
    expect(pool.end).toHaveBeenCalledTimes(1);
  });
});
