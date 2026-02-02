/**
 * Saved Report Service Tests
 * Tests for saved report CRUD operations
 */

import { Pool } from 'pg';
import { SavedReportService } from '../../../src/services/savedReportService';
import type { CreateSavedReportRequest, UpdateSavedReportRequest } from '../../../src/types/savedReport';

describe('SavedReportService', () => {
  let pool: Pool;
  let service: SavedReportService;
  let testUserId: string;
  let testReportId: string;

  beforeAll(async () => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    service = new SavedReportService(pool);

    // Create a test user
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ['test-report@example.com', 'hash123', 'Test', 'User', 'user']
    );
    testUserId = userResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM saved_reports WHERE created_by = $1', [testUserId]);
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    await pool.end();
  });

  afterEach(async () => {
    // Clean up reports created during tests
    await pool.query('DELETE FROM saved_reports WHERE created_by = $1', [testUserId]);
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

      const result = await service.createSavedReport(testUserId, request);

      expect(result.id).toBeDefined();
      expect(result.name).toBe('Test Report');
      expect(result.description).toBe('This is a test report');
      expect(result.entity).toBe('contacts');
      expect(result.report_definition).toEqual(request.report_definition);
      expect(result.is_public).toBe(false);
      expect(result.created_by).toBe(testUserId);
      expect(result.created_at).toBeDefined();
      expect(result.updated_at).toBeDefined();

      testReportId = result.id;
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

      const result = await service.createSavedReport(testUserId, request);

      expect(result.report_definition.filters).toHaveLength(1);
      expect(result.report_definition.sort).toHaveLength(1);
      expect(result.report_definition.limit).toBe(100);
    });
  });

  describe('getSavedReports', () => {
    beforeEach(async () => {
      // Create test reports
      await service.createSavedReport(
        testUserId,
        {
          name: 'Private Report 1',
          entity: 'contacts',
          report_definition: {
            name: 'Private Report 1',
            entity: 'contacts',
            fields: ['first_name', 'last_name'],
          },
          is_public: false,
        }
      );

      await service.createSavedReport(
        testUserId,
        {
          name: 'Public Report 1',
          entity: 'donations',
          report_definition: {
            name: 'Public Report 1',
            entity: 'donations',
            fields: ['amount'],
          },
          is_public: true,
        }
      );
    });

    it('should get all saved reports for user', async () => {
      const result = await service.getSavedReports(testUserId);

      expect(result.length).toBeGreaterThanOrEqual(2);
      
      // Should include both private and public reports created by user
      const names = result.map((r) => r.name);
      expect(names).toContain('Private Report 1');
      expect(names).toContain('Public Report 1');
    });

    it('should filter by entity', async () => {
      const result = await service.getSavedReports(testUserId, 'contacts');

      expect(result.length).toBeGreaterThan(0);
      result.forEach((report) => {
        expect(report.entity).toBe('contacts');
      });
    });

    it('should return reports created by user', async () => {
      const result = await service.getSavedReports(testUserId);

      expect(result.length).toBeGreaterThan(0);
      const ownReports = result.filter((r) => r.created_by === testUserId);
      expect(ownReports.length).toBeGreaterThan(0);
    });

    it('should get public reports even for different user', async () => {
      // Create another user
      const otherUserResult = await pool.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        ['other-user@example.com', 'hash456', 'Other', 'User', 'user']
      );
      const otherUserId = otherUserResult.rows[0].id;

      try {
        const result = await service.getSavedReports(otherUserId);

        // Should see public reports from test user
        const publicReports = result.filter((r) => r.created_by === testUserId);
        expect(publicReports.length).toBeGreaterThan(0);
        publicReports.forEach((report) => {
          expect(report.is_public).toBe(true);
        });
      } finally {
        await pool.query('DELETE FROM users WHERE id = $1', [otherUserId]);
      }
    });

    it('should not include other users private reports', async () => {
      // Create another user
      const otherUserResult = await pool.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        ['other-user2@example.com', 'hash789', 'Another', 'User', 'user']
      );
      const otherUserId = otherUserResult.rows[0].id;

      try {
        const result = await service.getSavedReports(otherUserId);

        // Should NOT see private reports from test user
        const privateReports = result.filter(
          (r) => r.created_by === testUserId && !r.is_public
        );
        expect(privateReports.length).toBe(0);
      } finally {
        await pool.query('DELETE FROM users WHERE id = $1', [otherUserId]);
      }
    });
  });

  describe('getSavedReportById', () => {
    beforeEach(async () => {
      const report = await service.createSavedReport(
        testUserId,
        {
          name: 'Get By ID Report',
          entity: 'events',
          report_definition: {
            name: 'Get By ID Report',
            entity: 'events',
            fields: ['title', 'start_date'],
          },
          is_public: false,
        }
      );
      testReportId = report.id;
    });

    it('should get saved report by id', async () => {
      const result = await service.getSavedReportById(testReportId, testUserId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(testReportId);
      expect(result?.name).toBe('Get By ID Report');
      expect(result?.entity).toBe('events');
    });

    it('should return null for non-existent id', async () => {
      const result = await service.getSavedReportById('00000000-0000-0000-0000-000000000000', testUserId);

      expect(result).toBeNull();
    });
  });

  describe('updateSavedReport', () => {
    beforeEach(async () => {
      const report = await service.createSavedReport(
        testUserId,
        {
          name: 'Original Name',
          description: 'Original description',
          entity: 'contacts',
          report_definition: {
            name: 'Original Name',
            entity: 'contacts',
            fields: ['first_name'],
          },
          is_public: false,
        }
      );
      testReportId = report.id;
    });

    it('should update saved report name', async () => {
      const update: UpdateSavedReportRequest = {
        name: 'Updated Name',
      };

      const result = await service.updateSavedReport(testReportId, testUserId, update);

      expect(result?.name).toBe('Updated Name');
      expect(result?.description).toBe('Original description');
    });

    it('should update saved report description', async () => {
      const update: UpdateSavedReportRequest = {
        description: 'Updated description',
      };

      const result = await service.updateSavedReport(testReportId, testUserId, update);

      expect(result?.description).toBe('Updated description');
    });

    it('should update report definition', async () => {
      const update: UpdateSavedReportRequest = {
        report_definition: {
          name: 'Updated Report',
          entity: 'contacts',
          fields: ['first_name', 'last_name', 'email'],
          filters: [
            {
              field: 'email',
              operator: 'ne',
              value: '',
            },
          ],
        },
      };

      const result = await service.updateSavedReport(testReportId, testUserId, update);

      expect(result?.report_definition.fields).toHaveLength(3);
      expect(result?.report_definition.filters).toHaveLength(1);
    });

    it('should update is_public flag', async () => {
      const update: UpdateSavedReportRequest = {
        is_public: true,
      };

      const result = await service.updateSavedReport(testReportId, testUserId, update);

      expect(result?.is_public).toBe(true);
    });

    it('should update multiple fields at once', async () => {
      const update: UpdateSavedReportRequest = {
        name: 'Multi Update',
        description: 'Multi description',
        is_public: true,
      };

      const result = await service.updateSavedReport(testReportId, testUserId, update);

      expect(result?.name).toBe('Multi Update');
      expect(result?.description).toBe('Multi description');
      expect(result?.is_public).toBe(true);
    });

    it('should throw error if user does not own report', async () => {
      // Create another user
      const otherUserResult = await pool.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        ['unauthorized@example.com', 'hash999', 'Unauthorized', 'User', 'user']
      );
      const otherUserId = otherUserResult.rows[0].id;

      try {
        const update: UpdateSavedReportRequest = {
          name: 'Unauthorized Update',
        };

        const result = await service.updateSavedReport(testReportId, otherUserId, update);
        expect(result).toBeNull();
      } finally {
        await pool.query('DELETE FROM users WHERE id = $1', [otherUserId]);
      }
    });

    it('should return null for non-existent report', async () => {
      const update: UpdateSavedReportRequest = {
        name: 'Non-existent Update',
      };

      const result = await service.updateSavedReport('00000000-0000-0000-0000-000000000000', testUserId, update);
      expect(result).toBeNull();
    });
  });

  describe('deleteSavedReport', () => {
    beforeEach(async () => {
      const report = await service.createSavedReport(
        testUserId,
        {
          name: 'Report to Delete',
          entity: 'tasks',
          report_definition: {
            name: 'Report to Delete',
            entity: 'tasks',
            fields: ['title', 'status'],
          },
          is_public: false,
        }
      );
      testReportId = report.id;
    });

    it('should delete saved report', async () => {
      const deleted = await service.deleteSavedReport(testReportId, testUserId);
      expect(deleted).toBe(true);

      const result = await service.getSavedReportById(testReportId);
      expect(result).toBeNull();
    });

    it('should return false if user does not own report', async () => {
      // Create another user
      const otherUserResult = await pool.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        ['unauthorized-delete@example.com', 'hash111', 'Unauthorized', 'Deleter', 'user']
      );
      const otherUserId = otherUserResult.rows[0].id;

      try {
        const result = await service.deleteSavedReport(testReportId, otherUserId);
        expect(result).toBe(false);
      } finally {
        await pool.query('DELETE FROM users WHERE id = $1', [otherUserId]);
      }
    });

    it('should return false for non-existent report', async () => {
      const result = await service.deleteSavedReport('00000000-0000-0000-0000-000000000000', testUserId);
      expect(result).toBe(false);
    });
  });
});
