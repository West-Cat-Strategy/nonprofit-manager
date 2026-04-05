import type { Pool } from 'pg';
import { upsertCaseTypeAssignments } from '../lifecycleQueries';

describe('upsertCaseTypeAssignments', () => {
  it('upserts case type assignments idempotently in sort order', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [] });
    const db = { query } as unknown as Pool;

    await upsertCaseTypeAssignments(db, 'case-1', ['type-a', 'type-b', 'type-a', ''], 'user-1');

    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('WITH ORDINALITY');
    expect(sql).toContain('ON CONFLICT (case_id, case_type_id) DO UPDATE');
    expect(params).toEqual(['case-1', 'user-1', ['type-a', 'type-b']]);
  });

  it('skips empty assignment lists', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [] });
    const db = { query } as unknown as Pool;

    await upsertCaseTypeAssignments(db, 'case-1', [], 'user-1');

    expect(query).not.toHaveBeenCalled();
  });
});
