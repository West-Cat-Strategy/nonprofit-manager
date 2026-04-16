import type { Pool, PoolClient } from 'pg';
import pool from '@config/database';

type DbClient = Pool | PoolClient;

export type PendingStatus = 'pending' | 'approved' | 'rejected';

export interface PendingRegistrationRow {
  id: string;
  email: string;
  password_hash: string;
  first_name: string | null;
  last_name: string | null;
  status: PendingStatus;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  rejection_reason: string | null;
  created_at: Date;
  updated_at: Date;
  has_staged_passkeys?: boolean;
}

export interface PendingRegistrationCredentialRow {
  id: string;
  pending_registration_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  transports: string[] | null;
  device_type: string | null;
  backed_up: boolean | null;
  name: string | null;
  created_at: Date;
}

export interface PendingRegistrationChallengeRow {
  id: string;
  pending_registration_id: string;
  challenge: string;
  type: string;
  expires_at: Date;
  created_at: Date;
}

const hasPendingPasskeyTables = async (db: DbClient): Promise<boolean> => {
  const result = await db.query<{
    credentials_table: string | null;
    challenges_table: string | null;
  }>(
    `SELECT
       to_regclass('public.pending_registration_webauthn_credentials') AS credentials_table,
       to_regclass('public.pending_registration_webauthn_challenges') AS challenges_table`
  );
  return Boolean(result.rows[0]?.credentials_table && result.rows[0]?.challenges_table);
};

const hasUserPasskeyTable = async (db: DbClient): Promise<boolean> => {
  const result = await db.query<{ credentials_table: string | null }>(
    `SELECT to_regclass('public.user_webauthn_credentials') AS credentials_table`
  );
  return Boolean(result.rows[0]?.credentials_table);
};

export const PENDING_REGISTRATION_COLUMNS = [
  'id',
  'email',
  'first_name',
  'last_name',
  'status',
  'reviewed_by',
  'reviewed_at',
  'rejection_reason',
  'created_at',
  'updated_at',
].join(', ');

const pendingRegistrationSelectColumns = async (
  includePassword: boolean,
  db: DbClient
): Promise<string> => {
  const supportsPendingPasskeys = await hasPendingPasskeyTables(db);
  const columns = [
    PENDING_REGISTRATION_COLUMNS,
    ...(includePassword ? ['password_hash'] : []),
    ...(supportsPendingPasskeys
      ? [
          `EXISTS (
             SELECT 1
             FROM pending_registration_webauthn_credentials prwc
             WHERE prwc.pending_registration_id = pending_registrations.id
           ) AS has_staged_passkeys`,
        ]
      : []),
  ];
  return columns.join(', ');
};

export const findPendingByEmail = async (
  email: string,
  db: DbClient = pool
): Promise<string | null> => {
  const result = await db.query(
    "SELECT id FROM pending_registrations WHERE email = $1 AND status = 'pending'",
    [email]
  );
  return result.rows[0]?.id || null;
};

export const findUserByEmail = async (
  email: string,
  db: DbClient = pool
): Promise<string | null> => {
  const result = await db.query('SELECT id FROM users WHERE email = $1', [email]);
  return result.rows[0]?.id || null;
};

export const insertPendingRegistration = async (
  input: {
    email: string;
    passwordHash: string;
    firstName?: string;
    lastName?: string;
  },
  db: DbClient = pool
): Promise<PendingRegistrationRow> => {
  const selectColumns = await pendingRegistrationSelectColumns(false, db);
  const result = await db.query<PendingRegistrationRow>(
    `INSERT INTO pending_registrations (email, password_hash, first_name, last_name, status)
     VALUES ($1, $2, $3, $4, 'pending')
     RETURNING ${selectColumns}`,
    [input.email, input.passwordHash, input.firstName ?? null, input.lastName ?? null]
  );
  return result.rows[0];
};

export const getPendingRegistrations = async (
  status?: PendingStatus,
  db: DbClient = pool
): Promise<PendingRegistrationRow[]> => {
  const selectColumns = await pendingRegistrationSelectColumns(false, db);
  let query = `SELECT ${selectColumns} FROM pending_registrations`;
  const params: unknown[] = [];

  if (status) {
    query += ' WHERE status = $1';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';

  const result = await db.query<PendingRegistrationRow>(query, params);
  return result.rows;
};

export const getPendingRegistrationById = async (
  id: string,
  includePassword = false,
  db: DbClient = pool
): Promise<PendingRegistrationRow | null> => {
  const selectColumns = await pendingRegistrationSelectColumns(includePassword, db);
  const result = await db.query<PendingRegistrationRow>(
    `SELECT ${selectColumns}
     FROM pending_registrations
     WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
};

export const getPendingRegistrationByEmail = async (
  email: string,
  includePassword = false,
  db: DbClient = pool
): Promise<PendingRegistrationRow | null> => {
  const selectColumns = await pendingRegistrationSelectColumns(includePassword, db);
  const result = await db.query<PendingRegistrationRow>(
    `SELECT ${selectColumns}
     FROM pending_registrations
     WHERE LOWER(email) = LOWER($1)
       AND status = 'pending'
     ORDER BY created_at DESC
     LIMIT 1`,
    [email]
  );
  return result.rows[0] ?? null;
};

export const updatePendingStatus = async (
  id: string,
  status: PendingStatus,
  reviewedBy: string,
  reason: string | null = null,
  db: DbClient = pool
): Promise<PendingRegistrationRow> => {
  const selectColumns = await pendingRegistrationSelectColumns(false, db);
  const result = await db.query<PendingRegistrationRow>(
    `UPDATE pending_registrations
     SET status = $1,
         reviewed_by = $2,
         reviewed_at = NOW(),
         rejection_reason = $3,
         updated_at = NOW()
     WHERE id = $4
     RETURNING ${selectColumns}`,
    [status, reviewedBy, reason, id]
  );
  return result.rows[0];
};

export const createRealUser = async (
  input: {
    email: string;
    passwordHash: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
    createdBy?: string | null;
    modifiedBy?: string | null;
  },
  db: DbClient = pool
): Promise<{ id: string; email: string; first_name: string; last_name: string; role: string }> => {
  const result = await db.query<{
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  }>(
    `INSERT INTO users (
       email,
       password_hash,
       first_name,
       last_name,
       role,
       created_at,
       updated_at,
       created_by,
       modified_by
     )
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), $6, $7)
     RETURNING id, email, first_name, last_name, role`,
    [
      input.email,
      input.passwordHash,
      input.firstName,
      input.lastName,
      input.role,
      input.createdBy ?? null,
      input.modifiedBy ?? null,
    ]
  );
  return result.rows[0];
};

export const listAdminEmails = async (db: DbClient = pool): Promise<string[]> => {
  const result = await db.query<{ email: string }>(
    "SELECT email FROM users WHERE role = 'admin' AND COALESCE(is_active, true) = true"
  );
  return result.rows.map((row) => row.email);
};

export const insertPendingRegistrationChallenge = async (
  input: {
    pendingRegistrationId: string;
    challenge: string;
    type: string;
    expiresInMs: number;
  },
  db: DbClient = pool
): Promise<PendingRegistrationChallengeRow> => {
  if (!(await hasPendingPasskeyTables(db))) {
    throw new Error('Pending passkey staging is unavailable');
  }

  const result = await db.query<PendingRegistrationChallengeRow>(
    `INSERT INTO pending_registration_webauthn_challenges
       (pending_registration_id, challenge, type, expires_at)
     VALUES ($1, $2, $3, NOW() + ($4 * INTERVAL '1 millisecond'))
     RETURNING id, pending_registration_id, challenge, type, expires_at, created_at`,
    [input.pendingRegistrationId, input.challenge, input.type, input.expiresInMs]
  );
  return result.rows[0];
};

export const getPendingRegistrationChallengeById = async (
  id: string,
  db: DbClient = pool
): Promise<PendingRegistrationChallengeRow | null> => {
  if (!(await hasPendingPasskeyTables(db))) {
    return null;
  }

  const result = await db.query<PendingRegistrationChallengeRow>(
    `SELECT id, pending_registration_id, challenge, type, expires_at, created_at
     FROM pending_registration_webauthn_challenges
     WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
};

export const deletePendingRegistrationChallenge = async (
  id: string,
  db: DbClient = pool
): Promise<void> => {
  if (!(await hasPendingPasskeyTables(db))) {
    return;
  }

  await db.query('DELETE FROM pending_registration_webauthn_challenges WHERE id = $1', [id]);
};

export const pendingCredentialExists = async (
  credentialId: string,
  db: DbClient = pool
): Promise<boolean> => {
  if (!(await hasPendingPasskeyTables(db))) {
    return false;
  }

  const result = await db.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM pending_registration_webauthn_credentials
       WHERE credential_id = $1
     ) AS exists`,
    [credentialId]
  );
  return result.rows[0]?.exists === true;
};

export const userCredentialExists = async (
  credentialId: string,
  db: DbClient = pool
): Promise<boolean> => {
  if (!(await hasUserPasskeyTable(db))) {
    return false;
  }

  const result = await db.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM user_webauthn_credentials
       WHERE credential_id = $1
     ) AS exists`,
    [credentialId]
  );
  return result.rows[0]?.exists === true;
};

export const insertPendingRegistrationCredential = async (
  input: {
    pendingRegistrationId: string;
    credentialId: string;
    publicKey: string;
    counter: number;
    transports: string[] | null;
    deviceType: string | null;
    backedUp: boolean | null;
    name?: string | null;
  },
  db: DbClient = pool
): Promise<PendingRegistrationCredentialRow> => {
  if (!(await hasPendingPasskeyTables(db))) {
    throw new Error('Pending passkey staging is unavailable');
  }

  const result = await db.query<PendingRegistrationCredentialRow>(
    `INSERT INTO pending_registration_webauthn_credentials
       (pending_registration_id, credential_id, public_key, counter, transports, device_type, backed_up, name)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id,
               pending_registration_id,
               credential_id,
               public_key,
               counter,
               transports,
               device_type,
               backed_up,
               name,
               created_at`,
    [
      input.pendingRegistrationId,
      input.credentialId,
      input.publicKey,
      input.counter,
      input.transports,
      input.deviceType,
      input.backedUp,
      input.name ?? null,
    ]
  );
  return result.rows[0];
};

export const listPendingRegistrationCredentials = async (
  pendingRegistrationId: string,
  db: DbClient = pool
): Promise<PendingRegistrationCredentialRow[]> => {
  if (!(await hasPendingPasskeyTables(db))) {
    return [];
  }

  const result = await db.query<PendingRegistrationCredentialRow>(
    `SELECT id,
            pending_registration_id,
            credential_id,
            public_key,
            counter,
            transports,
            device_type,
            backed_up,
            name,
            created_at
     FROM pending_registration_webauthn_credentials
     WHERE pending_registration_id = $1
     ORDER BY created_at ASC`,
    [pendingRegistrationId]
  );
  return result.rows;
};

export const deletePendingRegistrationPasskeyData = async (
  pendingRegistrationId: string,
  db: DbClient = pool
): Promise<void> => {
  if (!(await hasPendingPasskeyTables(db))) {
    return;
  }

  await db.query(
    'DELETE FROM pending_registration_webauthn_challenges WHERE pending_registration_id = $1',
    [pendingRegistrationId]
  );
  await db.query(
    'DELETE FROM pending_registration_webauthn_credentials WHERE pending_registration_id = $1',
    [pendingRegistrationId]
  );
};

export const attachPendingRegistrationCredentialsToUser = async (
  pendingRegistrationId: string,
  userId: string,
  db: DbClient = pool
): Promise<number> => {
  if (!(await hasPendingPasskeyTables(db)) || !(await hasUserPasskeyTable(db))) {
    return 0;
  }

  const credentials = await listPendingRegistrationCredentials(pendingRegistrationId, db);
  for (const credential of credentials) {
    await db.query(
      `INSERT INTO user_webauthn_credentials
         (user_id, credential_id, public_key, counter, transports, device_type, backed_up, name, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        userId,
        credential.credential_id,
        credential.public_key,
        credential.counter,
        credential.transports,
        credential.device_type,
        credential.backed_up,
        credential.name,
        credential.created_at,
      ]
    );
  }

  await deletePendingRegistrationPasskeyData(pendingRegistrationId, db);
  return credentials.length;
};
