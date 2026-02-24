export interface AuthorizationDecision {
  allowed: boolean;
  source: string;
}

export interface DbPermissionDecision extends AuthorizationDecision {
  resource: string;
  action: string;
}

export interface FieldAccessDecision {
  canRead: boolean;
  canWrite: boolean;
  maskOnRead: boolean;
  maskType: string | null;
  source: string;
}

export type StaticPermissionMatrix = Record<string, AuthorizationDecision>;
export type AnalyticsCapabilityMatrix = Record<string, AuthorizationDecision>;
export type DbPermissionMatrix = Record<string, DbPermissionDecision>;
export type FieldAccessMatrix = Record<string, Record<string, FieldAccessDecision>>;

export interface AuthorizationMatrix {
  staticPermissions: StaticPermissionMatrix;
  analyticsCapabilities: AnalyticsCapabilityMatrix;
  dbPermissions: DbPermissionMatrix;
  fieldAccess: FieldAccessMatrix;
}

export interface AuthorizationSnapshotUser {
  id: string;
  primaryRole: string;
  roles: string[];
  organizationId?: string;
}

export interface AuthorizationSnapshot {
  user: AuthorizationSnapshotUser;
  matrix: AuthorizationMatrix;
  generatedAt: string;
  policyVersion: string;
}

export interface AuthorizationSubscriberContext {
  userId: string;
  primaryRole: string;
  roles: string[];
  organizationId?: string;
}

export interface AuthorizationSubscriberOutput {
  staticPermissions?: StaticPermissionMatrix;
  analyticsCapabilities?: AnalyticsCapabilityMatrix;
  dbPermissions?: DbPermissionMatrix;
  fieldAccess?: FieldAccessMatrix;
}

export interface AuthorizationRequestContext {
  userId: string;
  primaryRole: string;
  roles: string[];
  organizationId?: string;
  hydratedAt?: string;
}

export interface AuthorizationKernelInput {
  userId: string;
  primaryRole: string;
  organizationId?: string;
}
