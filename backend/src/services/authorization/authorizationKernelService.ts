import pool from '@config/database';
import { logger } from '@config/logger';
import type {
  AuthorizationKernelInput,
  AuthorizationMatrix,
  AuthorizationRequestContext,
  AuthorizationSnapshot,
  AuthorizationSubscriberContext,
} from '@app-types/authorization';
import {
  analyticsSubscriber,
  hasAnalyticsCapabilityAccess,
} from './subscribers/analyticsSubscriber';
import {
  dbPermissionSubscriber,
} from './subscribers/dbPermissionSubscriber';
import {
  fieldAccessSubscriber,
} from './subscribers/fieldAccessSubscriber';
import {
  hasAnyStaticPermissionAccess,
  hasStaticPermissionAccess,
  staticPermissionSubscriber,
} from './subscribers/staticPermissionSubscriber';
import type { AuthorizationSubscriber } from './subscribers/types';
import { normalizeRoleSlug } from '@utils/roleSlug';

const POLICY_VERSION = 'p3-t4-auth-kernel-v1';

const subscribers: AuthorizationSubscriber[] = [
  staticPermissionSubscriber,
  analyticsSubscriber,
  dbPermissionSubscriber,
  fieldAccessSubscriber,
];

const unique = (values: string[]): string[] => Array.from(new Set(values.filter(Boolean)));

const hasRoleTables = async (): Promise<boolean> => {
  const result = await pool.query<{
    roles_table: string | null;
    user_roles_table: string | null;
  }>(
    `SELECT
       to_regclass('public.roles') as roles_table,
       to_regclass('public.user_roles') as user_roles_table`
  );

  const row = result.rows[0];
  return Boolean(row?.roles_table && row?.user_roles_table);
};

const hasPolicyGroupTables = async (): Promise<boolean> => {
  const result = await pool.query<{
    policy_groups_table: string | null;
    policy_group_roles_table: string | null;
    user_policy_groups_table: string | null;
  }>(
    `SELECT
       to_regclass('public.policy_groups') as policy_groups_table,
       to_regclass('public.policy_group_roles') as policy_group_roles_table,
       to_regclass('public.user_policy_groups') as user_policy_groups_table`
  );

  const row = result.rows[0];
  return Boolean(row?.policy_groups_table && row?.policy_group_roles_table && row?.user_policy_groups_table);
};

export const resolveRolesForUser = async (
  userId: string,
  primaryRole: string
): Promise<string[]> => {
  const normalizedPrimaryRole = normalizeRoleSlug(primaryRole) ?? primaryRole;

  try {
    if (!(await hasRoleTables())) {
      return [normalizedPrimaryRole];
    }

    const directRolesPromise = pool.query<{ name: string }>(
      `SELECT r.name
       FROM user_roles ur
       INNER JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = $1
       ORDER BY r.priority DESC, r.name ASC`,
      [userId]
    );
    const groupRolesPromise = (await hasPolicyGroupTables())
      ? pool.query<{ name: string }>(
          `SELECT DISTINCT r.name
           FROM user_policy_groups upg
           INNER JOIN policy_group_roles pgr ON pgr.policy_group_id = upg.policy_group_id
           INNER JOIN roles r ON r.id = pgr.role_id
           WHERE upg.user_id = $1
           ORDER BY r.name ASC`,
          [userId]
        )
      : Promise.resolve({ rows: [] as Array<{ name: string }> });
    const [directRoles, groupRoles] = await Promise.all([directRolesPromise, groupRolesPromise]);

    if (directRoles.rows.length === 0 && groupRoles.rows.length === 0) {
      return [normalizedPrimaryRole];
    }

    return unique([
      normalizedPrimaryRole,
      ...directRoles.rows.map((row) => normalizeRoleSlug(row.name) ?? row.name),
      ...groupRoles.rows.map((row) => normalizeRoleSlug(row.name) ?? row.name),
    ]);
  } catch (error) {
    logger.warn('Failed to resolve user roles for authorization kernel; using primary role fallback', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return [normalizedPrimaryRole];
  }
};

const buildEmptyMatrix = (): AuthorizationMatrix => ({
  staticPermissions: {},
  analyticsCapabilities: {},
  dbPermissions: {},
  fieldAccess: {},
});

const mergeContextIntoMatrix = (
  matrix: AuthorizationMatrix,
  partial: Partial<AuthorizationMatrix>
): AuthorizationMatrix => ({
  staticPermissions: {
    ...matrix.staticPermissions,
    ...(partial.staticPermissions || {}),
  },
  analyticsCapabilities: {
    ...matrix.analyticsCapabilities,
    ...(partial.analyticsCapabilities || {}),
  },
  dbPermissions: {
    ...matrix.dbPermissions,
    ...(partial.dbPermissions || {}),
  },
  fieldAccess: {
    ...matrix.fieldAccess,
    ...(partial.fieldAccess || {}),
  },
});

export const buildAuthorizationSnapshot = async (
  input: AuthorizationKernelInput
): Promise<AuthorizationSnapshot> => {
  const normalizedPrimaryRole = normalizeRoleSlug(input.primaryRole) ?? input.primaryRole;
  const roles = await resolveRolesForUser(input.userId, normalizedPrimaryRole);

  const context: AuthorizationSubscriberContext = {
    userId: input.userId,
    primaryRole: normalizedPrimaryRole,
    roles,
    organizationId: input.organizationId,
  };

  let matrix = buildEmptyMatrix();

  for (const subscriber of subscribers) {
    try {
      const output = await subscriber.collect(context);
      matrix = mergeContextIntoMatrix(matrix, output);
    } catch (error) {
      logger.warn('Authorization subscriber failed; using empty fallback for subscriber output', {
        subscriber: subscriber.id,
        userId: context.userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    user: {
      id: context.userId,
      primaryRole: context.primaryRole,
      roles: context.roles,
      ...(context.organizationId ? { organizationId: context.organizationId } : {}),
    },
    matrix,
    generatedAt: new Date().toISOString(),
    policyVersion: POLICY_VERSION,
  };
};

export const createRequestAuthorizationContext = (
  userId: string,
  primaryRole: string,
  organizationId?: string,
  roles?: string[]
): AuthorizationRequestContext => ({
  userId,
  primaryRole: normalizeRoleSlug(primaryRole) ?? primaryRole,
  roles: unique(
    (roles && roles.length > 0 ? roles : [primaryRole]).map((role) => normalizeRoleSlug(role) ?? role)
  ),
  ...(organizationId ? { organizationId } : {}),
  hydratedAt: new Date().toISOString(),
});

export const hasRoleAccess = (
  primaryRole: string,
  allowedRoles: string[],
  roles?: string[]
): boolean => {
  const allowed = new Set(allowedRoles.map((role) => normalizeRoleSlug(role) ?? role));
  const candidates = roles && roles.length > 0 ? roles : [primaryRole];
  return candidates.some((role) => allowed.has(normalizeRoleSlug(role) ?? role));
};

export {
  hasStaticPermissionAccess,
  hasAnyStaticPermissionAccess,
  hasAnalyticsCapabilityAccess,
};
