import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import pool from '@config/database';
import { AuthRequest } from '@middleware/auth';
import { PASSWORD } from '@config/constants';
import { getPortalActivity } from '@services/domains/integration';
import { sendMail } from '@services/emailService';
import {
  addStaffMessage,
  getStaffThread,
  listStaffThreads,
  markStaffThreadRead,
  updateThread,
} from '@modules/portal/services/portalMessagingService';
import {
  checkInAppointmentByStaff,
  createAppointmentSlot,
  deleteAppointmentSlot,
  getAppointmentById,
  listAdminAppointments,
  listAdminAppointmentSlots,
  updateAppointmentSlot,
  updateAppointmentStatusByStaff,
} from '../services/portalAppointmentSlotService';
import {
  listAppointmentReminders,
  sendAppointmentReminders,
} from '../services/appointmentReminderService';
import {
  isPortalRealtimeEnabled,
  openPortalRealtimeStream,
} from '@services/portalRealtimeService';
import { badRequest, conflict, forbidden, notFoundMessage } from '@utils/responseHelpers';
import { sendSuccess } from '@modules/shared/http/envelope';

const ensureAdmin = (req: AuthRequest, res: Response): boolean => {
  if (req.user?.role !== 'admin') {
    forbidden(res, 'Admin access required');
    return false;
  }
  return true;
};

const notifyPortalUser = async (args: {
  to: string | null | undefined;
  subject: string;
  body: string;
}): Promise<void> => {
  if (!args.to) {
    return;
  }

  try {
    await sendMail({
      to: args.to,
      subject: args.subject,
      text: args.body,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;white-space:pre-wrap">${args.body}</div>`,
    });
  } catch {
    // Degrade gracefully to in-app updates if email is unavailable.
  }
};

export const listPortalSignupRequests = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensureAdmin(req, res)) return;

    const result = await pool.query(
      `SELECT psr.id, psr.email, psr.status, psr.requested_at, psr.reviewed_at,
              c.id as contact_id, c.first_name, c.last_name
       FROM portal_signup_requests psr
       LEFT JOIN contacts c ON c.id = psr.contact_id
       WHERE psr.status = 'pending'
       ORDER BY psr.requested_at ASC`
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
    if (!ensureAdmin(req, res)) return;

    const { id } = req.params;

    const requestResult = await pool.query(
      `SELECT id, email, password_hash, contact_id, status
       FROM portal_signup_requests
       WHERE id = $1`,
      [id]
    );

    if (requestResult.rows.length === 0) {
      notFoundMessage(res, 'Signup request not found');
      return;
    }

    const requestRow = requestResult.rows[0];
    if (requestRow.status !== 'pending') {
      badRequest(res, 'Signup request already processed');
      return;
    }

    const existingUser = await pool.query('SELECT id FROM portal_users WHERE email = $1', [
      requestRow.email.toLowerCase(),
    ]);
    if (existingUser.rows.length > 0) {
      conflict(res, 'Portal account already exists');
      return;
    }

    const portalUserResult = await pool.query(
      `INSERT INTO portal_users (
        contact_id, email, password_hash, status, is_verified, verified_at, verified_by
      ) VALUES ($1, $2, $3, $4, $5, NOW(), $6)
      RETURNING id, email, contact_id`,
      [requestRow.contact_id, requestRow.email.toLowerCase(), requestRow.password_hash, 'active', true, req.user!.id]
    );

    await pool.query(
      `UPDATE portal_signup_requests
       SET status = 'approved', reviewed_at = NOW(), reviewed_by = $2
       WHERE id = $1`,
      [id, req.user!.id]
    );

    sendSuccess(res, {
      message: 'Portal request approved',
      portalUser: portalUserResult.rows[0],
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
    if (!ensureAdmin(req, res)) return;

    const { id } = req.params;
    const { notes } = req.body as { notes?: string };

    const requestResult = await pool.query(
      `SELECT id, status FROM portal_signup_requests WHERE id = $1`,
      [id]
    );

    if (requestResult.rows.length === 0) {
      notFoundMessage(res, 'Signup request not found');
      return;
    }

    if (requestResult.rows[0].status !== 'pending') {
      badRequest(res, 'Signup request already processed');
      return;
    }

    await pool.query(
      `UPDATE portal_signup_requests
       SET status = 'rejected', reviewed_at = NOW(), reviewed_by = $2, review_notes = $3
       WHERE id = $1`,
      [id, req.user!.id, notes || null]
    );

    sendSuccess(res, { message: 'Portal request rejected' });
  } catch (error) {
    next(error);
  }
};

const generatePortalInviteToken = () => crypto.randomBytes(32).toString('hex');

export const createPortalInvitation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { email, contact_id, expiresInDays } = req.body as {
      email: string;
      contact_id?: string;
      expiresInDays?: number;
    };

    const existingUser = await pool.query('SELECT id FROM portal_users WHERE email = $1', [
      email.toLowerCase(),
    ]);
    if (existingUser.rows.length > 0) {
      conflict(res, 'Portal account already exists');
      return;
    }

    const existingInvite = await pool.query(
      `SELECT id FROM portal_invitations
       WHERE email = $1 AND accepted_at IS NULL AND expires_at > NOW()`,
      [email.toLowerCase()]
    );
    if (existingInvite.rows.length > 0) {
      conflict(res, 'Pending portal invitation already exists');
      return;
    }

    const token = generatePortalInviteToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (expiresInDays || 7));

    const inviteResult = await pool.query(
      `INSERT INTO portal_invitations (email, contact_id, token, expires_at, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, contact_id, token, expires_at`,
      [email.toLowerCase(), contact_id || null, token, expiresAt, req.user!.id]
    );

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const inviteUrl = `${baseUrl}/portal/accept-invitation/${token}`;

    sendSuccess(res, {
      invitation: inviteResult.rows[0],
      inviteUrl,
    }, 201);
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
    if (!ensureAdmin(req, res)) return;

    const result = await pool.query(
      `SELECT id, email, contact_id, expires_at, created_at, accepted_at
       FROM portal_invitations
       ORDER BY created_at DESC`
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
    if (!ensureAdmin(req, res)) return;

    const query = (req.validatedQuery ?? req.query) as { search?: string };
    const search = typeof query.search === 'string' ? query.search.trim() : '';
    const params: Array<string> = [];
    let whereClause = '';

    if (search) {
      params.push(`%${search}%`);
      whereClause = `WHERE (
        pu.email ILIKE $1 OR
        c.first_name ILIKE $1 OR
        c.last_name ILIKE $1 OR
        CONCAT(c.first_name, ' ', c.last_name) ILIKE $1
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
    if (!ensureAdmin(req, res)) return;

    const { id } = req.params;
    const { status } = req.body as { status?: string };

    if (!status || !['active', 'suspended'].includes(status)) {
      badRequest(res, 'Status must be active or suspended');
      return;
    }

    const result = await pool.query(
      `UPDATE portal_users
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, email, status, is_verified, last_login_at`,
      [status, id]
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
    if (!ensureAdmin(req, res)) return;

    const { id } = req.params;
    const query = (req.validatedQuery ?? req.query) as {
      limit?: number | string;
    };
    const parsedLimit =
      typeof query.limit === 'number'
        ? query.limit
        : parseInt(String(query.limit ?? ''), 10);
    const limit = Number.isFinite(parsedLimit) ? parsedLimit : 20;

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
    if (!ensureAdmin(req, res)) return;

    const { portalUserId, password } = req.body as { portalUserId: string; password: string };
    const hashed = await bcrypt.hash(password, PASSWORD.BCRYPT_SALT_ROUNDS);

    await pool.query('UPDATE portal_users SET password_hash = $1 WHERE id = $2', [
      hashed,
      portalUserId,
    ]);

    sendSuccess(res, { message: 'Portal user password updated' });
  } catch (error) {
    next(error);
  }
};

export const listPortalAdminConversations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensureAdmin(req, res)) return;

    const query = (req.validatedQuery ?? req.query) as {
      status?: 'open' | 'closed' | 'archived';
      case_id?: string;
      pointperson_user_id?: string;
      search?: string;
      limit?: number;
      offset?: number;
    };

    const conversations = await listStaffThreads({
      status: query.status,
      caseId: query.case_id,
      pointpersonUserId: query.pointperson_user_id,
      search: query.search,
      limit: query.limit,
      offset: query.offset,
    });

    sendSuccess(res, { conversations });
  } catch (error) {
    next(error);
  }
};

export const getPortalAdminConversation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { threadId } = req.params;
    const conversation = await getStaffThread(threadId);

    if (!conversation) {
      notFoundMessage(res, 'Conversation not found');
      return;
    }

    await markStaffThreadRead(threadId);
    sendSuccess(res, conversation);
  } catch (error) {
    next(error);
  }
};

export const replyPortalAdminConversation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { threadId } = req.params;
    const { message, is_internal } = req.body as {
      message: string;
      is_internal?: boolean;
    };

    const existing = await getStaffThread(threadId);
    if (!existing) {
      notFoundMessage(res, 'Conversation not found');
      return;
    }

    if (existing.thread.status !== 'open') {
      badRequest(res, 'Conversation is not open');
      return;
    }

    const created = await addStaffMessage({
      threadId,
      senderUserId: req.user!.id,
      messageText: message,
      isInternal: Boolean(is_internal),
    });

    await markStaffThreadRead(threadId);
    sendSuccess(res, { message: created }, 201);
  } catch (error) {
    next(error);
  }
};

export const updatePortalAdminConversation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { threadId } = req.params;
    const status =
      req.body.status === 'open' || req.body.status === 'closed' || req.body.status === 'archived'
        ? req.body.status
        : undefined;
    const pointpersonUserId =
      req.body.pointperson_user_id === null || typeof req.body.pointperson_user_id === 'string'
        ? req.body.pointperson_user_id
        : undefined;
    const caseId =
      req.body.case_id === null || typeof req.body.case_id === 'string' ? req.body.case_id : undefined;
    const subject = req.body.subject === null || typeof req.body.subject === 'string' ? req.body.subject : undefined;

    const updated = await updateThread({
      threadId,
      status,
      pointpersonUserId,
      caseId,
      subject,
      actorType: 'staff',
      closedBy: status === 'closed' ? req.user!.id : null,
    });

    if (!updated) {
      notFoundMessage(res, 'Conversation not found');
      return;
    }

    sendSuccess(res, { conversation: updated });
  } catch (error) {
    next(error);
  }
};

export const listPortalAdminAppointmentSlots = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensureAdmin(req, res)) return;

    const query = (req.validatedQuery ?? req.query) as {
      status?: 'open' | 'closed' | 'cancelled';
      case_id?: string;
      pointperson_user_id?: string;
      from?: string;
      to?: string;
      limit?: number;
      offset?: number;
    };

    const slots = await listAdminAppointmentSlots({
      status: query.status,
      caseId: query.case_id,
      pointpersonUserId: query.pointperson_user_id,
      from: query.from,
      to: query.to,
      limit: query.limit,
      offset: query.offset,
    });

    sendSuccess(res, { slots });
  } catch (error) {
    next(error);
  }
};

export const streamPortalAdminRealtime = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensureAdmin(req, res)) return;

    if (!isPortalRealtimeEnabled()) {
      badRequest(res, 'Portal realtime stream is disabled');
      return;
    }

    const query = (req.validatedQuery ?? req.query) as { channels?: string };
    const channelsRaw = typeof query.channels === 'string' ? query.channels : undefined;

    openPortalRealtimeStream({
      req,
      res,
      audience: 'admin',
      userId: req.user!.id,
      channelsRaw,
    });
  } catch (error) {
    if (error instanceof Error) {
      badRequest(res, error.message);
      return;
    }
    next(error);
  }
};

export const createPortalAdminAppointmentSlot = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensureAdmin(req, res)) return;

    const slot = await createAppointmentSlot({
      pointpersonUserId: req.body.pointperson_user_id,
      caseId: req.body.case_id || null,
      title: req.body.title || null,
      details: req.body.details || null,
      location: req.body.location || null,
      startTime: req.body.start_time,
      endTime: req.body.end_time,
      capacity: req.body.capacity,
      userId: req.user!.id,
    });

    sendSuccess(res, { slot }, 201);
  } catch (error) {
    next(error);
  }
};

export const updatePortalAdminAppointmentSlot = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { slotId } = req.params;
    const slot = await updateAppointmentSlot({
      slotId,
      pointpersonUserId: req.body.pointperson_user_id,
      caseId: req.body.case_id,
      title: req.body.title,
      details: req.body.details,
      location: req.body.location,
      startTime: req.body.start_time,
      endTime: req.body.end_time,
      capacity: req.body.capacity,
      status: req.body.status,
      userId: req.user!.id,
    });

    if (!slot) {
      notFoundMessage(res, 'Appointment slot not found');
      return;
    }

    sendSuccess(res, { slot });
  } catch (error) {
    next(error);
  }
};

export const deletePortalAdminAppointmentSlot = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { slotId } = req.params;
    const deleted = await deleteAppointmentSlot(slotId);

    if (!deleted) {
      notFoundMessage(res, 'Appointment slot not found');
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const listPortalAdminAppointments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensureAdmin(req, res)) return;

    const query = (req.validatedQuery ?? req.query) as {
      status?: 'requested' | 'confirmed' | 'cancelled' | 'completed';
      request_type?: 'manual_request' | 'slot_booking';
      case_id?: string;
      pointperson_user_id?: string;
      date_from?: string;
      date_to?: string;
      page?: number;
      limit?: number;
    };

    const result = await listAdminAppointments({
      status: query.status,
      requestType: query.request_type,
      caseId: query.case_id,
      pointpersonUserId: query.pointperson_user_id,
      dateFrom: query.date_from,
      dateTo: query.date_to,
      page: query.page,
      limit: query.limit,
    });

    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const getPortalAdminAppointmentReminders = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { id } = req.params;
    const appointment = await getAppointmentById(id);
    if (!appointment) {
      notFoundMessage(res, 'Appointment not found');
      return;
    }

    const reminders = await listAppointmentReminders(id);
    sendSuccess(res, reminders);
  } catch (error) {
    next(error);
  }
};

export const sendPortalAdminAppointmentReminders = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { id } = req.params;
    const appointment = await getAppointmentById(id);
    if (!appointment) {
      notFoundMessage(res, 'Appointment not found');
      return;
    }

    const summary = await sendAppointmentReminders(
      id,
      {
        sendEmail: req.body.sendEmail,
        sendSms: req.body.sendSms,
        customMessage: req.body.customMessage,
      },
      {
        triggerType: 'manual',
        sentBy: req.user?.id ?? null,
      }
    );

    sendSuccess(res, { summary });
  } catch (error) {
    if (error instanceof Error && error.message.includes('eligible for reminders')) {
      badRequest(res, error.message);
      return;
    }
    next(error);
  }
};

export const checkInPortalAdminAppointment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { id } = req.params;
    const appointment = await checkInAppointmentByStaff({
      appointmentId: id,
      checkedInBy: req.user!.id,
      resolutionNote: req.body.resolution_note,
      outcomeDefinitionIds: req.body.outcome_definition_ids,
      outcomeVisibility: req.body.outcome_visibility,
    });

    if (!appointment) {
      notFoundMessage(res, 'Appointment not found');
      return;
    }

    sendSuccess(res, { appointment });
  } catch (error) {
    if (error instanceof Error && (/slot/i.test(error.message) || /resolution_note|outcome definition/i.test(error.message))) {
      badRequest(res, error.message);
      return;
    }
    next(error);
  }
};

export const updatePortalAdminAppointmentStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { id } = req.params;
    const { status } = req.body as {
      status: 'requested' | 'confirmed' | 'cancelled' | 'completed';
      resolution_note?: string;
      outcome_definition_ids?: string[];
      outcome_visibility?: boolean;
    };

    const appointment = await updateAppointmentStatusByStaff({
      appointmentId: id,
      status,
      checkedInBy: status === 'completed' ? req.user!.id : null,
      resolutionNote: req.body.resolution_note,
      outcomeDefinitionIds: req.body.outcome_definition_ids,
      outcomeVisibility: req.body.outcome_visibility,
    });

    if (!appointment) {
      notFoundMessage(res, 'Appointment not found');
      return;
    }

    const refreshed = await getAppointmentById(id);
    if (refreshed?.portal_email) {
      const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
      await notifyPortalUser({
        to: refreshed.portal_email,
        subject: `Appointment ${statusLabel}`,
        body: [
          `Your appointment "${refreshed.title}" is now ${status}.`,
          '',
          `Start: ${new Date(refreshed.start_time).toLocaleString()}`,
          refreshed.location ? `Location: ${refreshed.location}` : '',
          refreshed.case_number ? `Case: ${refreshed.case_number}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      });
    }

    sendSuccess(res, { appointment: refreshed || appointment });
  } catch (error) {
    if (error instanceof Error && (/slot/i.test(error.message) || /resolution_note|outcome definition/i.test(error.message))) {
      badRequest(res, error.message);
      return;
    }
    next(error);
  }
};
