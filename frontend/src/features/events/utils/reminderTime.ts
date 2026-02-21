export type ReminderRelativeUnit = 'minutes' | 'hours' | 'days';

export const getBrowserTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

export const toRelativeDisplay = (
  minutes: number | null
): { value: number; unit: ReminderRelativeUnit } => {
  if (!minutes || minutes <= 0) {
    return { value: 60, unit: 'minutes' };
  }

  if (minutes % 1440 === 0) {
    return { value: minutes / 1440, unit: 'days' };
  }

  if (minutes % 60 === 0) {
    return { value: minutes / 60, unit: 'hours' };
  }

  return { value: minutes, unit: 'minutes' };
};

export const toMinutes = (value: number, unit: ReminderRelativeUnit): number => {
  if (unit === 'days') return value * 24 * 60;
  if (unit === 'hours') return value * 60;
  return value;
};

const parseDateTimeLocalInput = (
  value: string
): { year: number; month: number; day: number; hour: number; minute: number } | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const [, yearRaw, monthRaw, dayRaw, hourRaw, minuteRaw] = match;
  return {
    year: Number.parseInt(yearRaw, 10),
    month: Number.parseInt(monthRaw, 10),
    day: Number.parseInt(dayRaw, 10),
    hour: Number.parseInt(hourRaw, 10),
    minute: Number.parseInt(minuteRaw, 10),
  };
};

const getTimeZoneOffsetMinutes = (timeZone: string, date: Date): number => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== 'literal') {
        acc[part.type] = part.value;
      }
      return acc;
    }, {});

  const asUtc = Date.UTC(
    Number.parseInt(parts.year, 10),
    Number.parseInt(parts.month, 10) - 1,
    Number.parseInt(parts.day, 10),
    Number.parseInt(parts.hour, 10),
    Number.parseInt(parts.minute, 10),
    Number.parseInt(parts.second, 10)
  );

  return (asUtc - date.getTime()) / 60000;
};

export const convertZonedDateTimeToUtcIso = (localDateTime: string, timeZone: string): string => {
  const parsed = parseDateTimeLocalInput(localDateTime);
  if (!parsed) {
    throw new Error('Exact reminder datetime must be valid');
  }

  const utcGuess = Date.UTC(parsed.year, parsed.month - 1, parsed.day, parsed.hour, parsed.minute, 0);

  const firstOffset = getTimeZoneOffsetMinutes(timeZone, new Date(utcGuess));
  let utcTimestamp = utcGuess - firstOffset * 60_000;

  const secondOffset = getTimeZoneOffsetMinutes(timeZone, new Date(utcTimestamp));
  if (secondOffset !== firstOffset) {
    utcTimestamp = utcGuess - secondOffset * 60_000;
  }

  return new Date(utcTimestamp).toISOString();
};

export const formatDateTimeLocalInTimeZone = (value: string, timeZone: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== 'literal') {
        acc[part.type] = part.value;
      }
      return acc;
    }, {});

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

export const formatRelativeTiming = (minutes: number | null): string => {
  if (!minutes || minutes <= 0) {
    return 'Invalid relative timing';
  }

  if (minutes % 1440 === 0) {
    const days = minutes / 1440;
    return `${days} day${days === 1 ? '' : 's'} before event start`;
  }

  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} hour${hours === 1 ? '' : 's'} before event start`;
  }

  return `${minutes} minute${minutes === 1 ? '' : 's'} before event start`;
};

export const formatExactReminderTime = (isoDate: string | null, timeZone: string): string => {
  if (!isoDate) return 'No datetime configured';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Invalid datetime';

  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone,
      timeZoneName: 'short',
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
};
