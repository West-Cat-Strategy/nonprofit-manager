import pool from '@config/database';

interface ContactIdRow {
  id: string;
}

interface PortalUserIdRow {
  id: string;
}

interface SignupRequestIdRow {
  id: string;
}

export interface PortalLoginUserRow {
  id: string;
  email: string;
  password_hash: string;
  contact_id: string | null;
  status: string;
  is_verified: boolean;
}

export interface PortalUserProfileRow {
  id: string;
  email: string;
  contact_id: string | null;
  status: string;
  is_verified: boolean;
  created_at: Date;
  last_login_at: Date | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  mobile_phone: string | null;
}

export interface PortalInvitationRow {
  id: string;
  email: string;
  contact_id: string | null;
  created_by: string | null;
  expires_at: Date;
  accepted_at: Date | null;
}

export interface PortalUserAuthRow {
  id: string;
  email: string;
  contact_id: string | null;
}

export const findContactIdByEmail = async (email: string): Promise<string | null> => {
  const result = await pool.query<ContactIdRow>('SELECT id FROM contacts WHERE email = $1', [email]);
  return result.rows[0]?.id ?? null;
};

export const createContactForSignup = async (input: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}): Promise<string> => {
  const result = await pool.query<ContactIdRow>(
    `INSERT INTO contacts (
      first_name, last_name, email, phone, created_by, modified_by
    ) VALUES ($1, $2, $3, $4, $5, $5)
    RETURNING id`,
    [input.firstName, input.lastName, input.email, input.phone || null, null]
  );

  return result.rows[0].id;
};

export const getOrCreateContactForSignup = async (input: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}): Promise<string> => {
  const result = await pool.query<ContactIdRow>(
    'SELECT public.portal_resolve_signup_contact_id($1, $2, $3, $4) AS id',
    [input.firstName, input.lastName, input.email, input.phone || null]
  );
  return result.rows[0].id;
};

export const findPortalUserIdByEmail = async (email: string): Promise<string | null> => {
  const result = await pool.query<PortalUserIdRow>('SELECT id FROM portal_users WHERE email = $1', [email]);
  return result.rows[0]?.id ?? null;
};

export const findPendingSignupRequestIdByEmail = async (email: string): Promise<string | null> => {
  const result = await pool.query<SignupRequestIdRow>(
    'SELECT id FROM portal_signup_requests WHERE email = $1 AND status = $2',
    [email, 'pending']
  );
  return result.rows[0]?.id ?? null;
};

export const createPortalSignupRequest = async (input: {
  contactId: string;
  email: string;
  passwordHash: string;
}): Promise<string> => {
  const result = await pool.query<SignupRequestIdRow>(
    `INSERT INTO portal_signup_requests (contact_id, email, password_hash, status)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [input.contactId, input.email, input.passwordHash, 'pending']
  );

  return result.rows[0].id;
};

export const getPortalLoginUserByEmail = async (
  email: string
): Promise<PortalLoginUserRow | null> => {
  const result = await pool.query<PortalLoginUserRow>(
    `SELECT id, email, password_hash, contact_id, status, is_verified
     FROM portal_users
     WHERE email = $1`,
    [email]
  );

  return result.rows[0] ?? null;
};

export const updatePortalUserLastLogin = async (userId: string): Promise<void> => {
  await pool.query('UPDATE portal_users SET last_login_at = NOW() WHERE id = $1', [userId]);
};

export const getPortalUserProfileById = async (
  portalUserId: string
): Promise<PortalUserProfileRow | null> => {
  const result = await pool.query<PortalUserProfileRow>(
    `SELECT
      pu.id,
      pu.email,
      pu.contact_id,
      pu.status,
      pu.is_verified,
      pu.created_at,
      pu.last_login_at,
      c.first_name,
      c.last_name,
      c.phone,
      c.mobile_phone
     FROM portal_users pu
     LEFT JOIN contacts c ON c.id = pu.contact_id
     WHERE pu.id = $1`,
    [portalUserId]
  );

  return result.rows[0] ?? null;
};

export const getPortalInvitationByToken = async (
  token: string
): Promise<PortalInvitationRow | null> => {
  const result = await pool.query<PortalInvitationRow>(
    `SELECT id, email, contact_id, created_by, expires_at, accepted_at
     FROM portal_invitations
     WHERE token = $1`,
    [token]
  );

  return result.rows[0] ?? null;
};

export const createContactForInvitation = async (input: {
  firstName: string;
  lastName: string;
  email: string;
}): Promise<string> => {
  const result = await pool.query<ContactIdRow>(
    `INSERT INTO contacts (
      first_name, last_name, email, created_by, modified_by
    ) VALUES ($1, $2, $3, $4, $4)
    RETURNING id`,
    [input.firstName, input.lastName, input.email, null]
  );

  return result.rows[0].id;
};

export const createPortalUserFromInvitation = async (input: {
  contactId: string;
  email: string;
  passwordHash: string;
  verifiedBy: string | null;
}): Promise<PortalUserAuthRow> => {
  const result = await pool.query<PortalUserAuthRow>(
    `INSERT INTO portal_users (
      contact_id, email, password_hash, status, is_verified, verified_at, verified_by
    ) VALUES ($1, $2, $3, $4, $5, NOW(), $6)
    RETURNING id, email, contact_id`,
    [input.contactId, input.email, input.passwordHash, 'active', true, input.verifiedBy]
  );

  return result.rows[0];
};

export const markPortalInvitationAccepted = async (invitationId: string): Promise<void> => {
  await pool.query('UPDATE portal_invitations SET accepted_at = NOW() WHERE id = $1', [invitationId]);
};
