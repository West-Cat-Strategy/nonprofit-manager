import {
  WORKER_SCHEDULER_HEALTH_NAMES,
  createWorkerSchedulerRegistry,
} from '../workerSchedulerRegistry';

const EXPECTED_SCHEDULERS = [
  ['Event Reminders', 'event_reminders', 'EVENT_REMINDER_SCHEDULER_ENABLED'],
  ['Follow-up Reminders', 'follow_up_reminders', 'FOLLOW_UP_REMINDER_SCHEDULER_ENABLED'],
  ['Appointment Reminders', 'appointment_reminders', 'APPOINTMENT_REMINDER_SCHEDULER_ENABLED'],
  ['Scheduled Reports', 'scheduled_reports', 'SCHEDULED_REPORT_SCHEDULER_ENABLED'],
  [
    'Local Campaign Delivery',
    'local_campaign_delivery',
    'LOCAL_CAMPAIGN_DELIVERY_SCHEDULER_ENABLED',
  ],
  [
    'Public Report Cleanup',
    'public_report_cleanup',
    'REPORT_PUBLIC_SNAPSHOT_CLEANUP_ENABLED',
  ],
  ['Social Media Sync', 'social_media_sync', 'SOCIAL_MEDIA_SYNC_SCHEDULER_ENABLED'],
  ['Webhook Retries', 'webhook_retries', 'WEBHOOK_RETRY_SCHEDULER_ENABLED'],
] as const;

describe('workerSchedulerRegistry', () => {
  it('declares every worker scheduler health name in startup order', () => {
    expect(WORKER_SCHEDULER_HEALTH_NAMES).toEqual(
      EXPECTED_SCHEDULERS.map(([, healthName]) => healthName)
    );

    const registry = createWorkerSchedulerRegistry({});

    expect(registry.map(({ name, healthName }) => [name, healthName])).toEqual(
      EXPECTED_SCHEDULERS.map(([name, healthName]) => [name, healthName])
    );
    for (const scheduler of registry) {
      expect(scheduler.service.healthName).toBe(scheduler.healthName);
    }
  });

  it('gates startup from the scheduler-specific environment flags', () => {
    const enabledEnv = EXPECTED_SCHEDULERS.reduce<NodeJS.ProcessEnv>((env, [, , envKey], index) => {
      env[envKey] = index % 2 === 0 ? 'true' : 'false';
      return env;
    }, {});

    const registry = createWorkerSchedulerRegistry(enabledEnv);

    expect(registry.map(({ enabled }) => enabled)).toEqual(
      EXPECTED_SCHEDULERS.map((_, index) => index % 2 === 0)
    );
  });
});
