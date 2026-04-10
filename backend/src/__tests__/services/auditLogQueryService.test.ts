import pool from '@config/database';
import { getAuditLogPage } from '@services/auditLogQueryService';

jest.mock('@config/database', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

jest.mock('@config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

describe('auditLogQueryService', () => {
  const mockQuery = pool.query as jest.Mock;

  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('filters audit logs by user and maps the modern audit row shape', async () => {
    mockQuery.mockImplementation(async (sql: string, params?: unknown[]) => {
      if (sql === 'SELECT to_regclass($1) IS NOT NULL AS exists') {
        return { rows: [{ exists: true }] };
      }

      if (sql.includes('SELECT COUNT(*)::text AS count') && sql.includes('FROM audit_log al')) {
        return { rows: [{ count: '1' }] };
      }

      if (sql.includes('FROM audit_log al') && sql.includes('ORDER BY al.changed_at DESC')) {
        expect(params).toEqual(['user-1', 25, 0]);
        expect(sql).toContain('al.changed_by = $1::uuid OR al.record_id = $1::uuid');
        return {
          rows: [
            {
              id: 'log-1',
              table_name: 'users',
              record_id: 'user-1',
              operation: 'UPDATE',
              old_values: { role: 'user' },
              new_values: { role: 'staff' },
              changed_fields: ['role'],
              changed_by: 'actor-1',
              changed_by_email: 'admin@example.com',
              changed_at: new Date('2026-03-10T00:00:00.000Z'),
              client_ip_address: '127.0.0.1',
              user_agent: 'Mozilla/5.0',
              is_sensitive: false,
            },
          ],
        };
      }

      return { rows: [] };
    });

    const page = await getAuditLogPage({ limit: 25, offset: 0, userId: 'user-1' });

    expect(page).toEqual({
      logs: [
        expect.objectContaining({
          id: 'log-1',
          tableName: 'users',
          recordId: 'user-1',
          operation: 'UPDATE',
          summary: 'Updated user role',
          details: 'Changed: role',
          changedByEmail: 'admin@example.com',
          changedFields: ['role'],
          clientIpAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
        }),
      ],
      total: 1,
    });
  });
});
