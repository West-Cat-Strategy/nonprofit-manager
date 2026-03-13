// Mock database pool and logger before imports
const mockQuery = jest.fn();
const mockCreateCaseWorkflowArtifacts = jest.fn();

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: { query: mockQuery },
}));

jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../services/caseWorkflowService', () => ({
  createCaseWorkflowArtifacts: (...args: unknown[]) => mockCreateCaseWorkflowArtifacts(...args),
}));

import { Pool } from 'pg';
import { CaseService } from '../../services/caseService';

describe('CaseService', () => {
  let service: CaseService;
  let mockPool: jest.Mocked<Pick<Pool, 'query' | 'connect'>>;

  beforeEach(() => {
    mockQuery.mockReset();
    mockCreateCaseWorkflowArtifacts.mockReset();
    mockPool = {
      query: mockQuery,
      connect: jest.fn(),
    } as jest.Mocked<Pick<Pool, 'query' | 'connect'>>;
    service = new CaseService(mockPool as unknown as Pool);
  });

  // ─── createCase ────────────────────────────────────────────────────────────

  describe('createCase', () => {
    const validInput = {
      contact_id: 'contact-1',
      case_type_id: 'type-1',
      title: 'Needs housing assistance',
      priority: 'high' as const,
    };

    it('creates a case and logs an initial note', async () => {
      const mockCase = { id: 'case-uuid', case_number: 'CASE-240101-12345', ...validInput };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })             // generateCaseNumber count
        .mockResolvedValueOnce({ rows: [{ id: 'status-intake' }] })   // status lookup
        .mockResolvedValueOnce({ rows: [mockCase] })                   // INSERT cases
        .mockResolvedValueOnce({ rows: [] });                          // INSERT case_notes

      const result = await service.createCase(validInput, 'user-1');

      expect(result).toEqual(mockCase);
      expect(mockQuery).toHaveBeenCalledTimes(4);

      // Status lookup uses 'intake' type
      expect(mockQuery.mock.calls[1][0]).toMatch(/intake/);

      // Initial note is created
      expect(mockQuery.mock.calls[3][0]).toMatch(/case_notes/);
      expect(mockQuery.mock.calls[3][1]).toContain('Case created');
    });

    it('throws when no active intake status exists', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // generateCaseNumber count
        .mockResolvedValueOnce({ rows: [] }); // no status found

      await expect(service.createCase(validInput, 'user-1')).rejects.toThrow(
        'No active intake status found'
      );
    });

    it('generates a case number matching CASE-YYMMDD-NNNNN format', async () => {
      const mockCase = { id: 'case-uuid', case_number: 'CASE-240615-00001', ...validInput };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })             // generateCaseNumber count
        .mockResolvedValueOnce({ rows: [{ id: 'status-intake' }] })
        .mockResolvedValueOnce({ rows: [mockCase] })
        .mockResolvedValueOnce({ rows: [] });

      await service.createCase(validInput);

      // The second positional param to the INSERT is the generated case number
      const insertCall = mockQuery.mock.calls[2];
      const caseNumber = insertCall[1][0] as string;
      expect(caseNumber).toMatch(/^CASE-\d{6}-\d{5}$/);
    });

    it('defaults priority to "medium" when omitted', async () => {
      const input = { contact_id: 'c-1', case_type_id: 't-1', title: 'Test' };
      const mockCase = { id: 'case-uuid', case_number: 'CASE-240101-00001', ...input };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })             // generateCaseNumber count
        .mockResolvedValueOnce({ rows: [{ id: 'status-intake' }] })
        .mockResolvedValueOnce({ rows: [mockCase] })
        .mockResolvedValueOnce({ rows: [] });

      await service.createCase(input);

      const insertParams = mockQuery.mock.calls[2][1] as unknown[];
      // priority is at index 7 (0-based) in the INSERT params
      expect(insertParams[7]).toBe('medium');
    });
  });

  // ─── getCases ──────────────────────────────────────────────────────────────

  describe('getCases', () => {
    it('returns cases and total with no filter', async () => {
      const mockCases = [{ id: 'c1', title: 'Case 1', total_count: 1 }];

      mockQuery.mockResolvedValueOnce({ rows: mockCases });

      const result = await service.getCases();

      expect(result.total).toBe(1);
      expect(result.cases).toEqual([{ id: 'c1', title: 'Case 1' }]);
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('returns 0 cases for an empty result set', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await service.getCases({ search: 'notfound' });
      expect(result.total).toBe(0);
      expect(result.cases).toHaveLength(0);
    });

    it('applies contact_id filter', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'c1', total_count: 1 }] });

      await service.getCases({ contact_id: 'contact-uuid' });

      const querySql = mockQuery.mock.calls[0][0] as string;
      const queryParams = mockQuery.mock.calls[0][1] as unknown[];
      expect(queryParams).toContain('contact-uuid');
      expect(querySql).toMatch(/contact_id/);
    });

    it('defaults to page 1, limit 20 and sorts by created_at DESC', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await service.getCases();

      const dataSql = mockQuery.mock.calls[0][0] as string;
      const dataParams = mockQuery.mock.calls[0][1] as unknown[];

      // Limit = 20, offset = 0
      expect(dataParams.slice(-2)).toEqual([20, 0]);
      expect(dataSql).toMatch(/ORDER BY created_at DESC/);
    });

    it('applies search filter across case_number, title, and description', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await service.getCases({ search: 'housing' });

      const querySql = mockQuery.mock.calls[0][0] as string;
      const queryParams = mockQuery.mock.calls[0][1] as string[];
      expect(querySql).toContain("concat_ws(' ', c.case_number, c.title, c.description)");
      expect(queryParams.some((p) => p.includes('housing'))).toBe(true);
    });
  });

  // ─── getCaseById ───────────────────────────────────────────────────────────

  describe('getCaseById', () => {
    it('returns the case when found', async () => {
      const mockCase = { id: 'case-1', title: 'Housing', status_name: 'Intake' };
      mockQuery.mockResolvedValueOnce({ rows: [mockCase] });

      const result = await service.getCaseById('case-1');
      expect(result).toEqual(mockCase);
      expect(mockQuery.mock.calls[0][1]).toEqual(['case-1']);
    });

    it('returns null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await service.getCaseById('nonexistent');
      expect(result).toBeNull();
    });
  });

  // ─── updateCase ────────────────────────────────────────────────────────────

  describe('updateCase', () => {
    it('builds SET clause only for provided fields', async () => {
      const updated = { id: 'case-1', title: 'New Title' };
      mockQuery.mockResolvedValueOnce({ rows: [updated] });

      const result = await service.updateCase('case-1', { title: 'New Title' }, 'user-1');

      expect(result).toEqual(updated);
      const sql = mockQuery.mock.calls[0][0] as string;
      expect(sql).toMatch(/title = \$1/);
      // Should not include fields not provided
      expect(sql).not.toMatch(/description/);
      expect(sql).not.toMatch(/priority/);
    });

    it('always includes modified_by and updated_at', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'case-1' }] });

      await service.updateCase('case-1', { title: 'T' }, 'editor-user');

      const sql = mockQuery.mock.calls[0][0] as string;
      const params = mockQuery.mock.calls[0][1] as unknown[];

      expect(sql).toMatch(/modified_by/);
      expect(sql).toMatch(/updated_at = NOW\(\)/);
      expect(params).toContain('editor-user');
    });
  });

  // ─── updateCaseStatus ──────────────────────────────────────────────────────

  describe('updateCaseStatus', () => {
    it('fetches current status, updates it, and inserts a status_change note', async () => {
      const updatedCase = { id: 'case-1', status_id: 'status-new' };
      const client = {
        query: jest
          .fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rows: [{ status_id: 'status-old' }] }) // current status fetch
          .mockResolvedValueOnce({
            rows: [{ id: 'status-new', name: 'Active', status_type: 'active' }],
          }) // next status lookup
          .mockResolvedValueOnce({ rows: [updatedCase] }) // UPDATE cases
          .mockResolvedValueOnce({}), // COMMIT
        release: jest.fn(),
      };
      mockPool.connect.mockResolvedValueOnce(client as never);

      const result = await service.updateCaseStatus(
        'case-1',
        { new_status_id: 'status-new', notes: 'Escalated' },
        'user-1'
      );

      expect(result).toEqual(updatedCase);
      expect(client.query).toHaveBeenCalledWith('COMMIT');
      expect(client.release).toHaveBeenCalled();
      expect(mockCreateCaseWorkflowArtifacts).toHaveBeenCalledWith(
        client,
        expect.objectContaining({
          caseId: 'case-1',
          userId: 'user-1',
          note: expect.objectContaining({
            noteType: 'status_change',
            content: 'Escalated',
            previousStatusId: 'status-old',
            newStatusId: 'status-new',
          }),
          outcomes: undefined,
        })
      );
    });
  });

  // ─── getCaseSummary ────────────────────────────────────────────────────────

  describe('getCaseSummary', () => {
    it('returns summary statistics accurately', async () => {
      const mockStats = {
        rows: [{
          total_cases: '10',
          open_cases: '5',
          closed_cases: '5',
          priority_low: '2',
          priority_medium: '3',
          priority_high: '4',
          priority_urgent: '1',
          status_intake: '1',
          status_active: '2',
          status_review: '2',
          status_closed: '4',
          status_cancelled: '1',
          due_this_week: '2',
          overdue: '1',
          unassigned: '1',
          avg_duration: '5.5',
        }]
      };
      const mockTypeStats = {
        rows: [
          { name: 'Legal', count: '6' },
          { name: 'Health', count: '4' },
        ]
      };

      mockQuery
        .mockResolvedValueOnce(mockStats)
        .mockResolvedValueOnce(mockTypeStats);

      const result = await service.getCaseSummary();

      expect(result.total_cases).toBe(10);
      expect(result.open_cases).toBe(5);
      expect(result.by_case_type['Legal']).toBe(6);
      expect(result.by_case_type['Health']).toBe(4);
      expect(result.average_case_duration_days).toBe(6); // rounded 5.5
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('applies organization scope when organizationId is provided', async () => {
      const mockStats = {
        rows: [{
          total_cases: '1',
          open_cases: '1',
          closed_cases: '0',
          priority_low: '0',
          priority_medium: '1',
          priority_high: '0',
          priority_urgent: '0',
          status_intake: '1',
          status_active: '0',
          status_review: '0',
          status_closed: '0',
          status_cancelled: '0',
          due_this_week: '0',
          overdue: '0',
          unassigned: '1',
          avg_duration: null,
        }]
      };
      const mockTypeStats = { rows: [{ name: 'Housing', count: '1' }] };

      mockQuery
        .mockResolvedValueOnce(mockStats)
        .mockResolvedValueOnce(mockTypeStats);

      await service.getCaseSummary('org-42');

      const summarySql = mockQuery.mock.calls[0][0] as string;
      const summaryParams = mockQuery.mock.calls[0][1] as unknown[];
      const typeSql = mockQuery.mock.calls[1][0] as string;
      const typeParams = mockQuery.mock.calls[1][1] as unknown[];

      expect(summarySql).toContain('COALESCE(c.account_id, con.account_id) = $1');
      expect(typeSql).toContain('COALESCE(c.account_id, con.account_id) = $1');
      expect(summaryParams).toEqual(['org-42']);
      expect(typeParams).toEqual(['org-42']);
    });
  });

  // ─── reassignCase ──────────────────────────────────────────────────────────

  describe('reassignCase', () => {
    it('updates assignee and records history', async () => {
      const updatedCase = { id: 'case-1', assigned_to: 'user-new' };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ assigned_to: 'user-old' }] }) // current assignment
        .mockResolvedValueOnce({ rows: [] })                           // update history (unassign)
        .mockResolvedValueOnce({ rows: [] })                           // insert history (assign)
        .mockResolvedValueOnce({ rows: [updatedCase] })               // update case
        .mockResolvedValueOnce({ rows: [] });                         // insert note

      const result = await service.reassignCase('case-1', 'user-new', 'Project shift', 'admin-1');

      expect(result).toEqual(updatedCase);
      expect(mockQuery).toHaveBeenCalledTimes(5);
      expect(mockQuery.mock.calls[4][1]).toContain('Case reassigned: Project shift');
    });
  });
});
