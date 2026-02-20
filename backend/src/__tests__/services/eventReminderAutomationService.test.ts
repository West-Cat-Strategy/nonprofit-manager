import * as eventReminderAutomationService from '@services/eventReminderAutomationService';
import pool from '@config/database';

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

jest.mock('@config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

type QueryMock = jest.MockedFunction<typeof pool.query>;

interface ReminderRowOverride {
  [key: string]: unknown;
}

const buildReminderRow = (overrides: ReminderRowOverride = {}) => ({
  id: 'automation-1',
  event_id: 'event-1',
  timing_type: 'relative',
  relative_minutes_before: 60,
  absolute_send_at: null,
  send_email: true,
  send_sms: true,
  custom_message: 'Bring your ticket',
  timezone: 'America/New_York',
  is_active: true,
  processing_started_at: null,
  attempted_at: null,
  attempt_status: null,
  attempt_summary: null,
  last_error: null,
  created_at: new Date('2026-02-01T12:00:00Z'),
  updated_at: new Date('2026-02-01T12:00:00Z'),
  created_by: 'user-1',
  modified_by: 'user-1',
  ...overrides,
});

describe('eventReminderAutomationService', () => {
  const mockQuery = pool.query as QueryMock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createEventReminderAutomation', () => {
    it('creates a relative reminder automation', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [buildReminderRow({ send_sms: false })],
      } as never);

      const result = await eventReminderAutomationService.createEventReminderAutomation(
        'event-1',
        {
          timingType: 'relative',
          relativeMinutesBefore: 60,
          sendEmail: true,
          sendSms: false,
          customMessage: 'Bring your ticket',
          timezone: 'America/New_York',
        },
        'user-1'
      );

      expect(result.timing_type).toBe('relative');
      expect(result.relative_minutes_before).toBe(60);
      expect(result.send_sms).toBe(false);

      const [, params] = mockQuery.mock.calls[0];
      expect(params).toEqual([
        'event-1',
        'relative',
        60,
        null,
        true,
        false,
        'Bring your ticket',
        'America/New_York',
        'user-1',
      ]);
    });

    it('rejects when both channels are disabled', async () => {
      await expect(
        eventReminderAutomationService.createEventReminderAutomation(
          'event-1',
          {
            timingType: 'relative',
            relativeMinutesBefore: 30,
            sendEmail: false,
            sendSms: false,
          },
          'user-1'
        )
      ).rejects.toThrow('At least one reminder channel must be enabled');

      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('updateEventReminderAutomation', () => {
    it('rejects updates for attempted reminders', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          buildReminderRow({
            attempted_at: new Date('2026-02-01T13:00:00Z'),
            attempt_status: 'failed',
            is_active: false,
          }),
        ],
      } as never);

      await expect(
        eventReminderAutomationService.updateEventReminderAutomation(
          'event-1',
          'automation-1',
          {
            customMessage: 'Updated message',
          },
          'user-1'
        )
      ).rejects.toThrow('Attempted reminder automations cannot be edited');
    });
  });

  describe('cancelEventReminderAutomation', () => {
    it('cancels a pending reminder automation', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [buildReminderRow()],
        } as never)
        .mockResolvedValueOnce({
          rows: [
            buildReminderRow({
              is_active: false,
              attempt_status: 'cancelled',
              modified_by: 'user-2',
            }),
          ],
        } as never);

      const result = await eventReminderAutomationService.cancelEventReminderAutomation(
        'event-1',
        'automation-1',
        'user-2'
      );

      expect(result.is_active).toBe(false);
      expect(result.attempt_status).toBe('cancelled');
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });
  });

  describe('syncPendingEventReminderAutomations', () => {
    it('cancels pending reminders then creates provided rows', async () => {
      mockQuery
        .mockResolvedValueOnce({ rowCount: 2 } as never)
        .mockResolvedValueOnce({
          rows: [buildReminderRow({ id: 'automation-1', relative_minutes_before: 30 })],
        } as never)
        .mockResolvedValueOnce({
          rows: [
            buildReminderRow({
              id: 'automation-2',
              timing_type: 'absolute',
              relative_minutes_before: null,
              absolute_send_at: new Date('2026-03-02T15:00:00Z'),
            }),
          ],
        } as never);

      const result = await eventReminderAutomationService.syncPendingEventReminderAutomations(
        'event-1',
        {
          items: [
            {
              timingType: 'relative',
              relativeMinutesBefore: 30,
              sendEmail: true,
              sendSms: false,
              customMessage: 'Relative reminder',
              timezone: 'UTC',
            },
            {
              timingType: 'absolute',
              absoluteSendAt: new Date('2026-03-02T15:00:00Z'),
              sendEmail: false,
              sendSms: true,
              customMessage: 'Absolute reminder',
              timezone: 'UTC',
            },
          ],
        },
        'user-1'
      );

      expect(result).toHaveLength(2);
      expect(result[0].relative_minutes_before).toBe(30);
      expect(result[1].timing_type).toBe('absolute');

      const [cancelSql] = mockQuery.mock.calls[0];
      expect(cancelSql).toContain('SET is_active = false');
    });
  });

  describe('claimDueAutomations', () => {
    it('claims due reminders using stale-processing timeout and limit', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            ...buildReminderRow(),
            due_at: new Date('2026-02-01T11:00:00Z'),
            event_start_date: new Date('2026-02-01T12:00:00Z'),
            event_status: 'planned',
          },
        ],
      } as never);

      const result = await eventReminderAutomationService.claimDueAutomations(10);

      expect(result).toHaveLength(1);
      expect(result[0].due_at.toISOString()).toBe('2026-02-01T11:00:00.000Z');

      const [, params] = mockQuery.mock.calls[0];
      expect(params).toEqual([10, 10]);
    });
  });

  describe('markAutomationAttemptResult', () => {
    it('stores attempt status, summary, and error', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 } as never);

      await eventReminderAutomationService.markAutomationAttemptResult('automation-1', {
        status: 'failed',
        summary: { sent: 0, failed: 2 },
        error: 'SMTP unavailable',
      });

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [, params] = mockQuery.mock.calls[0];
      expect(params).toEqual([
        'failed',
        { sent: 0, failed: 2 },
        'SMTP unavailable',
        'automation-1',
      ]);
    });
  });
});
