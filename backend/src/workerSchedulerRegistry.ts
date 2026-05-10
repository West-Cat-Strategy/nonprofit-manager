import {
  EVENT_REMINDER_SCHEDULER_HEALTH_NAME,
  eventReminderSchedulerService,
} from '@services/eventReminderSchedulerService';
import {
  FOLLOW_UP_REMINDER_SCHEDULER_HEALTH_NAME,
  followUpReminderSchedulerService,
} from '@services/followUpReminderSchedulerService';
import {
  APPOINTMENT_REMINDER_SCHEDULER_HEALTH_NAME,
  appointmentReminderSchedulerService,
} from '@services/appointmentReminderSchedulerService';
import {
  SCHEDULED_REPORT_SCHEDULER_HEALTH_NAME,
  scheduledReportSchedulerService,
} from '@services/scheduledReportSchedulerService';
import {
  REPORT_EXPORT_JOB_SCHEDULER_HEALTH_NAME,
  reportExportJobSchedulerService,
} from '@services/reportExportJobSchedulerService';
import {
  LOCAL_CAMPAIGN_DELIVERY_HEALTH_NAME,
  localCampaignDeliverySchedulerService,
} from '@modules/communications/services/localCampaignDeliverySchedulerService';
import {
  PUBLIC_REPORT_CLEANUP_SCHEDULER_HEALTH_NAME,
  publicReportSnapshotCleanupSchedulerService,
} from '@services/publicReportSnapshotCleanupSchedulerService';
import {
  SOCIAL_MEDIA_SYNC_SCHEDULER_HEALTH_NAME,
  socialMediaSyncSchedulerService,
} from '@modules/socialMedia/services/socialMediaSyncSchedulerService';
import {
  WEBHOOK_RETRY_SCHEDULER_HEALTH_NAME,
  webhookRetrySchedulerService,
} from '@modules/webhooks/services/webhookRetrySchedulerService';

export const WORKER_SCHEDULER_HEALTH_NAMES = [
  EVENT_REMINDER_SCHEDULER_HEALTH_NAME,
  FOLLOW_UP_REMINDER_SCHEDULER_HEALTH_NAME,
  APPOINTMENT_REMINDER_SCHEDULER_HEALTH_NAME,
  SCHEDULED_REPORT_SCHEDULER_HEALTH_NAME,
  REPORT_EXPORT_JOB_SCHEDULER_HEALTH_NAME,
  LOCAL_CAMPAIGN_DELIVERY_HEALTH_NAME,
  PUBLIC_REPORT_CLEANUP_SCHEDULER_HEALTH_NAME,
  SOCIAL_MEDIA_SYNC_SCHEDULER_HEALTH_NAME,
  WEBHOOK_RETRY_SCHEDULER_HEALTH_NAME,
] as const;

export type WorkerSchedulerHealthName = (typeof WORKER_SCHEDULER_HEALTH_NAMES)[number];

export interface WorkerSchedulerService {
  readonly healthName: WorkerSchedulerHealthName;
  start(): void;
  stop(): void;
}

export interface WorkerSchedulerDeclaration {
  name: string;
  healthName: WorkerSchedulerHealthName;
  enabled: boolean;
  service: WorkerSchedulerService;
}

const isEnabled = (rawValue: string | undefined): boolean => rawValue === 'true';

const createDeclaration = (
  name: string,
  envKey: string,
  service: WorkerSchedulerService,
  env: NodeJS.ProcessEnv
): WorkerSchedulerDeclaration => ({
  name,
  healthName: service.healthName,
  enabled: isEnabled(env[envKey]),
  service,
});

export const createWorkerSchedulerRegistry = (
  env: NodeJS.ProcessEnv = process.env
): WorkerSchedulerDeclaration[] => [
  createDeclaration(
    'Event Reminders',
    'EVENT_REMINDER_SCHEDULER_ENABLED',
    eventReminderSchedulerService,
    env
  ),
  createDeclaration(
    'Follow-up Reminders',
    'FOLLOW_UP_REMINDER_SCHEDULER_ENABLED',
    followUpReminderSchedulerService,
    env
  ),
  createDeclaration(
    'Appointment Reminders',
    'APPOINTMENT_REMINDER_SCHEDULER_ENABLED',
    appointmentReminderSchedulerService,
    env
  ),
  createDeclaration(
    'Scheduled Reports',
    'SCHEDULED_REPORT_SCHEDULER_ENABLED',
    scheduledReportSchedulerService,
    env
  ),
  createDeclaration(
    'Report Export Jobs',
    'REPORT_EXPORT_JOB_SCHEDULER_ENABLED',
    reportExportJobSchedulerService,
    env
  ),
  createDeclaration(
    'Local Campaign Delivery',
    'LOCAL_CAMPAIGN_DELIVERY_SCHEDULER_ENABLED',
    localCampaignDeliverySchedulerService,
    env
  ),
  createDeclaration(
    'Public Report Cleanup',
    'REPORT_PUBLIC_SNAPSHOT_CLEANUP_ENABLED',
    publicReportSnapshotCleanupSchedulerService,
    env
  ),
  createDeclaration(
    'Social Media Sync',
    'SOCIAL_MEDIA_SYNC_SCHEDULER_ENABLED',
    socialMediaSyncSchedulerService,
    env
  ),
  createDeclaration(
    'Webhook Retries',
    'WEBHOOK_RETRY_SCHEDULER_ENABLED',
    webhookRetrySchedulerService,
    env
  ),
];
