import type { NextFunction, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import pool, { withUserContextTransaction, type PoolClient } from '@config/database';
import { PASSWORD } from '@config/constants';
import type { AuthRequest } from '@middleware/auth';
import { sendSuccess } from '@modules/shared/http/envelope';
import { getPortalActivity } from '@services/domains/integration';
import { badRequest, conflict, notFoundMessage } from '@utils/responseHelpers';
import {
  ensurePortalAdmin,
  getPortalAdminTenantId,
  getPortalAdminQuery,
  type PortalSignupApprovalRow,
} from './portalAdminController.shared';

const generatePortalInviteToken = () => crypto.randomBytes(32).toString('hex');

type QueryClient = Pick<PoolClient, 'query'>;

type PortalSignupApprovalResult =
  | { kind: 'approved'; portalUser: unknown }
  | { kind: 'bad_request'; message: string }
  | { kind: 'conflict'; message: string }
  | { kind: 'not_found' };

type PortalSignupRejectionResult =
  | { kind: 'rejected' }
  | { kind: 'conflict'; message: string }
  | { kind: 'not_found' };

const portalSignupTenantScopeSql = (tenantParam: string): string => `
  ${tenantParam}::uuid IS NOT NULL
  AND (
    psr.account_id = ${tenantParam}
    OR c.account_id = ${tenantParam}
  )
`;

const portalUserTenantScopeSql = (tenantParam: string): string => `
  ${tenantParam}::uuid IS NOT NULL
  AND (
    pu.account_id = ${tenantParam}
    OR EXISTS (
      SELECT 1
      FROM contacts linked_contact
      WHERE linked_contact.id = pu.contact_id
        AND linked_contact.account_id = ${tenantParam}
    )
  )
`;

const loadScopedPortalUser = async (
  client: QueryClient,
  portalUserId: string,
  tenantId: string | null
): Promise<{ id: string } | null> => {
  const result = await client.query<{ id: string }>(
    `SELECT pu.id
     FROM portal_users pu
     WHERE pu.id = $1
       AND ${portalUserTenantScopeSql('$2')}
     LIMIT 1`,
    [portalUserId, tenantId]
  );

  return result.rows[0] ?? null;
};

export const listPortalSignupRequests = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensurePortalAdmin(req, res)) return;

    const tenantId = getPortalAdminTenantId(req);
    const result = await pool.query(
      `SELECT
              psr.id,
              psr.email,
              psr.status,
              psr.resolution_status,
              psr.requested_at,
              psr.reviewed_at,
              c.id AS contact_id,
              COALESCE(psr.first_name, c.first_name) AS first_name,
              COALESCE(psr.last_name, c.last_name) AS last_name,
              COALESCE(psr.phone, c.phone) AS phone
       FROM portal_signup_requests psr
       LEFT JOIN contacts c ON c.id = psr.contact_id
       WHERE psr.status = 'pending'
         AND ${portalSignupTenantScopeSql('$1')}
       ORDER BY psr.requested_at ASC`,
      [tenantId]
    );

    sendSuccess(res, { requests: result.rows });
  } catch (error) {
    next(error);
  }
};

export const approvePortalSignupRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensurePortalAdmin(req, res)) return;

    const { id } = req.params;
    const { contact_id: requestedContactId } = req.body as { contact_id?: string };
    const tenantId = getPortalAdminTenantId(req);

    const result = await withUserContextTransaction<PortalSignupApprovalResult>(
      req.user!.id,
      async (client) => {
        const requestResult = await client.query<PortalSignupApprovalRow>(
          `SELECT psr.id,
                  psr.email,
                  psr.password_hash,
                  psr.contact_id,
                  psr.account_id,
                  psr.status,
                  psr.resolution_status
           FROM portal_signup_requests psr
           LEFT JOIN contacts c ON c.id = psr.contact_id
           WHERE psr.id = $1
             AND ${portalSignupTenantScopeSql('$2')}
           FOR UPDATE OF psr`,
          [id, tenantId]
        );

        if (requestResult.rows.length === 0) {
          return { kind: 'not_found' };
        }

        const requestRow = requestResult.rows[0];
        if (requestRow.status !== 'pending') {
          return { kind: 'conflict', message: 'Signup request already processed' };
        }

        let approvedContactId = requestRow.contact_id;
        if (requestRow.resolution_status === 'needs_contact_resolution') {
          if (!requestedContactId) {
            return {
              kind: 'bad_request',
              message:
                'contact_id is required when the signup request needs manual contact resolution',
            };
          }
          approvedContactId = requestedContactId;
        }

        if (!approvedContactId) {
          return { kind: 'bad_request', message: 'Signup request is missing a resolved contact' };
        }

        const matchingContact = await client.query<{ id: string; account_id: string }>(
          `SELECT id, account_id
           FROM contacts
           WHERE id = $1
             AND lower(email) = lower($2)
             AND account_id = $3`,
          [approvedContactId, requestRow.email, tenantId]
        );

        if (matchingContact.rows.length === 0) {
          return {
            kind: 'bad_request',
            message: 'Selected contact must match the signup request email',
          };
        }

        const approvedAccountId = matchingContact.rows[0].account_id;
        const normalizedEmail = requestRow.email.toLowerCase();
        const existingUser = await client.query(
          'SELECT id FROM portal_users WHERE lower(email) = lower($1) LIMIT 1',
          [normalizedEmail]
        );
        if (existingUser.rows.length > 0) {
          return { kind: 'conflict', message: 'Portal account already exists' };
        }

        const statusUpdate = await client.query(
          `UPDATE portal_signup_requests
           SET status = 'approved',
               reviewed_at = NOW(),
               reviewed_by = $2,
               contact_id = $3,
               account_id = $4,
               resolution_status = 'resolved'
           WHERE id = $1
             AND status = 'pending'
           RETURNING id`,
          [id, req.user!.id, approvedContactId, approvedAccountId]
        );

        if (statusUpdate.rows.length === 0) {
          return { kind: 'conflict', message: 'Signup request already processed' };
        }

        const portalUserResult = await client.query(
          `INSERT INTO portal_users (
            account_id, contact_id, email, password_hash, status, is_verified, verified_at, verified_by
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
          RETURNING id, email, contact_id, account_id`,
          [
            approvedAccountId,
            approvedContactId,
            normalizedEmail,
            requestRow.password_hash,
            'active',
            true,
            req.user!.id,
          ]
        );

        return { kind: 'approved', portalUser: portalUserResult.rows[0] };
      }
    );

    if (result.kind === 'not_found') {
      notFoundMessage(res, 'Signup request not found');
      return;
    }

    if (result.kind === 'bad_request') {
      badRequest(res, result.message);
      return;
    }

    if (result.kind === 'conflict') {
      conflict(res, result.message);
      return;
    }

    sendSuccess(res, {
      message: 'Portal request approved',
      portalUser: result.portalUser,
    });
  } catch (error) {
    next(error);
  }
};

export const rejectPortalSignupRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensurePortalAdmin(req, res)) return;

    const { id } = req.params;
    const { notes } = req.body as { notes?: string };
    const tenantId = getPortalAdminTenantId(req);

    const result = await withUserContextTransaction<PortalSignupRejectionResult>(
      req.user!.id,
      async (client) => {
        const requestResult = await client.query(
          `SELECT psr.id, psr.status
           FROM portal_signup_requests psr
           LEFT JOIN contacts c ON c.id = psr.contact_id
           WHERE psr.id = $1
             AND ${portalSignupTenantScopeSql('$2')}
           FOR UPDATE OF psr`,
          [id, tenantId]
        );

        if (requestResult.rows.length === 0) {
          return { kind: 'not_found' };
        }

        if (requestResult.rows[0].status !== 'pending') {
          return { kind: 'conflict', message: 'Signup request already processed' };
        }

        const updateResult = await client.query(
          `UPDATE portal_signup_requests
           SET status = 'rejected', reviewed_at = NOW(), reviewed_by = $2, review_notes = $3
           WHERE id = $1
             AND status = 'pending'
           RETURNING id`,
          [id, req.user!.id, notes || null]
        );

        if (updateResult.rows.length === 0) {
          return { kind: 'conflict', message: 'Signup request already processed' };
        }

        return { kind: 'rejected' };
      }
    );

    if (result.kind === 'not_found') {
      notFoundMessage(res, 'Signup request not found');
      return;
    }

    if (result.kind === 'conflict') {
      conflict(res, result.message);
      return;
    }

    sendSuccess(res, { message: 'Portal request rejected' });
  } catch (error) {
    next(error);
  }
};

export const createPortalInvitation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensurePortalAdmin(req, res)) return;

    const { email, contact_id, expiresInDays } = req.body as {
      email: string;
      contact_id?: string;
      expiresInDays?: number;
    };
    const tenantId = getPortalAdminTenantId(req);
    if (!tenantId) {
      badRequest(res, 'Portal tenant is required');
      return;
    }

    const normalizedEmail = email.toLowerCase();
    const existingUser = await pool.query(
      'SELECT id FROM portal_users WHERE lower(email) = lower($1) LIMIT 1',
      [normalizedEmail]
    );
    if (existingUser.rows.length > 0) {
      conflict(res, 'Portal account already exists');
      return;
    }

    if (contact_id) {
      const contactResult = await pool.query(
        `SELECT id
         FROM contacts
         WHERE id = $1
           AND account_id = $2`,
        [contact_id, tenantId]
      );

      if (contactResult.rows.length === 0) {
        badRequest(res, 'Selected contact must belong to this tenant');
        return;
      }
    }

    const existingInvite = await pool.query(
      `SELECT pi.id
       FROM portal_invitations pi
       LEFT JOIN contacts c ON c.id = pi.contact_id
       WHERE lower(pi.email) = lower($1)
         AND pi.accepted_at IS NULL
         AND pi.expires_at > NOW()
         AND $2::uuid IS NOT NULL
         AND (
           pi.account_id = $2
           OR c.account_id = $2
         )
       LIMIT 1`,
      [normalizedEmail, tenantId]
    );
    if (existingInvite.rows.length > 0) {
      conflict(res, 'Pending portal invitation already exists');
      return;
    }

    const token = generatePortalInviteToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (expiresInDays || 7));

    const inviteResult = await pool.query(
      `INSERT INTO portal_invitations (account_id, email, contact_id, token, expires_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, account_id, email, contact_id, token, expires_at`,
      [tenantId, normalizedEmail, contact_id || null, token, expiresAt, req.user!.id]
    );

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const inviteUrl = `${baseUrl}/portal/accept-invitation/${token}`;

    sendSuccess(
      res,
      {
        invitation: inviteResult.rows[0],
        inviteUrl,
      },
      201
    );
  } catch (error) {
    next(error);
  }
};

export const listPortalInvitations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensurePortalAdmin(req, res)) return;

    const tenantId = getPortalAdminTenantId(req);
    const result = await pool.query(
      `SELECT pi.id,
              pi.account_id,
              pi.email,
              pi.contact_id,
              pi.expires_at,
              pi.created_at,
              pi.accepted_at
       FROM portal_invitations pi
       LEFT JOIN contacts c ON c.id = pi.contact_id
       WHERE $1::uuid IS NOT NULL
         AND (
           pi.account_id = $1
           OR c.account_id = $1
         )
       ORDER BY pi.created_at DESC`,
      [tenantId]
    );

    sendSuccess(res, { invitations: result.rows });
  } catch (error) {
    next(error);
  }
};

export const listPortalUsers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensurePortalAdmin(req, res)) return;

    const query = getPortalAdminQuery<{ search?: string }>(req);
    const search = typeof query.search === 'string' ? query.search.trim() : '';
    const tenantId = getPortalAdminTenantId(req);
    const params: Array<string | null> = [tenantId];
    let whereClause = `WHERE $1::uuid IS NOT NULL
       AND (
         pu.account_id = $1
         OR c.account_id = $1
       )`;

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (
        pu.email ILIKE $2 OR
        c.first_name ILIKE $2 OR
        c.last_name ILIKE $2 OR
        CONCAT(c.first_name, ' ', c.last_name) ILIKE $2
      )`;
    }

    const result = await pool.query(
      `SELECT
        pu.id,
        pu.email,
        pu.status,
        pu.is_verified,
        pu.created_at,
        pu.last_login_at,
        pu.contact_id,
        pu.account_id,
        c.first_name,
        c.last_name
       FROM portal_users pu
       LEFT JOIN contacts c ON c.id = pu.contact_id
       ${whereClause}
       ORDER BY pu.created_at DESC
       LIMIT 100`,
      params
    );

    sendSuccess(res, { users: result.rows });
  } catch (error) {
    next(error);
  }
};

export const updatePortalUserStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensurePortalAdmin(req, res)) return;

    const { id } = req.params;
    const { status } = req.body as { status?: string };
    const tenantId = getPortalAdminTenantId(req);

    if (!status || !['active', 'suspended'].includes(status)) {
      badRequest(res, 'Status must be active or suspended');
      return;
    }

    const result = await pool.query(
      `UPDATE portal_users pu
       SET status = $1, updated_at = NOW()
       WHERE pu.id = $2
         AND ${portalUserTenantScopeSql('$3')}
       RETURNING pu.id, pu.email, pu.status, pu.is_verified, pu.last_login_at, pu.account_id`,
      [status, id, tenantId]
    );

    if (result.rows.length === 0) {
      notFoundMessage(res, 'Portal user not found');
      return;
    }

    sendSuccess(res, { user: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

export const getPortalUserActivity = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensurePortalAdmin(req, res)) return;

    const { id } = req.params;
    const tenantId = getPortalAdminTenantId(req);
    const query = getPortalAdminQuery<{ limit?: number | string }>(req);
    const parsedLimit =
      typeof query.limit === 'number' ? query.limit : parseInt(String(query.limit ?? ''), 10);
    const limit = Number.isFinite(parsedLimit) ? parsedLimit : 20;

    const scopedPortalUser = await loadScopedPortalUser(pool, id, tenantId);
    if (!scopedPortalUser) {
      notFoundMessage(res, 'Portal user not found');
      return;
    }

    const activity = await getPortalActivity(id, limit);
    sendSuccess(res, { activity });
  } catch (error) {
    next(error);
  }
};

export const resetPortalUserPassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensurePortalAdmin(req, res)) return;

    const { portalUserId, password } = req.body as { portalUserId: string; password: string };
    const tenantId = getPortalAdminTenantId(req);
    const hashed = await bcrypt.hash(password, PASSWORD.BCRYPT_SALT_ROUNDS);

    const result = await pool.query(
      `UPDATE portal_users pu
       SET password_hash = $1, updated_at = NOW()
       WHERE pu.id = $2
         AND ${portalUserTenantScopeSql('$3')}
       RETURNING pu.id`,
      [hashed, portalUserId, tenantId]
    );

    if (result.rows.length === 0) {
      notFoundMessage(res, 'Portal user not found');
      return;
    }

    sendSuccess(res, { message: 'Portal user password updated' });
  } catch (error) {
    next(error);
  }
};
