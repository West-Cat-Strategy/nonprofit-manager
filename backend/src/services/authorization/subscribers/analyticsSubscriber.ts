import {
  ANALYTICS_CAPABILITIES,
  hasAnalyticsPermission,
  type AnalyticsCapability,
} from '@middleware/analyticsAuth';
import type {
  AnalyticsCapabilityMatrix,
  AuthorizationSubscriberContext,
} from '@app-types/authorization';
import type { AuthorizationSubscriber } from './types';

const SOURCE = 'analytics_subscriber';

export const hasAnalyticsCapabilityAccess = (
  primaryRole: string,
  capability: AnalyticsCapability,
  roles?: string[]
): boolean => {
  const candidates = roles && roles.length > 0 ? roles : [primaryRole];
  return candidates.some((role) => hasAnalyticsPermission(role, capability));
};

const buildAnalyticsCapabilityMatrix = (
  context: AuthorizationSubscriberContext
): AnalyticsCapabilityMatrix => {
  const matrix: AnalyticsCapabilityMatrix = {};

  for (const capability of ANALYTICS_CAPABILITIES) {
    matrix[capability] = {
      allowed: context.roles.some((role) => hasAnalyticsPermission(role, capability)),
      source: SOURCE,
    };
  }

  return matrix;
};

export const analyticsSubscriber: AuthorizationSubscriber = {
  id: SOURCE,
  async collect(context: AuthorizationSubscriberContext) {
    return {
      analyticsCapabilities: buildAnalyticsCapabilityMatrix(context),
    };
  },
};
