// Mock database pool and logger before imports
const mockQuery = jest.fn();

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

import { Pool } from 'pg';
import { CaseService } from '../../services/caseService';

describe('CaseService', () => {
  let service: CaseService;
  let mockPool: jest.Mocked<Pick<Pool, 'query'>>;

  beforeEach(() => {
    mockQuery.mockReset();
    mockPool = { query: mockQuery } as jest.Mocked<Pick<Pool, 'query'>>;
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
        .mockResolvedValueOnce({ rows: [{ id: 'status-intake' }] })   // status lookup
        .mockResolvedValueOnce({ rows: [mockCase] })                   // INSERT cases
        .mockResolvedValueOnce({ rows: [] });                          // INSERT case_notes

      const result = await service.createCase(validInput, 'user-1');

      expect(result).toEqual(mockCase);
      expect(mockQuery).toHaveBeenCalledTimes(3);

      // Status lookup uses 'intake' type
      expect(mockQuery.mock.calls[0][0]).toMatch(/intake/);

      // Initial note is created
      expect(mockQuery.mock.calls[2][0]).toMatch(/case_notes/);
      expect(mockQuery.mock.calls[2][1]).toContain('Case created');
    });

    it('throws when no active intake status exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }); // no status found

      await expect(service.createCase(validInput, 'user-1')).rejects.toThrow(
        'No active intake status found'
      );
    });

    it('generates a case number matching CASE-YYMMDD-NNNNN format', async () => {
      const mockCase = { id: 'case-uuid', case_number: 'CASE-240615-00001', ...validInput };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 'status-intake' }] })
        .mockResolvedValueOnce({ rows: [mockCase] })
        .mockResolvedValueOnce({ rows: [] });

      await service.createCase(validInput);

      // The first positional param to the INSERT is the generated case number
      const insertCall = mockQuery.mock.calls[1];
      const caseNumber = insertCall[1][0] as string;
      expect(caseNumber).toMatch(/^CASE-\d{6}-\d{5}$/);
    });

    it('defaults priority to "medium" when omitted', async () => {
      const input = { contact_id: 'c-1', case_type_id: 't-1', title: 'Test' };
      const mockCase = { id: 'case-uuid', case_number: 'CASE-240101-00001', ...input };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 'status-intake' }] })
        .mockResolvedValueOnce({ rows: [mockCase] })
        .mockResolvedValueOnce({ rows: [] });

      await service.createCase(input);

      const insertParams = mockQuery.mock.calls[1][1] as unknown[];
      // priority is at index 7 (0-based) in the INSERT params
      expect(insertParams[7]).toBe('medium');
    });
  });

  // ─── getCases ──────────────────────────────────────────────────────────────

  describe('getCases', () => {
    it('returns cases and total with no filter', async () => {
      const mockCases = [{ id: 'c1', title: 'Case 1' }];

      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // count
        .mockResolvedValueOnce({ rows: mockCases });        // data

      const result = await service.getCases();

      expect(result.total).toBe(1);
      expect(result.cases).toEqual(mockCases);
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('returns 0 cases for an empty result set', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.getCases({ search: 'notfound' });
      expect(result.total).toBe(0);
      expect(result.cases).toHaveLength(0);
    });

    it('applies contact_id filter', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'c1' }] });

      await service.getCases({ contact_id: 'contact-uuid' });

      const countSql = mockQuery.mock.calls[0][0] as string;
      const countParams = mockQuery.mock.calls[0][1] as unknown[];
      expect(countParams).toContain('contact-uuid');
      expect(countSql).toMatch(/contact_id/);
    });

    it('defaults to page 1, limit 20 and sorts by created_at DESC', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      await service.getCases();

      const dataSql = mockQuery.mock.calls[1][0] as string;
      const dataParams = mockQuery.mock.calls[1][1] as unknown[];

      // Limit = 20, offset = 0
      expect(dataParams.slice(-2)).toEqual([20, 0]);
      expect(dataSql).toMatch(/ORDER BY c\.created_at DESC/);
    });

    it('applies search filter across case_number, title, and description', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      await service.getCases({ search: 'housing' });

      const countParams = mockQuery.mock.calls[0][1] as string[];
      expect(countParams.some((p) => p.includes('housing'))).toBe(true);
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

      mockQuery
        .mockResolvedValueOnce({ rows: [{ status_id: 'status-old' }] }) // current status fetch
        .mockResolvedValueOnce({ rows: [updatedCase] })                   // UPDATE cases
        .mockResolvedValueOnce({ rows: [] });                             // INSERT note

      const result = await service.updateCaseStatus(
        'case-1',
        { new_status_id: 'status-new', notes: 'Escalated' },
        'user-1'
      );

      expect(result).toEqual(updatedCase);
      expect(mockQuery).toHaveBeenCalledTimes(3);

      // Note insert
      const noteSql = mockQuery.mock.calls[2][0] as string;
      const noteParams = mockQuery.mock.calls[2][1] as unknown[];
      expect(noteSql).toMatch(/status_change/);
      expect(noteParams).toContain('Escalated');
      expect(noteParams).toContain('status-old');
      expect(noteParams).toContain('status-new');
    });
  });
});
