import { eventReminderSchedulerService } from '@services/eventReminderSchedulerService';
import {
  claimDueAutomations,
  markAutomationAttemptResult,
} from '@services/eventReminderAutomationService';
import { services } from '../../container/services';

jest.mock('@services/eventReminderAutomationService', () => ({
  claimDueAutomations: jest.fn(),
  markAutomationAttemptResult: jest.fn(),
}));

jest.mock('../../container/services', () => ({
  services: {
    event: {
      sendEventReminders: jest.fn(),
    },
  },
}));

jest.mock('@config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('eventReminderSchedulerService', () => {
  const mockClaimDueAutomations = claimDueAutomations as jest.MockedFunction<typeof claimDueAutomations>;
  const mockMarkAutomationAttemptResult =
    markAutomationAttemptResult as jest.MockedFunction<typeof markAutomationAttemptResult>;
  const mockSendEventReminders = services.event.sendEventReminders as jest.MockedFunction<
    typeof services.event.sendEventReminders
  >;

  const baseAutomation = {
    id: 'automation-1',
    event_id: 'event-1',
    timing_type: 'relative' as const,
    relative_minutes_before: 30,
    absolute_send_at: null,
    send_email: true,
    send_sms: true,
    custom_message: 'See you soon',
    timezone: 'UTC',
    is_active: true,
    processing_started_at: new Date('2026-02-01T12:00:00Z'),
    attempted_at: null,
    attempt_status: null,
    attempt_summary: null,
    last_error: null,
    created_at: new Date('2026-02-01T10:00:00Z'),
    updated_at: new Date('2026-02-01T12:00:00Z'),
    created_by: 'user-1',
    modified_by: 'user-1',
    due_at: new Date('2026-02-01T11:30:00Z'),
    event_start_date: new Date('2026-02-01T13:00:00Z'),
    event_status: 'planned',
  };

  const flushMicrotasks = async (): Promise<void> => {
    for (let i = 0; i < 6; i += 1) {
      await Promise.resolve();
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    eventReminderSchedulerService.stop();
  });

  afterEach(() => {
    eventReminderSchedulerService.stop();
  });

  it('claims due automations and records sent status', async () => {
    mockClaimDueAutomations.mockResolvedValue([baseAutomation]);
    mockSendEventReminders.mockResolvedValue({
      eventId: 'event-1',
      eventName: 'Community Dinner',
      eventStartDate: new Date('2026-02-01T13:00:00Z'),
      totalRegistrations: 1,
      eligibleRegistrations: 1,
      email: {
        requested: true,
        enabled: true,
        attempted: 1,
        sent: 1,
        failed: 0,
        skipped: 0,
      },
      sms: {
        requested: true,
        enabled: true,
        attempted: 1,
        sent: 1,
        failed: 0,
        skipped: 0,
      },
      warnings: [],
    });

    await eventReminderSchedulerService.tick();

    expect(mockClaimDueAutomations).toHaveBeenCalledWith(25);
    expect(mockSendEventReminders).toHaveBeenCalledWith(
      'event-1',
      {
        sendEmail: true,
        sendSms: true,
        customMessage: 'See you soon',
      },
      {
        triggerType: 'automated',
        automationId: 'automation-1',
        sentBy: null,
      }
    );
    expect(mockMarkAutomationAttemptResult).toHaveBeenCalledWith(
      'automation-1',
      expect.objectContaining({ status: 'sent' })
    );
  });

  it('marks partial status when any sends are skipped or failed', async () => {
    mockClaimDueAutomations.mockResolvedValue([baseAutomation]);
    mockSendEventReminders.mockResolvedValue({
      eventId: 'event-1',
      eventName: 'Community Dinner',
      eventStartDate: new Date('2026-02-01T13:00:00Z'),
      totalRegistrations: 2,
      eligibleRegistrations: 2,
      email: {
        requested: true,
        enabled: true,
        attempted: 2,
        sent: 1,
        failed: 1,
        skipped: 0,
      },
      sms: {
        requested: false,
        enabled: false,
        attempted: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
      },
      warnings: [],
    });

    await eventReminderSchedulerService.tick();

    expect(mockMarkAutomationAttemptResult).toHaveBeenCalledWith(
      'automation-1',
      expect.objectContaining({ status: 'partial' })
    );
  });

  it('records failed status and does not retry automatically on send exceptions', async () => {
    mockClaimDueAutomations.mockResolvedValue([baseAutomation]);
    mockSendEventReminders.mockRejectedValue(new Error('SMTP unavailable'));

    await eventReminderSchedulerService.tick();

    expect(mockSendEventReminders).toHaveBeenCalledTimes(1);
    expect(mockMarkAutomationAttemptResult).toHaveBeenCalledWith(
      'automation-1',
      expect.objectContaining({
        status: 'failed',
        error: 'SMTP unavailable',
      })
    );
  });

  it('does nothing when no due automations are available', async () => {
    mockClaimDueAutomations.mockResolvedValue([]);

    await eventReminderSchedulerService.tick();

    expect(mockSendEventReminders).not.toHaveBeenCalled();
    expect(mockMarkAutomationAttemptResult).not.toHaveBeenCalled();
  });

  it('supports start/stop polling lifecycle via shared runner', async () => {
    jest.useFakeTimers();
    mockClaimDueAutomations.mockResolvedValue([]);

    eventReminderSchedulerService.start();
    await flushMicrotasks();
    expect(mockClaimDueAutomations).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(60_000);
    await flushMicrotasks();
    expect(mockClaimDueAutomations).toHaveBeenCalledTimes(2);

    eventReminderSchedulerService.stop();
    jest.advanceTimersByTime(120_000);
    await flushMicrotasks();
    expect(mockClaimDueAutomations).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });
});
