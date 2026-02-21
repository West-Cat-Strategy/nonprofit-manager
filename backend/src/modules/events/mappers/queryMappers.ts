import { EventStatus, EventType, RegistrationStatus } from '@app-types/event';

export const parseEventType = (value: unknown): EventType | undefined => {
  if (typeof value !== 'string') return undefined;
  return Object.values(EventType).includes(value as EventType) ? (value as EventType) : undefined;
};

export const parseEventStatus = (value: unknown): EventStatus | undefined => {
  if (typeof value !== 'string') return undefined;
  return Object.values(EventStatus).includes(value as EventStatus) ? (value as EventStatus) : undefined;
};

export const parseRegistrationStatus = (value: unknown): RegistrationStatus | undefined => {
  if (typeof value !== 'string') return undefined;
  return Object.values(RegistrationStatus).includes(value as RegistrationStatus)
    ? (value as RegistrationStatus)
    : undefined;
};

export const parseBooleanQuery = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
};

export const parsePositiveInt = (value: unknown): number | undefined => {
  if (typeof value !== 'string') return undefined;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) return undefined;
  return parsed;
};

export const parseOptionalDateInput = (value: unknown): Date | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (value instanceof Date) return value;
  if (typeof value === 'string') return new Date(value);
  return undefined;
};
