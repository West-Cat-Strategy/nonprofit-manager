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

export const resolveRolesForUser = async (
  userId: string,
  primaryRole: string
): Promise<string[]> => {
  try {
    if (!(await hasRoleTables())) {
      return [primaryRole];
    }

    const result = await pool.query<{ name: string }>(
      `SELECT r.name
       FROM user_roles ur
       INNER JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = $1
       ORDER BY r.priority DESC, r.name ASC`,
      [userId]
    );

    if (result.rows.length === 0) {
      return [primaryRole];
    }

    return unique([primaryRole, ...result.rows.map((row) => row.name)]);
  } catch (error) {
    logger.warn('Failed to resolve user roles for authorization kernel; using primary role fallback', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return [primaryRole];
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
  const roles = await resolveRolesForUser(input.userId, input.primaryRole);

  const context: AuthorizationSubscriberContext = {
    userId: input.userId,
    primaryRole: input.primaryRole,
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
  primaryRole,
  roles: unique(roles && roles.length > 0 ? roles : [primaryRole]),
  ...(organizationId ? { organizationId } : {}),
  hydratedAt: new Date().toISOString(),
});

export const hasRoleAccess = (
  primaryRole: string,
  allowedRoles: string[],
  roles?: string[]
): boolean => {
  const candidates = roles && roles.length > 0 ? roles : [primaryRole];
  return candidates.some((role) => allowedRoles.includes(role));
};

export {
  hasStaticPermissionAccess,
  hasAnyStaticPermissionAccess,
  hasAnalyticsCapabilityAccess,
};
