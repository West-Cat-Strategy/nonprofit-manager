const toValidDate = (value: string | null | undefined): Date | null => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatWithOptions = (
  date: Date,
  options: Intl.DateTimeFormatOptions
): string => new Intl.DateTimeFormat(undefined, options).format(date);

export const formatPortalOptionalDateTime = (
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: 'medium',
    timeStyle: 'short',
  }
): string | null => {
  const date = toValidDate(value);
  return date ? formatWithOptions(date, options) : null;
};

export const formatPortalDateTime = (
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: 'medium',
    timeStyle: 'short',
  },
  fallback = 'Not available'
): string => formatPortalOptionalDateTime(value, options) ?? fallback;

export const formatPortalDate = (
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: 'medium',
  },
  fallback = 'Date TBD'
): string => formatPortalOptionalDateTime(value, options) ?? fallback;

export const formatPortalDateRange = (
  start: string | null | undefined,
  end: string | null | undefined
): string => {
  const startLabel = formatPortalOptionalDateTime(start);
  const endLabel = formatPortalOptionalDateTime(end);

  if (!startLabel && !endLabel) {
    return 'Date TBD';
  }

  if (!startLabel) {
    return endLabel ?? 'Date TBD';
  }

  if (!endLabel) {
    return startLabel;
  }

  return `${startLabel} - ${endLabel}`;
};
