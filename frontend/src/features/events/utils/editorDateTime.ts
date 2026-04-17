import { addHours, format, isValid, parse } from 'date-fns';

const DATE_TIME_LOCAL_FORMAT = "yyyy-MM-dd'T'HH:mm";

const DATE_TIME_LOCAL_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export const toDateTimeLocalValue = (value: string | null | undefined): string => {
  if (!value) {
    return '';
  }

  if (DATE_TIME_LOCAL_PATTERN.test(value)) {
    return value;
  }

  return value.length >= 16 ? value.slice(0, 16) : '';
};

export const parseDateTimeLocalValue = (value: string): Date | null => {
  if (!DATE_TIME_LOCAL_PATTERN.test(value)) {
    return null;
  }

  const parsed = parse(value, DATE_TIME_LOCAL_FORMAT, new Date());
  return isValid(parsed) ? parsed : null;
};

export const addHoursToDateTimeLocalValue = (value: string, hours: number): string => {
  const parsed = parseDateTimeLocalValue(value);
  if (!parsed) {
    return '';
  }

  return format(addHours(parsed, hours), DATE_TIME_LOCAL_FORMAT);
};
