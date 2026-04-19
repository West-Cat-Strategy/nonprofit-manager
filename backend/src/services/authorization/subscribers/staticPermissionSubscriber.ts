import {
  hasAnyPermissionForRoles,
  hasPermissionForRoles,
  Permission,
} from '@utils/permissions';
import type {
  AuthorizationDecision,
  AuthorizationSubscriberContext,
  StaticPermissionMatrix,
} from '@app-types/authorization';
import type { AuthorizationSubscriber } from './types';

const SOURCE = 'static_permission_subscriber';
const STATIC_PERMISSIONS = Object.values(Permission);

const evaluatePermissionAcrossRoles = (
  roles: string[],
  permission: Permission | string
): AuthorizationDecision => ({
  allowed: hasPermissionForRoles(roles, permission),
  source: SOURCE,
});

export const hasStaticPermissionAccess = (
  primaryRole: string,
  permission: Permission | string,
  roles?: string[]
): boolean => {
  const candidates = roles && roles.length > 0 ? roles : [primaryRole];
  return hasPermissionForRoles(candidates, permission);
};

export const hasAnyStaticPermissionAccess = (
  primaryRole: string,
  permissions: (Permission | string)[],
  roles?: string[]
): boolean => {
  const candidates = roles && roles.length > 0 ? roles : [primaryRole];
  return hasAnyPermissionForRoles(candidates, permissions);
};

const buildStaticPermissionMatrix = (context: AuthorizationSubscriberContext): StaticPermissionMatrix => {
  const matrix: StaticPermissionMatrix = {};

  for (const permission of STATIC_PERMISSIONS) {
    matrix[permission] = evaluatePermissionAcrossRoles(context.roles, permission);
  }

  return matrix;
};

export const staticPermissionSubscriber: AuthorizationSubscriber = {
  id: SOURCE,
  async collect(context: AuthorizationSubscriberContext) {
    return {
      staticPermissions: buildStaticPermissionMatrix(context),
    };
  },
};
