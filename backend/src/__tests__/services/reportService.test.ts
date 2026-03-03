/**
 * Report Service Tests
 * Tests for custom report generation and data extraction
 */

import { ReportService } from '../../../src/services/reportService';
import type { ReportDefinition, ReportEntity } from '../../../src/types/report';

describe('ReportService', () => {
  const query = jest.fn();
  let pool: { query: typeof query };
  let reportService: ReportService;

  beforeEach(() => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('COUNT(*) as count')) {
        return { rows: [{ count: '0' }] };
      }
      return { rows: [] };
    });
    pool = { query };
    reportService = new ReportService(pool as any);
  });

  describe('getAvailableFields', () => {
    it('should return available fields for accounts entity', async () => {
      const result = await reportService.getAvailableFields('accounts');

      expect(result.entity).toBe('accounts');
      expect(result.fields).toBeInstanceOf(Array);
      expect(result.fields.length).toBeGreaterThan(0);

      // Check that each field has required properties
      result.fields.forEach((field) => {
        expect(field).toHaveProperty('field');
        expect(field).toHaveProperty('label');
        expect(field).toHaveProperty('type');
        expect(['string', 'number', 'date', 'boolean', 'currency']).toContain(field.type);
      });
    });

    it('should return available fields for contacts entity', async () => {
      const result = await reportService.getAvailableFields('contacts');

      expect(result.entity).toBe('contacts');
      expect(result.fields).toBeInstanceOf(Array);
      expect(result.fields.length).toBeGreaterThan(0);
    });

    it('should return available fields for donations entity', async () => {
      const result = await reportService.getAvailableFields('donations');

      expect(result.entity).toBe('donations');
      expect(result.fields).toBeInstanceOf(Array);
      expect(result.fields.length).toBeGreaterThan(0);
    });

    it('should return available fields for events entity', async () => {
      const result = await reportService.getAvailableFields('events');

      expect(result.entity).toBe('events');
      expect(result.fields).toBeInstanceOf(Array);
      expect(result.fields.length).toBeGreaterThan(0);
    });

    it('should return available fields for volunteers entity', async () => {
      const result = await reportService.getAvailableFields('volunteers');

      expect(result.entity).toBe('volunteers');
      expect(result.fields).toBeInstanceOf(Array);
      expect(result.fields.length).toBeGreaterThan(0);
    });

    it('should return available fields for tasks entity', async () => {
      const result = await reportService.getAvailableFields('tasks');

      expect(result.entity).toBe('tasks');
      expect(result.fields).toBeInstanceOf(Array);
      expect(result.fields.length).toBeGreaterThan(0);
    });

    it('should return available fields for opportunities entity', async () => {
      const result = await reportService.getAvailableFields('opportunities');

      expect(result.entity).toBe('opportunities');
      expect(result.fields).toBeInstanceOf(Array);
      expect(result.fields.map((field) => field.field)).toEqual(
        expect.arrayContaining(['stage_name', 'probability', 'weighted_amount', 'won_flag', 'open_flag'])
      );
    });
  });

  describe('generateReport', () => {
    it('should generate a basic report with selected fields', async () => {
      const definition: ReportDefinition = {
        name: 'Basic Contacts Report',
        entity: 'contacts' as ReportEntity,
        fields: ['first_name', 'last_name', 'email'],
      };

      const result = await reportService.generateReport(definition);

      expect(result.definition).toEqual(definition);
      expect(result.data).toBeInstanceOf(Array);
      expect(result.total_count).toBeGreaterThanOrEqual(0);
      expect(result.generated_at).toBeDefined();

      if (result.data.length > 0) {
        expect(result.data[0]).toHaveProperty('first_name');
        expect(result.data[0]).toHaveProperty('last_name');
        expect(result.data[0]).toHaveProperty('email');
      }
    });

    it('should apply filters to report', async () => {
      const definition: ReportDefinition = {
        name: 'Filtered Contacts Report',
        entity: 'contacts' as ReportEntity,
        fields: ['first_name', 'last_name', 'email'],
        filters: [
          {
            field: 'email',
            operator: 'like',
            value: '%@example.com',
          },
        ],
      };

      const result = await reportService.generateReport(definition);

      expect(result.data).toBeInstanceOf(Array);

      // All returned records should match the filter
      result.data.forEach((row) => {
        if (row.email) {
          expect(String(row.email).toLowerCase()).toContain('@example.com');
        }
      });
    });

    it('should apply sorting to report', async () => {
      const definition: ReportDefinition = {
        name: 'Sorted Contacts Report',
        entity: 'contacts' as ReportEntity,
        fields: ['first_name', 'last_name', 'email'],
        sort: [
          {
            field: 'last_name',
            direction: 'asc',
          },
        ],
        limit: 10,
      };

      const result = await reportService.generateReport(definition);

      expect(result.data).toBeInstanceOf(Array);

      // Check that data is sorted
      if (result.data.length > 1) {
        for (let i = 0; i < result.data.length - 1; i++) {
          const current = String(result.data[i].last_name || '');
          const next = String(result.data[i + 1].last_name || '');
          expect(current.localeCompare(next)).toBeLessThanOrEqual(0);
        }
      }
    });

    it('should apply limit to report', async () => {
      const definition: ReportDefinition = {
        name: 'Limited Contacts Report',
        entity: 'contacts' as ReportEntity,
        fields: ['first_name', 'last_name'],
        limit: 5,
      };

      const result = await reportService.generateReport(definition);

      expect(result.data.length).toBeLessThanOrEqual(5);
    });

    it('should handle multiple filters with different operators', async () => {
      const definition: ReportDefinition = {
        name: 'Complex Filter Report',
        entity: 'contacts' as ReportEntity,
        fields: ['first_name', 'last_name', 'email', 'created_at'],
        filters: [
          {
            field: 'email',
            operator: 'ne',
            value: '',
          },
          {
            field: 'created_at',
            operator: 'gte',
            value: '2020-01-01',
          },
        ],
      };

      const result = await reportService.generateReport(definition);

      expect(result.data).toBeInstanceOf(Array);

      // All returned records should have email and created_at >= 2020-01-01
      result.data.forEach((row) => {
        expect(row.email).toBeTruthy();
        if (row.created_at) {
          expect(new Date(String(row.created_at))).toBeInstanceOf(Date);
        }
      });
    });

    it('should handle volunteers entity with JOIN', async () => {
      const definition: ReportDefinition = {
        name: 'Volunteers Report',
        entity: 'volunteers' as ReportEntity,
        fields: ['first_name', 'last_name', 'email', 'skills', 'availability'],
        limit: 10,
      };

      const result = await reportService.generateReport(definition);

      expect(result.data).toBeInstanceOf(Array);

      if (result.data.length > 0) {
        // Should have contact fields (from JOIN)
        expect(result.data[0]).toHaveProperty('first_name');
        expect(result.data[0]).toHaveProperty('last_name');
        expect(result.data[0]).toHaveProperty('email');
        // And volunteer fields
        expect(result.data[0]).toHaveProperty('skills');
        expect(result.data[0]).toHaveProperty('availability');
      }
    });

    it('should handle donations entity with currency fields', async () => {
      const definition: ReportDefinition = {
        name: 'Donations Report',
        entity: 'donations' as ReportEntity,
        fields: ['donation_number', 'amount', 'payment_method', 'donation_date'],
        limit: 10,
      };

      const result = await reportService.generateReport(definition);

      expect(result.data).toBeInstanceOf(Array);

      if (result.data.length > 0) {
        expect(result.data[0]).toHaveProperty('donation_number');
        expect(result.data[0]).toHaveProperty('amount');
        expect(result.data[0]).toHaveProperty('payment_method');
        expect(result.data[0]).toHaveProperty('donation_date');
      }
    });

    it('should return total count even with limit', async () => {
      const definition: ReportDefinition = {
        name: 'Count Test Report',
        entity: 'contacts' as ReportEntity,
        fields: ['first_name', 'last_name'],
        limit: 2,
      };

      const result = await reportService.generateReport(definition);

      // Total count should be >= returned data length
      expect(result.total_count).toBeGreaterThanOrEqual(result.data.length);
    });

    it('should throw error if no fields selected', async () => {
      const definition: ReportDefinition = {
        name: 'No Fields Report',
        entity: 'contacts' as ReportEntity,
        fields: [],
      };

      await expect(reportService.generateReport(definition)).rejects.toThrow(
        'At least one field or aggregation must be selected'
      );
    });

    it('should handle eq operator correctly', async () => {
      const definition: ReportDefinition = {
        name: 'Equality Filter Report',
        entity: 'accounts' as ReportEntity,
        fields: ['account_name', 'account_type'],
        filters: [
          {
            field: 'account_type',
            operator: 'eq',
            value: 'nonprofit',
          },
        ],
      };

      const result = await reportService.generateReport(definition);

      result.data.forEach((row) => {
        expect(row.account_type).toBe('nonprofit');
      });
    });

    it('should handle in operator with array values', async () => {
      const definition: ReportDefinition = {
        name: 'In Operator Report',
        entity: 'donations' as ReportEntity,
        fields: ['donation_number', 'payment_method'],
        filters: [
          {
            field: 'payment_method',
            operator: 'in',
            value: ['credit_card', 'debit_card', 'paypal'],
          },
        ],
        limit: 10,
      };

      const result = await reportService.generateReport(definition);

      result.data.forEach((row) => {
        expect(['credit_card', 'debit_card', 'paypal']).toContain(row.payment_method);
      });
    });

    it('should handle multiple sort fields', async () => {
      const definition: ReportDefinition = {
        name: 'Multi-Sort Report',
        entity: 'contacts' as ReportEntity,
        fields: ['first_name', 'last_name', 'email'],
        sort: [
          {
            field: 'last_name',
            direction: 'asc',
          },
          {
            field: 'first_name',
            direction: 'asc',
          },
        ],
        limit: 10,
      };

      const result = await reportService.generateReport(definition);

      expect(result.data).toBeInstanceOf(Array);
      // Multi-field sorting is applied
      expect(result.definition.sort).toHaveLength(2);
    });

    it('should enforce organization scope for opportunities reports', async () => {
      const definition: ReportDefinition = {
        name: 'Opportunity Scope Report',
        entity: 'opportunities' as ReportEntity,
        fields: ['name', 'stage_name', 'weighted_amount'],
      };

      await expect(reportService.generateReport(definition)).rejects.toThrow(
        'Organization scope is required for opportunities reports'
      );
    });

    it('should apply organization scope for opportunities reports', async () => {
      const definition: ReportDefinition = {
        name: 'Opportunity Scope Report',
        entity: 'opportunities' as ReportEntity,
        fields: ['name', 'stage_name', 'weighted_amount'],
      };

      await reportService.generateReport(definition, { organizationId: 'org-123' });

      expect(query).toHaveBeenCalled();
      const [sql, values] = query.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('o.organization_id = $1');
      expect(sql).toContain('AS weighted_amount');
      expect(values).toEqual(['org-123']);
    });

    it('should enforce organization scope for case reports', async () => {
      const definition: ReportDefinition = {
        name: 'Case Scope Report',
        entity: 'cases' as ReportEntity,
        fields: ['title', 'age_days'],
      };

      await expect(reportService.generateReport(definition)).rejects.toThrow(
        'Organization scope is required for cases reports'
      );
    });

    it('should apply organization scope for case reports', async () => {
      const definition: ReportDefinition = {
        name: 'Case Scope Report',
        entity: 'cases' as ReportEntity,
        fields: ['title', 'age_days', 'age_bucket'],
      };

      await reportService.generateReport(definition, { organizationId: 'org-456' });

      expect(query).toHaveBeenCalled();
      const [sql, values] = query.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('COALESCE(c.account_id, con.account_id) = $1');
      expect(sql).toContain('AS age_days');
      expect(sql).toContain('AS age_bucket');
      expect(values).toEqual(['org-456']);
    });

    it('supports sorting by aggregation alias', async () => {
      const definition: ReportDefinition = {
        name: 'Donations by Campaign',
        entity: 'donations',
        fields: ['campaign_name'],
        groupBy: ['campaign_name'],
        aggregations: [{ field: 'amount', function: 'sum', alias: 'total_donated' }],
        sort: [{ field: 'total_donated', direction: 'desc' }],
      };

      await reportService.generateReport(definition);

      const [sql] = query.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('AS "total_donated"');
      expect(sql).toContain('ORDER BY "total_donated" DESC');
    });
  });

  describe('exportReport', () => {
    it('escapes commas, quotes, and newlines in CSV output', async () => {
      const csv = await reportService.exportReport(
        {
          definition: {
            name: 'CSV Escape Test',
            entity: 'contacts',
            fields: ['first_name'],
          },
          data: [{ first_name: 'He said "Hi",\nTeam' }],
          total_count: 1,
          generated_at: new Date().toISOString(),
        },
        'csv'
      );

      const text = csv.toString('utf8');
      expect(text).toContain('first_name');
      expect(text).toContain('"He said ""Hi"",\nTeam"');
    });
  });
});
