const requireCaseOwnershipMock = jest.fn();
const requireCaseIdForMilestoneMock = jest.fn();

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
  requireCaseIdForMilestone: (...args: unknown[]) => requireCaseIdForMilestoneMock(...args),
}));

import type { Pool } from 'pg';
import {
  createCaseMilestoneQuery,
  deleteCaseMilestoneQuery,
  getCaseMilestonesQuery,
  updateCaseMilestoneQuery,
} from '../milestonesQueries';

describe('milestonesQueries', () => {
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
    requireCaseIdForMilestoneMock.mockReset();
    requireCaseIdForMilestoneMock.mockResolvedValue('case-1');
  });

  it('lists milestones for a case', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 'milestone-1' }] });

    const result = await getCaseMilestonesQuery(db, 'case-1');

    expect(result).toEqual([{ id: 'milestone-1' }]);
    expect(requireCaseOwnershipMock).toHaveBeenCalledWith(db, 'case-1', undefined);
    expect(query).toHaveBeenCalledWith(
      'SELECT * FROM case_milestones WHERE case_id = $1 ORDER BY sort_order, due_date',
      ['case-1']
    );
  });

  it('creates a milestone and returns the inserted row', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 'milestone-1' }] });

    const result = await createCaseMilestoneQuery(
      db,
      'case-1',
      {
        milestone_name: 'Initial review',
        description: 'Follow up',
        due_date: '2026-04-05',
        sort_order: 2,
      },
      'user-1'
    );

    expect(result).toEqual({ id: 'milestone-1' });
    expect(requireCaseOwnershipMock).toHaveBeenCalledWith(db, 'case-1', undefined);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO case_milestones'),
      ['case-1', 'Initial review', 'Follow up', '2026-04-05', 2, 'user-1']
    );
  });

  it('updates a milestone with only provided fields', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 'milestone-1' }] });

    const result = await updateCaseMilestoneQuery(db, 'milestone-1', {
      milestone_name: 'Updated',
      is_completed: true,
      sort_order: 3,
    });

    expect(result).toEqual({ id: 'milestone-1' });
    expect(requireCaseIdForMilestoneMock).toHaveBeenCalledWith(db, 'milestone-1', undefined);
    expect(requireCaseOwnershipMock).toHaveBeenCalledWith(db, 'case-1', undefined);
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('completed_date = CURRENT_DATE');
    expect(sql).toContain('sort_order = $3');
    expect(params).toEqual(['Updated', true, 3, 'milestone-1']);
  });

  it('deletes a milestone', async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await deleteCaseMilestoneQuery(db, 'milestone-1');

    expect(requireCaseIdForMilestoneMock).toHaveBeenCalledWith(db, 'milestone-1', undefined);
    expect(requireCaseOwnershipMock).toHaveBeenCalledWith(db, 'case-1', undefined);
    expect(query).toHaveBeenCalledWith('DELETE FROM case_milestones WHERE id = $1', ['milestone-1']);
  });
});
