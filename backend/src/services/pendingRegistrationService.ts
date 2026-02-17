/**
 * Pending Registrations Service
 * Manages the approval workflow for self-registration requests.
 */

import pool from '@config/database';
import { logger } from '@config/logger';
import bcrypt from 'bcryptjs';
import { PASSWORD } from '@config/constants';
import { syncUserRole } from '@services/domains/integration';
import { sendMail } from '@services/emailService';
import { getRegistrationSettings } from '@services/registrationSettingsService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PendingStatus = 'pending' | 'approved' | 'rejected';

export interface PendingRegistration {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: PendingStatus;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface PendingRow {
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

interface UserRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toModel(row: PendingRow): PendingRegistration {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    status: row.status,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a pending registration (called from the register endpoint when mode = approval_required).
 */
export async function createPendingRegistration(data: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}): Promise<PendingRegistration> {
  // Check if email already has a pending request
  const existing = await pool.query(
    "SELECT id FROM pending_registrations WHERE email = $1 AND status = 'pending'",
    [data.email]
  );
  if (existing.rows.length > 0) {
    throw new Error('A registration request for this email is already pending');
  }

  // Also check if user already exists
  const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [data.email]);
  if (existingUser.rows.length > 0) {
    throw new Error('An account with this email already exists');
  }

  const hashedPassword = await bcrypt.hash(data.password, PASSWORD.BCRYPT_SALT_ROUNDS);

  const result = await pool.query<PendingRow>(
    `INSERT INTO pending_registrations (email, password_hash, first_name, last_name, status)
     VALUES ($1, $2, $3, $4, 'pending')
     RETURNING *`,
    [data.email, hashedPassword, data.firstName ?? null, data.lastName ?? null]
  );

  logger.info(`Pending registration created for: ${data.email}`);

  // Best-effort: notify admins via email
  notifyAdminsOfPendingRegistration(data.email, data.firstName, data.lastName).catch((err) => {
    logger.warn('Failed to send admin notification for pending registration', err);
  });

  return toModel(result.rows[0]);
}

/**
 * List pending registrations for admin review.
 */
export async function listPendingRegistrations(
  status?: PendingStatus
): Promise<PendingRegistration[]> {
  let query = 'SELECT * FROM pending_registrations';
  const params: string[] = [];

  if (status) {
    query += ' WHERE status = $1';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';

  const result = await pool.query<PendingRow>(query, params);
  return result.rows.map(toModel);
}

/**
 * Get a single pending registration by ID.
 */
export async function getPendingRegistration(
  id: string
): Promise<PendingRegistration | null> {
  const result = await pool.query<PendingRow>(
    'SELECT * FROM pending_registrations WHERE id = $1',
    [id]
  );
  return result.rows.length > 0 ? toModel(result.rows[0]) : null;
}

/**
 * Approve a pending registration — creates the real user and notifies them.
 */
export async function approvePendingRegistration(
  id: string,
  reviewedBy: string
): Promise<{ user: UserRow }> {
  const result = await pool.query<PendingRow>(
    'SELECT * FROM pending_registrations WHERE id = $1',
    [id]
  );

  if (result.rows.length === 0) {
    throw new Error('Pending registration not found');
  }

  const pending = result.rows[0];

  if (pending.status !== 'pending') {
    throw new Error(`Registration has already been ${pending.status}`);
  }

  // Check email not already taken
  const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [pending.email]);
  if (existingUser.rows.length > 0) {
    // Mark as rejected with explanation
    await pool.query(
      `UPDATE pending_registrations
       SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(),
           rejection_reason = 'An account with this email already exists', updated_at = NOW()
       WHERE id = $2`,
      [reviewedBy, id]
    );
    throw new Error('An account with this email already exists');
  }

  // Get default role from settings
  const settings = await getRegistrationSettings();

  // Create the real user with the stored password hash
  const userResult = await pool.query<UserRow>(
    `INSERT INTO users (email, password_hash, first_name, last_name, role, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     RETURNING id, email, first_name, last_name, role`,
    [pending.email, pending.password_hash, pending.first_name, pending.last_name, settings.defaultRole]
  );

  const user = userResult.rows[0];
  await syncUserRole(user.id, user.role);

  // Mark pending as approved
  await pool.query(
    `UPDATE pending_registrations
     SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), updated_at = NOW()
     WHERE id = $2`,
    [reviewedBy, id]
  );

  logger.info(`Pending registration approved: ${pending.email} by user ${reviewedBy}`);

  // Best-effort: notify user
  sendApprovalEmail(pending.email, pending.first_name).catch((err) => {
    logger.warn('Failed to send approval notification', err);
  });

  return { user };
}

/**
 * Reject a pending registration.
 */
export async function rejectPendingRegistration(
  id: string,
  reviewedBy: string,
  reason?: string
): Promise<PendingRegistration> {
  const result = await pool.query<PendingRow>(
    'SELECT * FROM pending_registrations WHERE id = $1',
    [id]
  );

  if (result.rows.length === 0) {
    throw new Error('Pending registration not found');
  }

  const pending = result.rows[0];

  if (pending.status !== 'pending') {
    throw new Error(`Registration has already been ${pending.status}`);
  }

  const updated = await pool.query<PendingRow>(
    `UPDATE pending_registrations
     SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(),
         rejection_reason = $2, updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [reviewedBy, reason ?? null, id]
  );

  logger.info(`Pending registration rejected: ${pending.email} by user ${reviewedBy}`);

  // Best-effort: notify user
  sendRejectionEmail(pending.email, pending.first_name, reason).catch((err) => {
    logger.warn('Failed to send rejection notification', err);
  });

  return toModel(updated.rows[0]);
}

// ---------------------------------------------------------------------------
// Email helpers (best-effort, never throw to caller)
// ---------------------------------------------------------------------------

async function notifyAdminsOfPendingRegistration(
  email: string,
  firstName?: string,
  lastName?: string
): Promise<void> {
  const admins = await pool.query<{ email: string }>(
    "SELECT email FROM users WHERE role = 'admin' AND is_active = true"
  );

  const name = [firstName, lastName].filter(Boolean).join(' ') || email;

  for (const admin of admins.rows) {
    await sendMail({
      to: admin.email,
      subject: 'New Registration Request Pending Approval',
      text: `A new user registration request requires your review.\n\nName: ${name}\nEmail: ${email}\n\nPlease log in to the admin settings to approve or reject this request.`,
      html: `
        <h2>New Registration Request</h2>
        <p>A new user registration request requires your review.</p>
        <table style="border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:4px 12px 4px 0;font-weight:bold">Name:</td><td>${name}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;font-weight:bold">Email:</td><td>${email}</td></tr>
        </table>
        <p>Please log in to the admin settings to approve or reject this request.</p>
      `,
    });
  }
}

async function sendApprovalEmail(email: string, firstName: string | null): Promise<void> {
  const greeting = firstName ? `Hi ${firstName},` : 'Hello,';
  await sendMail({
    to: email,
    subject: 'Your Registration Has Been Approved',
    text: `${greeting}\n\nYour registration has been approved! You can now log in to your account.\n\nThank you.`,
    html: `
      <h2>Registration Approved</h2>
      <p>${greeting}</p>
      <p>Your registration has been approved! You can now log in to your account.</p>
      <p>Thank you.</p>
    `,
  });
}

async function sendRejectionEmail(
  email: string,
  firstName: string | null,
  reason?: string
): Promise<void> {
  const greeting = firstName ? `Hi ${firstName},` : 'Hello,';
  const reasonText = reason ? `\n\nReason: ${reason}` : '';
  await sendMail({
    to: email,
    subject: 'Your Registration Request',
    text: `${greeting}\n\nThank you for your interest. Unfortunately, your registration request was not approved at this time.${reasonText}\n\nIf you believe this is in error, please contact the organization directly.`,
    html: `
      <h2>Registration Update</h2>
      <p>${greeting}</p>
      <p>Thank you for your interest. Unfortunately, your registration request was not approved at this time.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      <p>If you believe this is in error, please contact the organization directly.</p>
    `,
  });
}
