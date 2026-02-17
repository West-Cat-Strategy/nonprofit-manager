import { resolveSort } from '../../utils/queryHelpers';

describe('resolveSort', () => {
  const sortColumnMap = {
    created_at: 'created_at',
    name: 'name',
  };

  it('uses default when sort key is unknown', () => {
    const result = resolveSort('unknown', 'asc', sortColumnMap, 'created_at');
    expect(result.sortColumn).toBe('created_at');
    expect(result.sortOrder).toBe('ASC');
  });

  it('uses default when sort key is missing', () => {
    const result = resolveSort(undefined, 'desc', sortColumnMap, 'created_at');
    expect(result.sortColumn).toBe('created_at');
    expect(result.sortOrder).toBe('DESC');
  });

  it('accepts allowlisted sort keys', () => {
    const result = resolveSort('name', 'asc', sortColumnMap, 'created_at');
    expect(result.sortColumn).toBe('name');
    expect(result.sortOrder).toBe('ASC');
  });

  it('normalizes invalid sort order to DESC', () => {
    const result = resolveSort('name', 'invalid', sortColumnMap, 'created_at');
    expect(result.sortColumn).toBe('name');
    expect(result.sortOrder).toBe('DESC');
  });
});
