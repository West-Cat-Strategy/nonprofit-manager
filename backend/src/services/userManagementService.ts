import pool from '@config/database';
import { normalizeRoleSlug, ROLE_SLUG_ALIASES, slugifyRoleName } from '@utils/roleSlug';

export interface UserRecord {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  profile_picture?: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface UserIdRow {
  id: string;
}

interface UserRoleRow {
  id: string;
  role: string;
}

interface UserIdentityRow {
  id: string;
  email: string;
}

interface UserRoleIdentityRow {
  id: string;
  role: string;
  email: string;
}

interface CountRow {
  count: string;
}

const normalizeUserRole = (role: string): string => normalizeRoleSlug(role) ?? role;

const getRoleLookupValues = (role: string): string[] => {
  const normalized = normalizeRoleSlug(role);
  if (!normalized) {
    return [];
  }

  const lookupValues = new Set<string>([normalized, slugifyRoleName(role)]);
  for (const [alias, canonical] of Object.entries(ROLE_SLUG_ALIASES)) {
    if (canonical === normalized) {
      lookupValues.add(alias);
    }
  }

  return Array.from(lookupValues);
};

export interface ListUsersFilters {
  search?: string;
  role?: string;
  isActive?: boolean;
}

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: string;
  createdBy: string;
}

export interface UpdateUserInput {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  isActive?: boolean;
  modifiedBy: string;
}

export const listUsers = async (filters: ListUsersFilters): Promise<UserRecord[]> => {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters.search) {
    conditions.push(`(
      first_name ILIKE $${paramIndex} OR
      last_name ILIKE $${paramIndex} OR
      email ILIKE $${paramIndex} OR
      CONCAT(first_name, ' ', last_name) ILIKE $${paramIndex}
    )`);
    params.push(`%${filters.search}%`);
    paramIndex += 1;
  }

  if (filters.role) {
    const roleValues = getRoleLookupValues(filters.role);
    if (roleValues.length > 0) {
      conditions.push(`role = ANY($${paramIndex}::text[])`);
      params.push(roleValues);
      paramIndex += 1;
    }
  }

  if (typeof filters.isActive === 'boolean') {
    conditions.push(`is_active = $${paramIndex}`);
    params.push(filters.isActive);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await pool.query<UserRecord>(
    `SELECT id, email, first_name, last_name, role, profile_picture, is_active, created_at, updated_at
     FROM users
     ${whereClause}
     ORDER BY created_at DESC`,
    params
  );

  return result.rows.map((row) => ({
    ...row,
    role: normalizeUserRole(row.role),
  }));
};

export const getUserById = async (id: string): Promise<UserRecord | null> => {
  const result = await pool.query<UserRecord>(
    `SELECT id, email, first_name, last_name, role, profile_picture, is_active, created_at, updated_at
     FROM users
     WHERE id = $1`,
    [id]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    ...row,
    role: normalizeUserRole(row.role),
  };
};

export const findUserByEmail = async (email: string): Promise<string | null> => {
  const result = await pool.query<UserIdRow>('SELECT id FROM users WHERE email = $1', [email]);
  return result.rows[0]?.id ?? null;
};

export const findUserByEmailExcludingId = async (
  email: string,
  excludedId: string
): Promise<string | null> => {
  const result = await pool.query<UserIdRow>(
    'SELECT id FROM users WHERE email = $1 AND id != $2',
    [email, excludedId]
  );
  return result.rows[0]?.id ?? null;
};

export const createUser = async (input: CreateUserInput): Promise<UserRecord> => {
  const normalizedRole = normalizeUserRole(input.role);
  const result = await pool.query<UserRecord>(
    `INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, created_at, updated_at, created_by)
     VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW(), $6)
     RETURNING id, email, first_name, last_name, role, profile_picture, is_active, created_at, updated_at`,
    [
      input.email,
      input.passwordHash,
      input.firstName,
      input.lastName,
      normalizedRole,
      input.createdBy,
    ]
  );

  return {
    ...result.rows[0],
    role: normalizeUserRole(result.rows[0].role),
  };
};

export const getUserRoleById = async (id: string): Promise<UserRoleRow | null> => {
  const result = await pool.query<UserRoleRow>('SELECT id, role FROM users WHERE id = $1', [id]);
  const row = result.rows[0];
  return row ? { ...row, role: normalizeUserRole(row.role) } : null;
};

export const countActiveAdmins = async (): Promise<number> => {
  const result = await pool.query<CountRow>(
    "SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = true"
  );

  return Number.parseInt(result.rows[0]?.count ?? '0', 10);
};

export const updateUser = async (input: UpdateUserInput): Promise<UserRecord | null> => {
  const normalizedRole = input.role ? normalizeUserRole(input.role) : undefined;
  const result = await pool.query<UserRecord>(
    `UPDATE users
     SET email = COALESCE($1, email),
         first_name = COALESCE($2, first_name),
         last_name = COALESCE($3, last_name),
         role = COALESCE($4, role),
         is_active = COALESCE($5, is_active),
         updated_at = NOW(),
         modified_by = $6
     WHERE id = $7
     RETURNING id, email, first_name, last_name, role, profile_picture, is_active, created_at, updated_at`,
    [
      input.email,
      input.firstName,
      input.lastName,
      normalizedRole,
      input.isActive,
      input.modifiedBy,
      input.id,
    ]
  );

  const row = result.rows[0];
  return row
    ? {
        ...row,
        role: normalizeUserRole(row.role),
      }
    : null;
};

export const getUserIdentityById = async (id: string): Promise<UserIdentityRow | null> => {
  const result = await pool.query<UserIdentityRow>('SELECT id, email FROM users WHERE id = $1', [id]);
  return result.rows[0] ?? null;
};

export const updateUserPassword = async (
  id: string,
  passwordHash: string,
  modifiedBy: string
): Promise<void> => {
  await pool.query(
    `UPDATE users
     SET password_hash = $1, updated_at = NOW(), modified_by = $2
     WHERE id = $3`,
    [passwordHash, modifiedBy, id]
  );
};

export const getUserRoleIdentityById = async (id: string): Promise<UserRoleIdentityRow | null> => {
  const result = await pool.query<UserRoleIdentityRow>(
    'SELECT id, role, email FROM users WHERE id = $1',
    [id]
  );
  const row = result.rows[0];
  return row ? { ...row, role: normalizeUserRole(row.role) } : null;
};

export const deactivateUser = async (id: string, modifiedBy: string): Promise<void> => {
  await pool.query(
    `UPDATE users
     SET is_active = false, updated_at = NOW(), modified_by = $1
     WHERE id = $2`,
    [modifiedBy, id]
  );
};
