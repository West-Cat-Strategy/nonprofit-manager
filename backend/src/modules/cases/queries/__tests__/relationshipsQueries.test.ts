const requireCaseOwnershipMock = jest.fn();
const requireCaseIdForRelationshipMock = jest.fn();

jest.mock('@config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../shared', () => ({
  requireCaseOwnership: (...args: unknown[]) => requireCaseOwnershipMock(...args),
  requireCaseIdForRelationship: (...args: unknown[]) => requireCaseIdForRelationshipMock(...args),
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
    requireCaseOwnershipMock.mockReset();
    requireCaseOwnershipMock.mockResolvedValue({
      case_id: 'case-1',
      contact_id: 'contact-1',
      account_id: null,
    });
    requireCaseIdForRelationshipMock.mockReset();
    requireCaseIdForRelationshipMock.mockResolvedValue('case-1');
  });

  it('lists relationships for a case', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 'rel-1' }] });

    const result = await getCaseRelationshipsQuery(db, 'case-1');

    expect(result).toEqual([{ id: 'rel-1' }]);
    expect(requireCaseOwnershipMock).toHaveBeenCalledWith(db, 'case-1', undefined);
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
    expect(requireCaseOwnershipMock).toHaveBeenNthCalledWith(1, db, 'case-1', undefined);
    expect(requireCaseOwnershipMock).toHaveBeenNthCalledWith(2, db, 'case-2', undefined);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO case_relationships'),
      ['case-1', 'case-2', 'related', 'linked case', 'user-1']
    );
  });

  it('deletes a relationship', async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await deleteCaseRelationshipQuery(db, 'rel-1');

    expect(requireCaseIdForRelationshipMock).toHaveBeenCalledWith(db, 'rel-1', undefined);
    expect(requireCaseOwnershipMock).toHaveBeenCalledWith(db, 'case-1', undefined);
    expect(query).toHaveBeenCalledWith('DELETE FROM case_relationships WHERE id = $1', ['rel-1']);
  });
});
