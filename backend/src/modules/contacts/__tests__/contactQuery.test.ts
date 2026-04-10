import { parseContactListFilters, parseContactPagination, parseContactTagsFilter } from '../shared/contactQuery';

describe('contact query helpers', () => {
  it('normalizes list filters from mixed query input', () => {
    const filters = parseContactListFilters({
      search: '  Taylor  ',
      role: 'staff',
      account_id: ' account-1 ',
      is_active: 'true',
      tags: 'alpha, beta , , gamma',
    });

    expect(filters).toEqual({
      search: 'Taylor',
      role: 'staff',
      account_id: 'account-1',
      is_active: true,
      tags: ['alpha', 'beta', 'gamma'],
    });
  });

  it('extracts pagination from generic query input', () => {
    expect(parseContactPagination({ page: '3', limit: '50' })).toEqual({
      page: 3,
      limit: 50,
    });
  });

  it('returns undefined for empty tag filters', () => {
    expect(parseContactTagsFilter(' , , ')).toBeUndefined();
  });
});
