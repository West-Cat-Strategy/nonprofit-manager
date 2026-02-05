/**
 * Saved Report Service Tests
 * Tests for saved report CRUD operations
 */

import { Pool, QueryResult } from 'pg';
import { SavedReportService } from '../../services/savedReportService';
import type { CreateSavedReportRequest, UpdateSavedReportRequest, SavedReport } from '../../types/savedReport';

// Create mock pool
const mockQuery = jest.fn();
const mockPool = {
  query: mockQuery,
} as unknown as Pool;

describe('SavedReportService', () => {
  let service: SavedReportService;
  const testUserId = 'test-user-123';
  const testReportId = 'test-report-456';

  beforeEach(() => {
    service = new SavedReportService(mockPool);
    jest.clearAllMocks();
  });

  const createMockReport = (overrides: Partial<SavedReport> = {}): SavedReport => ({
    id: testReportId,
    name: 'Test Report',
    description: 'Test description',
    entity: 'contacts',
    report_definition: {
      name: 'Test Report',
      entity: 'contacts',
      fields: ['first_name', 'last_name', 'email'],
    },
    is_public: false,
    created_by: testUserId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  });

  describe('createSavedReport', () => {
    it('should create a new saved report', async () => {
      const request: CreateSavedReportRequest = {
        name: 'Test Report',
        description: 'This is a test report',
        entity: 'contacts',
        report_definition: {
          name: 'Test Report',
          entity: 'contacts',
          fields: ['first_name', 'last_name', 'email'],
        },
        is_public: false,
      };

      const mockReport = createMockReport({
        name: request.name,
        description: request.description,
        entity: request.entity,
        report_definition: request.report_definition,
        is_public: request.is_public,
      });

      mockQuery.mockResolvedValueOnce({ rows: [mockReport] } as QueryResult);

      const result = await service.createSavedReport(testUserId, request);

      expect(result.id).toBeDefined();
      expect(result.name).toBe('Test Report');
      expect(result.description).toBe('This is a test report');
      expect(result.entity).toBe('contacts');
      expect(result.is_public).toBe(false);
      expect(result.created_by).toBe(testUserId);
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('should create a public saved report', async () => {
      const request: CreateSavedReportRequest = {
        name: 'Public Report',
        entity: 'donations',
        report_definition: {
          name: 'Public Report',
          entity: 'donations',
          fields: ['donation_number', 'amount'],
        },
        is_public: true,
      };

      const mockReport = createMockReport({
        name: request.name,
        entity: request.entity,
        is_public: true,
      });

      mockQuery.mockResolvedValueOnce({ rows: [mockReport] } as QueryResult);

      const result = await service.createSavedReport(testUserId, request);

      expect(result.is_public).toBe(true);
    });

    it('should create report with complex definition', async () => {
      const request: CreateSavedReportRequest = {
        name: 'Complex Report',
        entity: 'contacts',
        report_definition: {
          name: 'Complex Report',
          entity: 'contacts',
          fields: ['first_name', 'last_name', 'email', 'created_at'],
          filters: [
            {
              field: 'email',
              operator: 'like',
              value: '%@example.com',
            },
          ],
          sort: [
            {
              field: 'last_name',
              direction: 'asc',
            },
          ],
          limit: 100,
        },
        is_public: false,
      };

      const mockReport = createMockReport({
        name: request.name,
        report_definition: request.report_definition,
      });

      mockQuery.mockResolvedValueOnce({ rows: [mockReport] } as QueryResult);

      const result = await service.createSavedReport(testUserId, request);

      expect(result.report_definition.filters).toHaveLength(1);
      expect(result.report_definition.sort).toHaveLength(1);
      expect(result.report_definition.limit).toBe(100);
    });
  });

  describe('getSavedReports', () => {
    it('should get all saved reports for user', async () => {
      const mockReports = [
        createMockReport({ name: 'Private Report 1' }),
        createMockReport({ name: 'Public Report 1', is_public: true }),
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockReports } as QueryResult);

      const result = await service.getSavedReports(testUserId);

      expect(result.length).toBe(2);
      const names = result.map((r) => r.name);
      expect(names).toContain('Private Report 1');
      expect(names).toContain('Public Report 1');
    });

    it('should filter by entity', async () => {
      const mockReports = [
        createMockReport({ name: 'Contact Report', entity: 'contacts' }),
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockReports } as QueryResult);

      const result = await service.getSavedReports(testUserId, 'contacts');

      expect(result.length).toBe(1);
      result.forEach((report) => {
        expect(report.entity).toBe('contacts');
      });
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND entity = $2'),
        [testUserId, 'contacts']
      );
    });

    it('should return reports created by user', async () => {
      const mockReports = [
        createMockReport({ created_by: testUserId }),
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockReports } as QueryResult);

      const result = await service.getSavedReports(testUserId);

      expect(result.length).toBe(1);
      expect(result[0].created_by).toBe(testUserId);
    });
  });

  describe('getSavedReportById', () => {
    it('should get saved report by id', async () => {
      const mockReport = createMockReport({ name: 'Get By ID Report' });

      mockQuery.mockResolvedValueOnce({ rows: [mockReport] } as QueryResult);

      const result = await service.getSavedReportById(testReportId, testUserId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(testReportId);
      expect(result?.name).toBe('Get By ID Report');
    });

    it('should return null for non-existent id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] } as QueryResult);

      const result = await service.getSavedReportById('non-existent-id', testUserId);

      expect(result).toBeNull();
    });
  });

  describe('updateSavedReport', () => {
    it('should update saved report name', async () => {
      const existingReport = createMockReport({ name: 'Original Name' });
      const updatedReport = createMockReport({ name: 'Updated Name' });

      // First call checks ownership, second call updates
      mockQuery
        .mockResolvedValueOnce({ rows: [existingReport] } as QueryResult)
        .mockResolvedValueOnce({ rows: [updatedReport] } as QueryResult);

      const update: UpdateSavedReportRequest = {
        name: 'Updated Name',
      };

      const result = await service.updateSavedReport(testReportId, testUserId, update);

      expect(result?.name).toBe('Updated Name');
    });

    it('should update saved report description', async () => {
      const existingReport = createMockReport({ description: 'Original description' });
      const updatedReport = createMockReport({ description: 'Updated description' });

      mockQuery
        .mockResolvedValueOnce({ rows: [existingReport] } as QueryResult)
        .mockResolvedValueOnce({ rows: [updatedReport] } as QueryResult);

      const update: UpdateSavedReportRequest = {
        description: 'Updated description',
      };

      const result = await service.updateSavedReport(testReportId, testUserId, update);

      expect(result?.description).toBe('Updated description');
    });

    it('should update is_public flag', async () => {
      const existingReport = createMockReport({ is_public: false });
      const updatedReport = createMockReport({ is_public: true });

      mockQuery
        .mockResolvedValueOnce({ rows: [existingReport] } as QueryResult)
        .mockResolvedValueOnce({ rows: [updatedReport] } as QueryResult);

      const update: UpdateSavedReportRequest = {
        is_public: true,
      };

      const result = await service.updateSavedReport(testReportId, testUserId, update);

      expect(result?.is_public).toBe(true);
    });

    it('should return null if user does not own report', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] } as QueryResult);

      const update: UpdateSavedReportRequest = {
        name: 'Unauthorized Update',
      };

      const result = await service.updateSavedReport(testReportId, 'other-user', update);
      expect(result).toBeNull();
    });

    it('should return existing report if no updates provided', async () => {
      const existingReport = createMockReport();

      mockQuery.mockResolvedValueOnce({ rows: [existingReport] } as QueryResult);

      const update: UpdateSavedReportRequest = {};

      const result = await service.updateSavedReport(testReportId, testUserId, update);
      expect(result).toEqual(existingReport);
      expect(mockQuery).toHaveBeenCalledTimes(1); // Only ownership check, no update
    });
  });

  describe('deleteSavedReport', () => {
    it('should delete saved report', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: testReportId }] } as QueryResult);

      const deleted = await service.deleteSavedReport(testReportId, testUserId);

      expect(deleted).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM saved_reports'),
        [testReportId, testUserId]
      );
    });

    it('should return false if user does not own report', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] } as QueryResult);

      const result = await service.deleteSavedReport(testReportId, 'other-user');

      expect(result).toBe(false);
    });

    it('should return false for non-existent report', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] } as QueryResult);

      const result = await service.deleteSavedReport('non-existent-id', testUserId);

      expect(result).toBe(false);
    });
  });
});
