import type { ContactFilters, PaginationParams } from '@app-types/contact';
import { extractPagination, getBoolean, getString } from '@utils/queryHelpers';
import { normalizeContactRoleFilter } from './contactRoleFilters';

export const parseContactTagsFilter = (value: unknown): string[] | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const tags = value
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  return tags.length > 0 ? tags : undefined;
};

export const parseContactListFilters = (query: Record<string, unknown>): ContactFilters => ({
  search: getString(query.search)?.trim() || undefined,
  role: normalizeContactRoleFilter(query.role),
  account_id: getString(query.account_id)?.trim() || undefined,
  is_active: getBoolean(query.is_active),
  tags: parseContactTagsFilter(query.tags),
});

export const parseContactPagination = (query: Record<string, unknown>): PaginationParams =>
  extractPagination(query);
