import type { Pool } from 'pg';
import { createCaseQuery, deleteCaseQuery, upsertCaseTypeAssignments } from '../lifecycleQueries';

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

describe('createCaseQuery trust-boundary validation', () => {
  const query = jest.fn();
  const db = { query } as unknown as Pool;

  beforeEach(() => {
    query.mockReset();
  });

  it('rejects explicit case account ids outside the active organization before data writes', async () => {
    await expect(
      createCaseQuery(
        db,
        {
          contact_id: 'contact-1',
          account_id: 'org-2',
          case_type_id: 'type-1',
          title: 'Housing support',
        },
        'user-1',
        'org-1'
      )
    ).rejects.toMatchObject({
      message: 'Account not found',
      statusCode: 404,
    });

    expect(query).not.toHaveBeenCalled();
  });

  it('rejects contacts from another organization before creating a case', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 'contact-1', account_id: 'org-2' }] });

    await expect(
      createCaseQuery(
        db,
        {
          contact_id: 'contact-1',
          case_type_id: 'type-1',
          title: 'Housing support',
        },
        'user-1',
        'org-1'
      )
    ).rejects.toMatchObject({
      message: 'Contact not found',
      statusCode: 404,
    });

    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('FROM contacts'), ['contact-1']);
  });

  it('defaults null-account contacts to the active organization when creating a case', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ id: 'contact-1', account_id: null }] })
      .mockResolvedValueOnce({ rows: [{ id: 'status-1' }] })
      .mockResolvedValueOnce({
        rows: [{ id: 'case-1', account_id: 'org-1', case_number: 'CASE-1' }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(
      createCaseQuery(
        db,
        {
          contact_id: 'contact-1',
          case_type_id: 'type-1',
          title: 'Housing support',
        },
        'user-1',
        'org-1'
      )
    ).resolves.toMatchObject({ id: 'case-1', account_id: 'org-1' });

    const insertParams = query.mock.calls[2][1] as unknown[];
    expect(query.mock.calls[2][0]).toEqual(expect.stringContaining('INSERT INTO cases'));
    expect(insertParams[1]).toBe('contact-1');
    expect(insertParams[2]).toBe('org-1');
  });
});

describe('deleteCaseQuery', () => {
  it('deletes the owned case without relying on nonexistent soft-delete columns', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ id: 'case-1' }] })
      .mockResolvedValueOnce({ rows: [] });
    const db = { query } as unknown as Pool;

    await deleteCaseQuery(db, 'case-1', 'org-1');

    expect(query).toHaveBeenNthCalledWith(
      2,
      'DELETE FROM cases WHERE id = $1',
      ['case-1']
    );
  });
});
