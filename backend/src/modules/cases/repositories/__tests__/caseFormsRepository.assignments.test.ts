import pool from '@config/database';
import {
  listAssignmentsForPortal,
  markAssignmentSent,
  updateAssignment,
} from '../caseFormsRepository.assignments';

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

const queryMock = pool.query as jest.Mock;

const assignmentRow = {
  id: 'assignment-1',
  case_id: 'case-1',
  contact_id: 'contact-1',
  scoped_account_id: 'org-1',
  case_type_id: null,
  source_default_id: null,
  source_default_version: null,
  title: 'Housing Intake',
  description: 'Collect current housing details.',
  status: 'sent',
  schema: {
    version: 1,
    title: 'Housing Intake',
    sections: [],
  },
  current_draft_answers: {},
  last_draft_saved_at: null,
  due_at: null,
  recipient_email: 'client@example.com',
  delivery_target: null,
  sent_at: null,
  viewed_at: null,
  submitted_at: null,
  reviewed_at: null,
  closed_at: null,
  created_at: new Date('2026-04-16T12:00:00.000Z'),
  updated_at: new Date('2026-04-16T12:00:00.000Z'),
  created_by: 'staff-creator',
  updated_by: 'reviewer-1',
  case_number: 'CASE-001',
  case_title: 'Housing support',
  contact_first_name: 'Client',
  contact_last_name: 'Person',
  client_viewable: true,
  case_assigned_to: 'case-worker-1',
  review_follow_up_id: null,
  latest_submission: null,
};

describe('caseFormsRepository.assignments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('preserves updated_by when userId is omitted', async () => {
    queryMock.mockResolvedValueOnce({ rows: [assignmentRow] });

    await expect(updateAssignment(pool, 'assignment-1', { status: 'sent' })).resolves.toMatchObject({
      id: 'assignment-1',
      status: 'sent',
      updated_by: 'reviewer-1',
    });

    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toContain('status = $1');
    expect(sql).not.toContain('updated_by =');
    expect(params).toEqual(['sent', 'assignment-1']);
  });

  it('writes updated_by when userId is explicitly null', async () => {
    queryMock.mockResolvedValueOnce({ rows: [assignmentRow] });

    await expect(updateAssignment(pool, 'assignment-1', { status: 'sent', userId: null })).resolves.toMatchObject({
      id: 'assignment-1',
      status: 'sent',
    });

    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toContain('updated_by = $2');
    expect(params).toEqual(['sent', null, 'assignment-1']);
  });

  it('marks sent_at through the shared assignment helper', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    await markAssignmentSent(pool, 'assignment-1');

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('SET sent_at = NOW(),'),
      ['assignment-1']
    );
  });

  it('expands the active portal status bucket to the portal-editable statuses', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    await expect(listAssignmentsForPortal(pool, 'contact-1', 'active')).resolves.toEqual([]);

    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toContain('cfa.status = ANY($2::text[])');
    expect(params).toEqual([
      'contact-1',
      ['draft', 'sent', 'viewed', 'in_progress', 'submitted'],
    ]);
  });

  it('expands the completed portal status bucket to the terminal statuses', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    await expect(listAssignmentsForPortal(pool, 'contact-1', 'completed')).resolves.toEqual([]);

    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toContain('cfa.status = ANY($2::text[])');
    expect(params).toEqual([
      'contact-1',
      ['reviewed', 'closed', 'expired', 'cancelled'],
    ]);
  });

  it('keeps exact portal statuses as a single-status filter', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    await expect(listAssignmentsForPortal(pool, 'contact-1', 'submitted')).resolves.toEqual([]);

    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toContain('cfa.status = ANY($2::text[])');
    expect(params).toEqual(['contact-1', ['submitted']]);
  });
});
