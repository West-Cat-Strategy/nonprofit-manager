import type { ScheduledReportFrequency } from '@app-types/scheduledReport';

interface TimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const partsFormatterCache = new Map<string, Intl.DateTimeFormat>();

const weekdayToNumber: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const getFormatter = (timeZone: string): Intl.DateTimeFormat => {
  const cached = partsFormatterCache.get(timeZone);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
  });

  partsFormatterCache.set(timeZone, formatter);
  return formatter;
};

const getTimeParts = (date: Date, timeZone: string): TimeParts & { weekday: number } => {
  const formatter = getFormatter(timeZone);
  const parts = formatter.formatToParts(date);

  const values: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') values[part.type] = part.value;
  }

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
    weekday: weekdayToNumber[values.weekday] ?? 0,
  };
};

const comparableFromParts = (parts: TimeParts): number =>
  Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);

const partsToUtcDate = (parts: TimeParts, timeZone: string): Date => {
  let candidate = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  );

  for (let i = 0; i < 3; i += 1) {
    const actual = getTimeParts(candidate, timeZone);
    const diff = comparableFromParts(parts) - comparableFromParts(actual);
    if (diff === 0) break;
    candidate = new Date(candidate.getTime() + diff);
  }

  return candidate;
};

const addDays = (parts: TimeParts, days: number): TimeParts => {
  const date = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  );
  date.setUTCDate(date.getUTCDate() + days);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
  };
};

const addMonths = (parts: TimeParts, months: number): TimeParts => {
  const date = new Date(
    Date.UTC(parts.year, parts.month - 1, 1, parts.hour, parts.minute, parts.second)
  );
  date.setUTCMonth(date.getUTCMonth() + months);

  const maxDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)
  ).getUTCDate();
  const targetDay = Math.min(parts.day, maxDay);
  date.setUTCDate(targetDay);

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
  };
};

export const computeNextRunAt = (input: {
  frequency: ScheduledReportFrequency;
  timezone: string;
  hour: number;
  minute: number;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  fromDate?: Date;
}): Date => {
  const now = input.fromDate || new Date();
  const nowParts = getTimeParts(now, input.timezone);

  let candidate: TimeParts = {
    year: nowParts.year,
    month: nowParts.month,
    day: nowParts.day,
    hour: input.hour,
    minute: input.minute,
    second: 0,
  };

  if (input.frequency === 'weekly') {
    const targetWeekday = input.dayOfWeek ?? 1;
    const diff = (targetWeekday - nowParts.weekday + 7) % 7;
    candidate = addDays(candidate, diff);
    if (comparableFromParts(candidate) <= comparableFromParts(nowParts)) {
      candidate = addDays(candidate, 7);
    }
    return partsToUtcDate(candidate, input.timezone);
  }

  if (input.frequency === 'monthly') {
    const targetDay = input.dayOfMonth ?? 1;
    const safeDay = Math.max(1, Math.min(28, targetDay));
    candidate.day = safeDay;

    if (comparableFromParts(candidate) <= comparableFromParts(nowParts)) {
      candidate = addMonths(candidate, 1);
      candidate.day = safeDay;
    }
    return partsToUtcDate(candidate, input.timezone);
  }

  if (comparableFromParts(candidate) <= comparableFromParts(nowParts)) {
    candidate = addDays(candidate, 1);
  }

  return partsToUtcDate(candidate, input.timezone);
};

export const validateTimezone = (timezone: string): void => {
  try {
    Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
  } catch {
    throw new Error('Invalid timezone');
  }
};

export const validateScheduleFields = (
  frequency: ScheduledReportFrequency,
  dayOfWeek: number | null | undefined,
  dayOfMonth: number | null | undefined
): void => {
  if (frequency === 'weekly' && dayOfWeek !== null && dayOfWeek !== undefined) {
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      throw new Error('day_of_week must be between 0 and 6');
    }
  }

  if (frequency === 'monthly' && dayOfMonth !== null && dayOfMonth !== undefined) {
    if (dayOfMonth < 1 || dayOfMonth > 28) {
      throw new Error('day_of_month must be between 1 and 28');
    }
  }
};
