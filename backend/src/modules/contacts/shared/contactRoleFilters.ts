import type { ContactRoleFilter } from '@app-types/contact';

export const CONTACT_ROLE_FILTER_NAME_MAP: Record<ContactRoleFilter, string[]> = {
  client: ['Client'],
  donor: ['Donor'],
  support_person: ['Support Person'],
  staff: ['Staff', 'Executive Director'],
  volunteer: ['Volunteer'],
  board: ['Board Member'],
};

export const isContactRoleFilter = (value: unknown): value is ContactRoleFilter =>
  typeof value === 'string' &&
  Object.prototype.hasOwnProperty.call(CONTACT_ROLE_FILTER_NAME_MAP, value);

export const normalizeContactRoleFilter = (
  value: unknown
): ContactRoleFilter | undefined => (isContactRoleFilter(value) ? value : undefined);

export const resolveContactRoleNames = (role: ContactRoleFilter): string[] =>
  CONTACT_ROLE_FILTER_NAME_MAP[role];
