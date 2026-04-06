jest.mock('@config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import type { Pool } from 'pg';
import {
  createCaseRelationshipQuery,
  deleteCaseRelationshipQuery,
  getCaseRelationshipsQuery,
} from '../relationshipsQueries';

describe('relationshipsQueries', () => {
  const query = jest.fn();
  const db = { query } as unknown as Pool;

  beforeEach(() => {
    query.mockReset();
  });

  it('lists relationships for a case', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 'rel-1' }] });

    const result = await getCaseRelationshipsQuery(db, 'case-1');

    expect(result).toEqual([{ id: 'rel-1' }]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('FROM case_relationships cr'), [
      'case-1',
    ]);
  });

  it('creates a relationship and returns the inserted row', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 'rel-1' }] });

    const result = await createCaseRelationshipQuery(
      db,
      'case-1',
      {
        related_case_id: 'case-2',
        relationship_type: 'related',
        description: 'linked case',
      },
      'user-1'
    );

    expect(result).toEqual({ id: 'rel-1' });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO case_relationships'),
      ['case-1', 'case-2', 'related', 'linked case', 'user-1']
    );
  });

  it('deletes a relationship', async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await deleteCaseRelationshipQuery(db, 'rel-1');

    expect(query).toHaveBeenCalledWith('DELETE FROM case_relationships WHERE id = $1', ['rel-1']);
  });
});
