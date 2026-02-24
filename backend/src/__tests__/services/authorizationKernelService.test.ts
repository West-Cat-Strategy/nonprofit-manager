import { buildAuthorizationSnapshot } from '@services/authorization';

jest.mock('@config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockQuery = jest.fn();

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    query: (...args: unknown[]) => mockQuery(...args),
  },
}));

const permissionsRowsByUser: Record<string, Array<{ name: string; resource: string; action: string; allowed: boolean }>> = {
  'admin-id': [
    { name: 'admin:users', resource: 'users', action: 'manage', allowed: true },
    { name: 'report:view', resource: 'reports', action: 'read', allowed: true },
  ],
  'manager-id': [
    { name: 'admin:users', resource: 'users', action: 'manage', allowed: false },
    { name: 'report:view', resource: 'reports', action: 'read', allowed: true },
  ],
  'staff-id': [
    { name: 'admin:users', resource: 'users', action: 'manage', allowed: false },
    { name: 'report:view', resource: 'reports', action: 'read', allowed: true },
  ],
  'volunteer-id': [
    { name: 'admin:users', resource: 'users', action: 'manage', allowed: false },
    { name: 'report:view', resource: 'reports', action: 'read', allowed: false },
  ],
};

const fieldRowsByUser: Record<
  string,
  Array<{
    resource: string;
    field_name: string;
    can_read: boolean;
    can_write: boolean;
    mask_on_read: boolean;
    mask_type: string | null;
  }>
> = {
  'admin-id': [
    {
      resource: 'contacts',
      field_name: 'email',
      can_read: true,
      can_write: true,
      mask_on_read: false,
      mask_type: null,
    },
  ],
  'manager-id': [
    {
      resource: 'contacts',
      field_name: 'email',
      can_read: true,
      can_write: true,
      mask_on_read: false,
      mask_type: null,
    },
  ],
  'staff-id': [
    {
      resource: 'contacts',
      field_name: 'phone',
      can_read: true,
      can_write: false,
      mask_on_read: true,
      mask_type: 'phone',
    },
  ],
  'volunteer-id': [
    {
      resource: 'contacts',
      field_name: 'email',
      can_read: true,
      can_write: false,
      mask_on_read: true,
      mask_type: 'email',
    },
  ],
};

const installStandardDbMock = () => {
  mockQuery.mockImplementation(async (sql: unknown, params?: unknown[]) => {
    const text = String(sql);
    const userId = (params?.[0] as string) || '';

    if (text.includes("to_regclass('public.roles') as roles_table")) {
      return {
        rows: [{ roles_table: 'roles', user_roles_table: 'user_roles' }],
      };
    }

    if (text.includes('FROM user_roles ur') && text.includes('INNER JOIN roles r')) {
      const roleByUser: Record<string, string> = {
        'admin-id': 'admin',
        'manager-id': 'manager',
        'staff-id': 'staff',
        'volunteer-id': 'volunteer',
      };

      return {
        rows: [{ name: roleByUser[userId] || 'user' }],
      };
    }

    if (text.includes("to_regclass('public.permissions') as permissions_table")) {
      return {
        rows: [
          {
            permissions_table: 'permissions',
            role_permissions_table: 'role_permissions',
            user_roles_table: 'user_roles',
          },
        ],
      };
    }

    if (text.includes('FROM permissions p')) {
      return {
        rows: permissionsRowsByUser[userId] || [],
      };
    }

    if (text.includes("to_regclass('public.field_access_rules') as field_access_rules_table")) {
      return {
        rows: [
          {
            field_access_rules_table: 'field_access_rules',
            roles_table: 'roles',
            user_roles_table: 'user_roles',
          },
        ],
      };
    }

    if (text.includes('FROM field_access_rules far')) {
      return {
        rows: fieldRowsByUser[userId] || [],
      };
    }

    throw new Error(`Unexpected query in test: ${text}`);
  });
};

describe('authorizationKernelService', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('builds a full matrix for admin, manager, staff, and volunteer roles', async () => {
    installStandardDbMock();

    const cases = [
      { userId: 'admin-id', role: 'admin' },
      { userId: 'manager-id', role: 'manager' },
      { userId: 'staff-id', role: 'staff' },
      { userId: 'volunteer-id', role: 'volunteer' },
    ];

    for (const testCase of cases) {
      const snapshot = await buildAuthorizationSnapshot({
        userId: testCase.userId,
        primaryRole: testCase.role,
      });

      expect(snapshot.user.id).toBe(testCase.userId);
      expect(snapshot.user.primaryRole).toBe(testCase.role);
      expect(snapshot.user.roles).toContain(testCase.role);
      expect(snapshot.matrix).toHaveProperty('staticPermissions');
      expect(snapshot.matrix).toHaveProperty('analyticsCapabilities');
      expect(snapshot.matrix).toHaveProperty('dbPermissions');
      expect(snapshot.matrix).toHaveProperty('fieldAccess');
      expect(snapshot.generatedAt).toEqual(expect.any(String));
      expect(snapshot.policyVersion).toBe('p3-t4-auth-kernel-v1');
    }
  });

  it('keeps static and analytics matrices aligned with role capabilities', async () => {
    installStandardDbMock();

    const adminSnapshot = await buildAuthorizationSnapshot({
      userId: 'admin-id',
      primaryRole: 'admin',
    });

    const staffSnapshot = await buildAuthorizationSnapshot({
      userId: 'staff-id',
      primaryRole: 'staff',
    });

    expect(adminSnapshot.matrix.staticPermissions['admin:users']).toMatchObject({
      allowed: true,
      source: 'static_permission_subscriber',
    });
    expect(staffSnapshot.matrix.staticPermissions['admin:users']).toMatchObject({
      allowed: false,
      source: 'static_permission_subscriber',
    });

    expect(adminSnapshot.matrix.analyticsCapabilities.canViewOrgAnalytics).toMatchObject({
      allowed: true,
      source: 'analytics_subscriber',
    });
    expect(staffSnapshot.matrix.analyticsCapabilities.canViewAccountAnalytics).toMatchObject({
      allowed: false,
      source: 'analytics_subscriber',
    });
  });

  it('gracefully falls back when role/permission/field tables are unavailable', async () => {
    mockQuery.mockImplementation(async (sql: unknown) => {
      const text = String(sql);

      if (text.includes("to_regclass('public.roles') as roles_table")) {
        return {
          rows: [{ roles_table: null, user_roles_table: null }],
        };
      }

      if (text.includes("to_regclass('public.permissions') as permissions_table")) {
        return {
          rows: [
            {
              permissions_table: null,
              role_permissions_table: null,
              user_roles_table: null,
            },
          ],
        };
      }

      if (text.includes("to_regclass('public.field_access_rules') as field_access_rules_table")) {
        return {
          rows: [
            {
              field_access_rules_table: null,
              roles_table: null,
              user_roles_table: null,
            },
          ],
        };
      }

      throw new Error(`Unexpected query in fallback test: ${text}`);
    });

    const snapshot = await buildAuthorizationSnapshot({
      userId: 'user-fallback',
      primaryRole: 'manager',
    });

    expect(snapshot.user.roles).toEqual(['manager']);
    expect(snapshot.matrix.dbPermissions).toEqual({});
    expect(snapshot.matrix.fieldAccess).toEqual({});
    expect(snapshot.matrix.staticPermissions['report:view']).toBeDefined();
    expect(snapshot.matrix.analyticsCapabilities.canViewOrgAnalytics).toBeDefined();
  });
});
