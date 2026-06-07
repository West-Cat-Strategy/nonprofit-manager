import { randomUUID } from 'crypto';
import pool from '@config/database';
import {
  resolveDefaultOrganizationAccessLevel,
  upsertUserOrganizationAccess,
  type OrganizationAccessLevel,
} from '@services/accountAccessService';
import { issueAppSessionToken } from '@utils/sessionTokens';

export const INTEGRATION_PASSWORD_HASH =
  '$2a$10$012345678901234567890uI6TTMsnx6Vf7hYhVJrV2N4mcoX8f6mG';

export interface IntegrationUser {
  id: string;
  email: string;
  role: string;
}

export interface IntegrationOrganization {
  id: string;
  accountNumber: string;
  name: string;
}

export interface IntegrationAuthContext {
  userId: string;
  email: string;
  role: string;
  organizationId: string;
  organizationAccountNumber: string;
  authToken: string;
}

const uniqueSuffix = (): string => `${Date.now()}-${randomUUID().slice(0, 8)}`;

export const createIntegrationUser = async (
  input: {
    id?: string;
    email?: string;
    emailPrefix?: string;
    passwordHash?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    isActive?: boolean;
  } = {}
): Promise<IntegrationUser> => {
  const id = input.id ?? randomUUID();
  const role = input.role ?? 'admin';
  const email =
    input.email ??
    `${input.emailPrefix ?? 'integration-user'}-${uniqueSuffix()}@example.com`.toLowerCase();

  await pool.query(
    `INSERT INTO users (
       id,
       email,
       password_hash,
       first_name,
       last_name,
       role,
       is_active,
       created_at,
       updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     ON CONFLICT (id)
     DO UPDATE SET
       email = EXCLUDED.email,
       password_hash = EXCLUDED.password_hash,
       first_name = EXCLUDED.first_name,
       last_name = EXCLUDED.last_name,
       role = EXCLUDED.role,
       is_active = EXCLUDED.is_active,
       updated_at = NOW()`,
    [
      id,
      email,
      input.passwordHash ?? INTEGRATION_PASSWORD_HASH,
      input.firstName ?? 'Integration',
      input.lastName ?? 'User',
      role,
      input.isActive ?? true,
    ]
  );

  return { id, email, role };
};

export const createIntegrationOrganization = async (
  input: {
    id?: string;
    accountName?: string;
    accountNumber?: string;
    createdBy?: string | null;
    isActive?: boolean;
  } = {}
): Promise<IntegrationOrganization> => {
  const id = input.id ?? randomUUID();
  const suffix = uniqueSuffix();
  const accountNumber = input.accountNumber ?? `ORG-${suffix}`;
  const name = input.accountName ?? `Integration Organization ${suffix}`;

  await pool.query(
    `INSERT INTO accounts (
       id,
       account_number,
       account_name,
       account_type,
       is_active,
       created_by,
       modified_by,
       created_at,
       updated_at
     )
     VALUES ($1, $2, $3, 'organization', $4, $5, $5, NOW(), NOW())
     ON CONFLICT (id)
     DO UPDATE SET
       account_number = EXCLUDED.account_number,
       account_name = EXCLUDED.account_name,
       account_type = 'organization',
       is_active = EXCLUDED.is_active,
       modified_by = EXCLUDED.modified_by,
       updated_at = NOW()`,
    [id, accountNumber, name, input.isActive ?? true, input.createdBy ?? null]
  );

  return { id, accountNumber, name };
};

export const grantIntegrationOrganizationAccess = async (input: {
  userId: string;
  organizationId: string;
  role?: string;
  accessLevel?: OrganizationAccessLevel;
  grantedBy?: string | null;
}): Promise<void> => {
  await upsertUserOrganizationAccess({
    userId: input.userId,
    accountId: input.organizationId,
    accessLevel:
      input.accessLevel ?? resolveDefaultOrganizationAccessLevel(input.role ?? 'viewer'),
    grantedBy: input.grantedBy ?? input.userId,
  });
};

export const issueIntegrationAppToken = (input: {
  userId: string;
  email: string;
  role: string;
  organizationId?: string | null;
  authRevision?: number;
}): string =>
  issueAppSessionToken({
    id: input.userId,
    email: input.email,
    role: input.role,
    organizationId: input.organizationId ?? null,
    authRevision: input.authRevision ?? 0,
  });

export const createIntegrationAuthContext = async (
  input: {
    role?: string;
    emailPrefix?: string;
    accountName?: string;
    passwordHash?: string;
    accessLevel?: OrganizationAccessLevel;
    includeOrganizationInToken?: boolean;
  } = {}
): Promise<IntegrationAuthContext> => {
  const user = await createIntegrationUser({
    emailPrefix: input.emailPrefix,
    passwordHash: input.passwordHash,
    role: input.role ?? 'admin',
  });
  const organization = await createIntegrationOrganization({
    accountName: input.accountName,
    createdBy: user.id,
  });

  await grantIntegrationOrganizationAccess({
    userId: user.id,
    organizationId: organization.id,
    role: user.role,
    accessLevel: input.accessLevel,
    grantedBy: user.id,
  });

  const authToken = issueIntegrationAppToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    organizationId:
      input.includeOrganizationInToken === false ? null : organization.id,
  });

  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    organizationId: organization.id,
    organizationAccountNumber: organization.accountNumber,
    authToken,
  };
};

export const deleteIntegrationAuthFixtures = async (input: {
  userIds?: string[];
  organizationIds?: string[];
}): Promise<void> => {
  const userIds = input.userIds?.filter(Boolean) ?? [];
  const organizationIds = input.organizationIds?.filter(Boolean) ?? [];

  if (userIds.length > 0) {
    await pool.query('DELETE FROM user_account_access WHERE user_id = ANY($1::uuid[])', [
      userIds,
    ]);
  }

  if (organizationIds.length > 0) {
    await pool.query('DELETE FROM user_account_access WHERE account_id = ANY($1::uuid[])', [
      organizationIds,
    ]);
    await pool.query('DELETE FROM accounts WHERE id = ANY($1::uuid[])', [
      organizationIds,
    ]);
  }

  if (userIds.length > 0) {
    await pool.query(
      `DELETE FROM user_account_access
       WHERE account_id IN (
         SELECT id
         FROM accounts
         WHERE created_by = ANY($1::uuid[])
            OR modified_by = ANY($1::uuid[])
       )`,
      [userIds]
    );
    await pool.query(
      `DELETE FROM accounts
       WHERE created_by = ANY($1::uuid[])
          OR modified_by = ANY($1::uuid[])`,
      [userIds]
    );
  }

  if (userIds.length > 0) {
    await pool.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [userIds]);
  }
};
