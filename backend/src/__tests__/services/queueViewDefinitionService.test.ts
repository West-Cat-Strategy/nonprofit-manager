import pool from '@config/database';
import {
  archiveQueueViewDefinition,
  buildQueueViewCountResponse,
  buildQueueViewPreviewResponse,
  listQueueViewDefinitions,
  upsertQueueViewDefinition,
} from '@services/queueViewDefinitionService';

jest.mock('@config/database', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

describe('queueViewDefinitionService', () => {
  const mockQuery = pool.query as jest.Mock;

  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('updates an existing queue view only through the current owner and surface', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'view-1',
          owner_user_id: 'user-1',
          surface: 'cases',
          name: 'My cases',
          filters: {},
          columns: [],
          sort: {},
          row_limit: 25,
          dashboard_behavior: {},
          permission_scope: ['portal_admin'],
          status: 'active',
          created_at: new Date('2026-04-25T00:00:00Z'),
          updated_at: new Date('2026-04-25T00:00:00Z'),
        },
      ],
    });

    const view = await upsertQueueViewDefinition({
      id: 'view-1',
      ownerUserId: 'user-1',
      surface: 'cases',
      name: 'My cases',
      permissionScope: ['portal_admin'],
      userId: 'user-1',
    });

    expect(view.id).toBe('view-1');
    expect(view.permissionScope).toEqual(['portal_admin']);
    expect(mockQuery.mock.calls[0][0]).toContain('owner_user_id IS NOT DISTINCT FROM $2::uuid');
    expect(mockQuery.mock.calls[0][0]).toContain('AND surface = $3');
    expect(mockQuery.mock.calls[0][1][9]).toEqual(['portal_admin']);
  });

  it('persists row actions and empty-state metadata in dashboard behavior JSON', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'view-1',
          owner_user_id: 'user-1',
          surface: 'cases',
          name: 'My cases',
          filters: {},
          columns: [],
          sort: {},
          row_limit: 25,
          dashboard_behavior: {
            density: 'compact',
            row_actions: [
              {
                id: 'open',
                label: 'Open',
                style: 'primary',
                permissionScope: ['cases'],
                metadata: { target: 'case_detail' },
              },
            ],
            empty_state: { title: 'No matching cases' },
          },
          permission_scope: ['cases'],
          status: 'active',
          created_at: new Date('2026-04-25T00:00:00Z'),
          updated_at: new Date('2026-04-25T00:00:00Z'),
        },
      ],
    });

    const view = await upsertQueueViewDefinition({
      ownerUserId: 'user-1',
      surface: 'cases',
      name: 'My cases',
      dashboardBehavior: { density: 'compact' },
      rowActions: [
        {
          id: ' open ',
          label: ' Open ',
          style: 'primary',
          permissionScope: ['cases', 'cases'],
          metadata: { target: 'case_detail' },
        },
      ],
      emptyState: { title: 'No matching cases' },
      permissionScope: ['cases'],
      userId: 'user-1',
    });

    expect(JSON.parse(mockQuery.mock.calls[0][1][8])).toEqual({
      density: 'compact',
      row_actions: [
        {
          id: 'open',
          label: 'Open',
          style: 'primary',
          permissionScope: ['cases'],
          metadata: { target: 'case_detail' },
        },
      ],
      empty_state: { title: 'No matching cases' },
    });
    expect(view.rowActions).toEqual([
      {
        id: 'open',
        label: 'Open',
        style: 'primary',
        permissionScope: ['cases'],
        metadata: { target: 'case_detail' },
      },
    ]);
    expect(view.emptyState).toEqual({ title: 'No matching cases' });
  });

  it('rejects updates when the id is not owned by the current user', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(
      upsertQueueViewDefinition({
        id: 'view-2',
        ownerUserId: 'user-1',
        surface: 'cases',
        name: 'Other view',
        userId: 'user-1',
      })
    ).rejects.toThrow('Queue view definition not found for current owner');
  });

  it('lists only views owned by the current user', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'view-1',
          owner_user_id: 'user-1',
          surface: 'cases',
          name: 'My cases',
          filters: {},
          columns: [],
          sort: {},
          row_limit: 25,
          dashboard_behavior: {},
          permission_scope: [],
          status: 'active',
          created_at: new Date('2026-04-25T00:00:00Z'),
          updated_at: new Date('2026-04-25T00:00:00Z'),
        },
      ],
    });

    const views = await listQueueViewDefinitions('cases', 'user-1');

    expect(views).toHaveLength(1);
    expect(mockQuery.mock.calls[0][0]).toContain('AND owner_user_id = $2');
    expect(mockQuery.mock.calls[0][0]).toContain('permission_scope && $3::text[]');
    expect(mockQuery.mock.calls[0][1][2]).toEqual([]);
    expect(mockQuery.mock.calls[0][0]).not.toContain('owner_user_id IS NULL');
  });

  it('filters listed views by requested permission scopes when provided', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await listQueueViewDefinitions('workbench', 'user-1', ['workbench', 'workbench']);

    expect(mockQuery.mock.calls[0][1][2]).toEqual(['workbench']);
  });

  it('does not return global views without an owner context', async () => {
    await expect(listQueueViewDefinitions('cases', null)).resolves.toEqual([]);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('archives a queue view only through the current owner, surface, and permission scope', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'view-1',
          owner_user_id: 'user-1',
          surface: 'cases',
          name: 'My cases',
          filters: {},
          columns: [],
          sort: {},
          row_limit: 25,
          dashboard_behavior: {},
          permission_scope: ['cases'],
          status: 'archived',
          created_at: new Date('2026-04-25T00:00:00Z'),
          updated_at: new Date('2026-04-25T00:00:00Z'),
        },
      ],
    });

    const view = await archiveQueueViewDefinition({
      id: 'view-1',
      ownerUserId: 'user-1',
      surface: 'cases',
      permissionScopes: ['cases'],
      userId: 'user-1',
    });

    expect(view.status).toBe('archived');
    expect(mockQuery.mock.calls[0][0]).toContain("status = 'archived'");
    expect(mockQuery.mock.calls[0][0]).toContain('owner_user_id IS NOT DISTINCT FROM $2::uuid');
    expect(mockQuery.mock.calls[0][0]).toContain('permission_scope && $4::text[]');
    expect(mockQuery.mock.calls[0][1]).toEqual([
      'view-1',
      'user-1',
      'cases',
      ['cases'],
      'user-1',
    ]);
  });

  it('builds scoped count and preview responses from a persisted view contract', () => {
    const view = {
      id: 'view-1',
      ownerUserId: 'user-1',
      surface: 'cases' as const,
      name: 'My cases',
      filters: {},
      columns: [],
      sort: {},
      rowLimit: 1,
      dashboardBehavior: {},
      rowActions: [{ id: 'open', label: 'Open', style: 'primary' as const }],
      emptyState: { title: 'No matching cases' },
      permissionScope: ['cases'],
      status: 'active' as const,
      createdAt: new Date('2026-04-25T00:00:00Z'),
      updatedAt: new Date('2026-04-25T00:00:00Z'),
    };

    expect(buildQueueViewCountResponse({ surface: 'cases', view, count: 2.8 })).toEqual({
      surface: 'cases',
      viewId: 'view-1',
      count: 2,
      rowLimit: 1,
    });
    expect(
      buildQueueViewPreviewResponse({
        surface: 'cases',
        view,
        count: 2,
        rows: [{ id: 'case-1' }, { id: 'case-2' }],
      })
    ).toEqual({
      surface: 'cases',
      viewId: 'view-1',
      count: 2,
      rowLimit: 1,
      rows: [{ id: 'case-1' }],
      rowActions: [{ id: 'open', label: 'Open', style: 'primary' }],
      emptyState: { title: 'No matching cases' },
    });
  });
});
