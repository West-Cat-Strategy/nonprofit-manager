import type { Pool, PoolClient } from 'pg';
import pool from '@config/database';

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
}

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

export const PENDING_REGISTRATION_COLUMNS_WITH_PASSWORD = [
  ...PENDING_REGISTRATION_COLUMNS.split(', '),
  'password_hash',
].join(', ');

export const findPendingByEmail = async (
  email: string,
  db: Pool | PoolClient = pool
): Promise<string | null> => {
  const result = await db.query(
    "SELECT id FROM pending_registrations WHERE email = $1 AND status = 'pending'",
    [email]
  );
  return result.rows[0]?.id || null;
};

export const findUserByEmail = async (
  email: string,
  db: Pool | PoolClient = pool
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
  db: Pool | PoolClient = pool
): Promise<PendingRegistrationRow> => {
  const result = await db.query<PendingRegistrationRow>(
    `INSERT INTO pending_registrations (email, password_hash, first_name, last_name, status)
     VALUES ($1, $2, $3, $4, 'pending')
     RETURNING ${PENDING_REGISTRATION_COLUMNS}`,
    [input.email, input.passwordHash, input.firstName ?? null, input.lastName ?? null]
  );
  return result.rows[0];
};

export const getPendingRegistrations = async (
  status?: PendingStatus,
  db: Pool | PoolClient = pool
): Promise<PendingRegistrationRow[]> => {
  let query = `SELECT ${PENDING_REGISTRATION_COLUMNS} FROM pending_registrations`;
  const params: any[] = [];

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
  db: Pool | PoolClient = pool
): Promise<PendingRegistrationRow | null> => {
  const columns = includePassword
    ? PENDING_REGISTRATION_COLUMNS_WITH_PASSWORD
    : PENDING_REGISTRATION_COLUMNS;
  const result = await db.query<PendingRegistrationRow>(
    `SELECT ${columns} FROM pending_registrations WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
};

export const updatePendingStatus = async (
  id: string,
  status: PendingStatus,
  reviewedBy: string,
  reason: string | null = null,
  db: Pool | PoolClient = pool
): Promise<PendingRegistrationRow> => {
  const result = await db.query<PendingRegistrationRow>(
    `UPDATE pending_registrations
     SET status = $1,
         reviewed_by = $2,
         reviewed_at = NOW(),
         rejection_reason = $3,
         updated_at = NOW()
     WHERE id = $4
     RETURNING ${PENDING_REGISTRATION_COLUMNS}`,
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
  },
  db: Pool | PoolClient = pool
): Promise<{ id: string; email: string; first_name: string; last_name: string; role: string }> => {
  const result = await db.query<{ id: string; email: string; first_name: string; last_name: string; role: string }>(
    `INSERT INTO users (email, password_hash, first_name, last_name, role, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     RETURNING id, email, first_name, last_name, role`,
    [input.email, input.passwordHash, input.firstName, input.lastName, input.role]
  );
  return result.rows[0];
};

export const listAdminEmails = async (db: Pool | PoolClient = pool): Promise<string[]> => {
  const result = await db.query<{ email: string }>(
    "SELECT email FROM users WHERE role = 'admin' AND COALESCE(is_active, true) = true"
  );
  return result.rows.map((row) => row.email);
};
