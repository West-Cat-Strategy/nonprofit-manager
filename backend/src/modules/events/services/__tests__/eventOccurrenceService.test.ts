import { Pool } from 'pg';
import { EventStatus } from '@app-types/event';
import { EventOccurrenceService } from '../eventOccurrenceService';

describe('EventOccurrenceService.syncOccurrencesForEvent', () => {
  const mockQuery = jest.fn();
  const pool = { query: mockQuery } as unknown as Pool;
  const service = new EventOccurrenceService(pool);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('compares retained occurrences with timestamptz values instead of text', async () => {
    const scheduledStart = new Date('2026-06-15T18:00:00.000Z');
    const seriesRow = {
      event_id: 'event-1',
      organization_id: 'acct-1',
      event_name: 'Community Clinic',
      description: null,
      status: EventStatus.PLANNED,
      start_date: scheduledStart,
      end_date: new Date('2026-06-15T20:00:00.000Z'),
      location_name: null,
      address_line1: null,
      address_line2: null,
      city: null,
      state_province: null,
      postal_code: null,
      country: null,
      capacity: null,
      waitlist_enabled: true,
      public_checkin_enabled: false,
      public_checkin_pin_hash: null,
      public_checkin_pin_rotated_at: null,
      recurrence_pattern: null,
      recurrence_interval: null,
      recurrence_end_date: null,
      is_recurring: false,
      created_by: 'user-1',
      modified_by: 'user-1',
    };

    mockQuery
      .mockResolvedValueOnce({ rows: [seriesRow] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });

    await service.syncOccurrencesForEvent('event-1');

    const insertCall = mockQuery.mock.calls[1] as [string, unknown[]];
    expect(insertCall[0]).toContain('organization_id');
    expect(insertCall[1][1]).toBe('acct-1');

    const deleteCall = mockQuery.mock.calls[2] as [string, unknown[]];
    expect(deleteCall[0]).toContain('scheduled_start_date = ANY($2::timestamptz[])');
    expect(deleteCall[0]).not.toContain('::text');
    expect(deleteCall[1][1]).toEqual([scheduledStart]);
  });
});
