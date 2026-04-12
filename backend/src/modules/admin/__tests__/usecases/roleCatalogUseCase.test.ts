import pool from '@config/database';
import {
  createRole,
  deleteRole,
  getPermissionCatalog,
  getRoleCatalog,
  getRoleSelectorItems,
  isSystemRoleSlug,
  normalizeRoleSlug,
  updateRole,
} from '../../usecases/roleCatalogUseCase';

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
    connect: jest.fn(),
  },
}));

jest.mock('@config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('roleCatalogUseCase', () => {
  const mockQuery = pool.query as jest.Mock;
  const mockConnect = pool.connect as jest.Mock;
  let roleCatalogRows: Array<Record<string, unknown>>;
  let permissionCatalogRows: Array<Record<string, unknown>>;

  beforeEach(() => {
    mockQuery.mockReset();
    mockConnect.mockReset();
    roleCatalogRows = [
      {
        id: 'role-1',
        name: 'User',
        description: 'Front desk',
        is_system: false,
        priority: 1,
        user_count: '7',
        permissions: ['users:view'],
      },
    ];
    permissionCatalogRows = [
      {
        id: 'perm-1',
        name: 'users:view',
        description: 'View users',
        resource: 'users',
        action: 'read',
      },
    ];
  });

  it('normalizes legacy role slugs and system role checks', () => {
    expect(normalizeRoleSlug('User')).toBe('staff');
    expect(normalizeRoleSlug('readonly')).toBe('viewer');
    expect(normalizeRoleSlug('member')).toBe('viewer');
    expect(isSystemRoleSlug('admin')).toBe(true);
    expect(isSystemRoleSlug('member')).toBe(true);
    expect(isSystemRoleSlug('community-lead')).toBe(false);
  });

  it('returns canonical role and selector catalogs', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("to_regclass('public.roles')")) {
        return {
          rows: [
            {
              roles_table: 'roles',
              permissions_table: 'permissions',
              role_permissions_table: 'role_permissions',
              user_roles_table: 'user_roles',
            },
          ],
        };
      }

      if (sql.includes('FROM roles r')) {
        return { rows: roleCatalogRows };
      }

      return { rows: [] };
    });

    const roles = await getRoleCatalog();
    const selectors = await getRoleSelectorItems();

    expect(roles).toEqual([
      expect.objectContaining({
        id: 'role-1',
        name: 'staff',
        label: 'Staff',
        description: 'Front desk',
        isSystem: true,
        userCount: 7,
        permissions: ['users:view'],
      }),
    ]);
    expect(selectors).toEqual([
      expect.objectContaining({
        value: 'staff',
        label: 'Staff',
        description: 'Front desk',
        isSystem: true,
      }),
    ]);
  });

  it('returns a humanized permission catalog', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("to_regclass('public.permissions')")) {
        return { rows: [{ permissions_table: 'permissions' }] };
      }

      if (sql.includes('FROM permissions')) {
        return { rows: permissionCatalogRows };
      }

      return { rows: [] };
    });

    await expect(getPermissionCatalog()).resolves.toEqual([
      expect.objectContaining({
        id: 'perm-1',
        name: 'users:view',
        label: 'View Users',
        category: 'Users',
      }),
    ]);
  });

  it('creates, updates, and deletes custom roles while protecting system roles', async () => {
    const clientQuery = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
        return { rows: [] };
      }

      if (sql.includes('FROM roles') && sql.includes('ORDER BY is_system DESC')) {
        return { rows: [] };
      }

      if (sql.includes('FROM permissions') && sql.includes('name = ANY')) {
        return {
          rows: [
            { id: 'perm-1', name: 'users:view' },
            { id: 'perm-2', name: 'users:update' },
          ],
        };
      }

      if (sql.includes('INSERT INTO roles')) {
        return { rows: [{ id: 'role-created' }] };
      }

      if (sql.includes('INSERT INTO role_permissions')) {
        return { rows: [] };
      }

      if (sql.includes('FROM roles') && sql.includes('WHERE id = $1') && sql.includes('is_system')) {
        return {
          rows: [{ id: 'role-1', name: 'team-coordinator', is_system: false }],
        };
      }

      if (sql.includes('UPDATE users')) {
        return { rows: [] };
      }

      if (sql.includes('UPDATE user_invitations')) {
        return { rows: [] };
      }

      if (sql.includes('UPDATE registration_settings')) {
        return { rows: [] };
      }

      if (sql.includes('UPDATE roles SET name = $1')) {
        return { rows: [] };
      }

      if (sql.includes('UPDATE roles SET description = $1')) {
        return { rows: [] };
      }

      if (sql.includes('DELETE FROM role_permissions')) {
        return { rows: [] };
      }

      if (sql.includes('DELETE FROM roles WHERE id = $1')) {
        return { rows: [] };
      }

      if (sql.includes('SELECT COUNT(*)::text AS count') && sql.includes('FROM users')) {
        return { rows: [{ count: '0' }] };
      }

      if (sql.includes('SELECT COUNT(*)::text AS count') && sql.includes('FROM user_invitations')) {
        return { rows: [{ count: '0' }] };
      }

      if (sql.includes('SELECT COUNT(*)::text AS count') && sql.includes('FROM registration_settings')) {
        return { rows: [{ count: '0' }] };
      }

      return { rows: [] };
    });

    mockConnect.mockResolvedValue({
      query: clientQuery,
      release: jest.fn(),
    });

    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("to_regclass('public.roles')")) {
        return {
          rows: [
            {
              roles_table: 'roles',
              permissions_table: 'permissions',
              role_permissions_table: 'role_permissions',
              user_roles_table: 'user_roles',
            },
          ],
        };
      }

      if (sql.includes('FROM roles r')) {
        return { rows: roleCatalogRows };
      }

      return { rows: [] };
    });

    roleCatalogRows = [
      {
        id: 'role-created',
        name: 'community-lead',
        description: 'Leads volunteers',
        is_system: false,
        priority: 0,
        user_count: '0',
        permissions: ['users:view', 'users:update'],
      },
    ];

    const created = await createRole({
      name: 'Community Lead',
      description: 'Leads volunteers',
      permissions: ['users:view', 'users:update'],
    });

    expect(created).toMatchObject({
      id: 'role-created',
      name: 'community-lead',
      label: 'Community Lead',
      description: 'Leads volunteers',
      permissions: ['users:view', 'users:update'],
    });
    expect(clientQuery.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO roles'))).toBe(
      true
    );
    const createRoleCall = clientQuery.mock.calls.find(([sql]) =>
      String(sql).includes('INSERT INTO roles')
    );
    expect(createRoleCall?.[1]).toEqual(['community-lead', 'Leads volunteers']);
    expect(
      clientQuery.mock.calls.filter(([sql]) => String(sql).includes('INSERT INTO role_permissions'))
    ).toHaveLength(2);

    roleCatalogRows = [
      {
        id: 'role-1',
        name: 'team-lead',
        description: 'Updated',
        is_system: false,
        priority: 0,
        user_count: '0',
        permissions: ['users:view'],
      },
    ];

    const updated = await updateRole('role-1', {
      name: 'Team Lead',
      description: 'Updated',
      permissions: ['users:view'],
    });

    expect(updated).toMatchObject({
      id: 'role-1',
      name: 'team-lead',
      label: 'Team Lead',
      description: 'Updated',
      permissions: ['users:view'],
    });
    expect(clientQuery.mock.calls.some(([sql]) => String(sql).includes('UPDATE users'))).toBe(true);
    expect(
      clientQuery.mock.calls.some(([sql]) => String(sql).includes('UPDATE user_invitations'))
    ).toBe(true);
    expect(
      clientQuery.mock.calls.some(([sql]) => String(sql).includes('UPDATE registration_settings'))
    ).toBe(true);
    expect(clientQuery.mock.calls.some(([sql]) => String(sql).includes('UPDATE roles SET name'))).toBe(
      true
    );

    await expect(
      deleteRole('role-1')
    ).resolves.toBeUndefined();
    expect(clientQuery.mock.calls.some(([sql]) => String(sql).includes('DELETE FROM roles'))).toBe(
      true
    );
  });

  it('refuses to delete system roles', async () => {
    const clientQuery = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
        return { rows: [] };
      }

      if (sql.includes('FROM roles') && sql.includes('WHERE id = $1') && sql.includes('is_system')) {
        return {
          rows: [{ id: 'role-1', name: 'admin', is_system: true }],
        };
      }

      return { rows: [] };
    });

    mockConnect.mockResolvedValue({
      query: clientQuery,
      release: jest.fn(),
    });

    await expect(deleteRole('role-1')).rejects.toThrow('System roles cannot be deleted');
  });
});
