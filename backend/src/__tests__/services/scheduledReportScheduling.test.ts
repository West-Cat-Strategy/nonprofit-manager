import {
  computeNextRunAt,
  validateScheduleFields,
  validateTimezone,
} from '@modules/scheduledReports/services/scheduledReportScheduling';

describe('scheduledReportScheduling', () => {
  it('computes a daily run later the same day when the target time has not passed', () => {
    const nextRunAt = computeNextRunAt({
      frequency: 'daily',
      timezone: 'UTC',
      hour: 9,
      minute: 30,
      fromDate: new Date('2026-04-22T08:15:00.000Z'),
    });

    expect(nextRunAt.toISOString()).toBe('2026-04-22T09:30:00.000Z');
  });

  it('computes a daily run on the following day when the target time already passed', () => {
    const nextRunAt = computeNextRunAt({
      frequency: 'daily',
      timezone: 'UTC',
      hour: 9,
      minute: 30,
      fromDate: new Date('2026-04-22T10:15:00.000Z'),
    });

    expect(nextRunAt.toISOString()).toBe('2026-04-23T09:30:00.000Z');
  });

  it('adjusts non-utc timezones to the correct utc instant', () => {
    const nextRunAt = computeNextRunAt({
      frequency: 'daily',
      timezone: 'America/Vancouver',
      hour: 9,
      minute: 0,
      fromDate: new Date('2026-04-22T14:00:00.000Z'),
    });

    expect(nextRunAt.toISOString()).toBe('2026-04-22T16:00:00.000Z');
  });

  it('computes a weekly run for the next week when today matches but the target time passed', () => {
    const nextRunAt = computeNextRunAt({
      frequency: 'weekly',
      timezone: 'UTC',
      hour: 14,
      minute: 0,
      dayOfWeek: 1,
      fromDate: new Date('2026-04-20T15:00:00.000Z'),
    });

    expect(nextRunAt.toISOString()).toBe('2026-04-27T14:00:00.000Z');
  });

  it('defaults weekly schedules to monday when no day is provided', () => {
    const nextRunAt = computeNextRunAt({
      frequency: 'weekly',
      timezone: 'UTC',
      hour: 9,
      minute: 0,
      fromDate: new Date('2026-04-22T08:00:00.000Z'),
    });

    expect(nextRunAt.toISOString()).toBe('2026-04-27T09:00:00.000Z');
  });

  it('falls back to sunday when Intl returns an unknown weekday token', () => {
    const originalFormatToParts = Intl.DateTimeFormat.prototype.formatToParts;

    jest
      .spyOn(Intl.DateTimeFormat.prototype, 'formatToParts')
      .mockImplementation(function (this: Intl.DateTimeFormat, date: number | Date) {
        return originalFormatToParts.call(this, date).map((part) =>
          part.type === 'weekday' ? { ...part, value: '??' } : part
        );
      });

    const nextRunAt = computeNextRunAt({
      frequency: 'weekly',
      timezone: 'UTC',
      hour: 9,
      minute: 0,
      dayOfWeek: 0,
      fromDate: new Date('2026-04-22T08:00:00.000Z'),
    });

    expect(nextRunAt.toISOString()).toBe('2026-04-22T09:00:00.000Z');
  });

  it('keeps monthly schedules in the current month when the target day and time are still ahead', () => {
    const nextRunAt = computeNextRunAt({
      frequency: 'monthly',
      timezone: 'UTC',
      hour: 9,
      minute: 0,
      dayOfMonth: 25,
      fromDate: new Date('2026-04-22T08:00:00.000Z'),
    });

    expect(nextRunAt.toISOString()).toBe('2026-04-25T09:00:00.000Z');
  });

  it('defaults monthly schedules to the first day of the next month when the first already passed', () => {
    const nextRunAt = computeNextRunAt({
      frequency: 'monthly',
      timezone: 'UTC',
      hour: 9,
      minute: 0,
      fromDate: new Date('2026-04-22T10:00:00.000Z'),
    });

    expect(nextRunAt.toISOString()).toBe('2026-05-01T09:00:00.000Z');
  });

  it('clamps and rolls monthly schedules into the next month when needed', () => {
    const nextRunAt = computeNextRunAt({
      frequency: 'monthly',
      timezone: 'UTC',
      hour: 9,
      minute: 0,
      dayOfMonth: 31,
      fromDate: new Date('2026-01-30T10:00:00.000Z'),
    });

    expect(nextRunAt.toISOString()).toBe('2026-02-28T09:00:00.000Z');
  });

  it('rejects invalid timezones', () => {
    expect(() => validateTimezone('Mars/Olympus_Mons')).toThrow('Invalid timezone');
  });

  it('rejects weekly day values outside the valid range', () => {
    expect(() => validateScheduleFields('weekly', -1, null)).toThrow(
      'day_of_week must be between 0 and 6'
    );
    expect(() => validateScheduleFields('weekly', 7, null)).toThrow(
      'day_of_week must be between 0 and 6'
    );
  });

  it('rejects monthly day values outside the supported range', () => {
    expect(() => validateScheduleFields('monthly', null, 0)).toThrow(
      'day_of_month must be between 1 and 28'
    );
    expect(() => validateScheduleFields('monthly', null, 29)).toThrow(
      'day_of_month must be between 1 and 28'
    );
  });

  it('accepts in-range weekly and monthly values', () => {
    expect(() => validateScheduleFields('weekly', 0, null)).not.toThrow();
    expect(() => validateScheduleFields('weekly', 6, null)).not.toThrow();
    expect(() => validateScheduleFields('monthly', null, 1)).not.toThrow();
    expect(() => validateScheduleFields('monthly', null, 28)).not.toThrow();
  });

  it('allows null and undefined optional day fields', () => {
    expect(() => validateScheduleFields('weekly', null, undefined)).not.toThrow();
    expect(() => validateScheduleFields('weekly', undefined, null)).not.toThrow();
    expect(() => validateScheduleFields('monthly', null, null)).not.toThrow();
    expect(() => validateScheduleFields('monthly', undefined, undefined)).not.toThrow();
  });
});
