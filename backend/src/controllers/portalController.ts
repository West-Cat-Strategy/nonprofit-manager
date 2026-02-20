import { Response, NextFunction } from 'express';
import pool from '@config/database';
import { PortalAuthRequest } from '@middleware/portalAuth';
import { AuthRequest } from '@middleware/auth';
import { logger } from '@config/logger';
import { logPortalActivity } from '@services/domains/integration';
import { RegistrationStatus } from '@app-types/event';
import eventService from '@services/eventService';
import {
  listPortalAppointmentSlots,
  bookPortalAppointmentSlot as bookPortalAppointmentSlotService,
  createPortalManualAppointmentRequest,
  listPortalAppointments,
  cancelPortalAppointment as cancelPortalAppointmentService,
} from '@services/portalAppointmentSlotService';
import {
  getPortalPointpersonContext as getPortalPointpersonContextService,
  resolvePortalCaseSelection,
} from '@services/portalPointpersonService';
import {
  addPortalMessage,
  addStaffMessage,
  createPortalThreadWithMessage,
  getPortalThread as getPortalThreadService,
  getStaffThread,
  listCaseThreads,
  listPortalThreads,
  markPortalThreadRead as markPortalThreadReadService,
  markStaffThreadRead,
  updateThread,
} from '@services/portalMessagingService';
import { badRequest, conflict, forbidden, notFoundMessage } from '@utils/responseHelpers';

const getPortalContactId = (req: PortalAuthRequest): string => {
  if (!req.portalUser?.contactId) {
    throw new Error('Portal user not linked to a contact');
  }
  return req.portalUser.contactId;
};

const tryHandlePortalRequestError = (
  error: unknown,
  res: Response,
  fallbackMessage: string = 'Unable to process portal request'
): boolean => {
  const message = error instanceof Error ? error.message : '';
  const knownMessages = new Set([
    'No active case available for messaging',
    'Selected case does not have an assigned pointperson',
    'Selected case is not available for this portal user',
    'Thread is not open',
    'Thread not found',
    'Case not found for portal contact',
    'Slot not found',
    'Slot is not open for booking',
    'Slot is fully booked',
    'Selected case pointperson does not match slot owner',
    'Slot is bound to a different case',
  ]);

  if (knownMessages.has(message)) {
    badRequest(res, message);
    return true;
  }

  if (message === 'Appointment not found') {
    notFoundMessage(res, message);
    return true;
  }

  if (fallbackMessage && message === fallbackMessage) {
    badRequest(res, message);
    return true;
  }

  return false;
};

const normalizePortalStatus = (value: unknown): 'open' | 'closed' | 'archived' | undefined => {
  if (value === 'open' || value === 'closed' || value === 'archived') {
    return value;
  }
  return undefined;
};

export const getPortalProfile = async (
  req: PortalAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const contactId = getPortalContactId(req);
    const result = await pool.query(
      `SELECT
        c.id as contact_id,
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        c.mobile_phone,
        c.address_line1,
        c.address_line2,
        c.city,
        c.state_province,
        c.postal_code,
        c.country,
        c.preferred_contact_method,
        c.pronouns,
        c.gender
       FROM contacts c
       WHERE c.id = $1`,
      [contactId]
    );

    if (result.rows.length === 0) {
      notFoundMessage(res, 'Contact not found');
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const updatePortalProfile = async (
  req: PortalAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const contactId = getPortalContactId(req);
    const allowedFields = [
      'first_name',
      'last_name',
      'email',
      'phone',
      'mobile_phone',
      'address_line1',
      'address_line2',
      'city',
      'state_province',
      'postal_code',
      'country',
      'preferred_contact_method',
      'pronouns',
      'gender',
      'profile_picture',
    ];

    const fields: string[] = [];
    const values: Array<string | null> = [];
    let index = 1;

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        fields.push(`${field} = $${index++}`);
        values.push(req.body[field]);
      }
    });

    if (fields.length === 0) {
      badRequest(res, 'No valid fields provided');
      return;
    }

    values.push(contactId);

    const result = await pool.query(
      `UPDATE contacts SET ${fields.join(', ')}, updated_at = NOW(), modified_by = NULL
       WHERE id = $${index}
       RETURNING id as contact_id, first_name, last_name, email, phone, mobile_phone,
         address_line1, address_line2, city, state_province, postal_code, country,
         preferred_contact_method, pronouns, gender, profile_picture`,
      values
    );

    if (result.rows.length === 0) {
      notFoundMessage(res, 'Contact not found');
      return;
    }

    // Sync portal user email if email changed
    if (req.body.email) {
      await pool.query('UPDATE portal_users SET email = $1 WHERE id = $2', [
        req.body.email.toLowerCase(),
        req.portalUser!.id,
      ]);
    }

    await logPortalActivity({
      portalUserId: req.portalUser!.id,
      action: 'profile.update',
      details: 'Profile updated',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const changePortalPassword = async (
  req: PortalAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      badRequest(res, 'Current password and new password are required');
      return;
    }

    if (newPassword.length < 8) {
      badRequest(res, 'New password must be at least 8 characters');
      return;
    }

    // Verify current password
    const userResult = await pool.query(
      'SELECT password_hash FROM portal_users WHERE id = $1',
      [req.portalUser!.id]
    );

    if (userResult.rows.length === 0) {
      notFoundMessage(res, 'User not found');
      return;
    }

    const bcrypt = await import('bcryptjs');
    const isValid = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);

    if (!isValid) {
      badRequest(res, 'Current password is incorrect');
      return;
    }

    // Hash and update new password
    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE portal_users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newHash, req.portalUser!.id]
    );

    await logPortalActivity({
      portalUserId: req.portalUser!.id,
      action: 'password.change',
      details: 'Password changed',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const getPortalRelationships = async (
  req: PortalAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const contactId = getPortalContactId(req);
    const result = await pool.query(
      `SELECT
        cr.id,
        cr.relationship_type,
        cr.relationship_label,
        cr.notes,
        cr.is_active,
        cr.created_at,
        c.id as related_contact_id,
        c.first_name as related_contact_first_name,
        c.last_name as related_contact_last_name,
        c.email as related_contact_email,
        c.phone as related_contact_phone
      FROM contact_relationships cr
      LEFT JOIN contacts c ON cr.related_contact_id = c.id
      WHERE cr.contact_id = $1 AND cr.is_active = true
      ORDER BY cr.created_at DESC`,
      [contactId]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const createPortalRelationship = async (
  req: PortalAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const contactId = getPortalContactId(req);
    const { related_contact_id, related_contact, relationship_type, relationship_label, notes } = req.body;

    let relatedContactId = related_contact_id as string | undefined;

    if (!relatedContactId && related_contact) {
      const { first_name, last_name, email, phone } = related_contact;
      const insertResult = await pool.query(
        `INSERT INTO contacts (first_name, last_name, email, phone, created_by, modified_by)
         VALUES ($1, $2, $3, $4, $5, $5)
         RETURNING id`,
        [first_name, last_name, email || null, phone || null, null]
      );
      relatedContactId = insertResult.rows[0].id;
    }

    if (!relatedContactId) {
      badRequest(res, 'Related contact is required');
      return;
    }

    const result = await pool.query(
      `INSERT INTO contact_relationships (
        contact_id, related_contact_id, relationship_type, relationship_label, notes,
        is_bidirectional, inverse_relationship_type, created_by, modified_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
      RETURNING id, relationship_type, relationship_label, notes, created_at`,
      [
        contactId,
        relatedContactId,
        relationship_type,
        relationship_label || null,
        notes || null,
        false,
        null,
        null,
      ]
    );

    await logPortalActivity({
      portalUserId: req.portalUser!.id,
      action: 'relationship.add',
      details: `Added relationship ${result.rows[0].id}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const updatePortalRelationship = async (
  req: PortalAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const contactId = getPortalContactId(req);
    const { id } = req.params;
    const { relationship_type, relationship_label, notes } = req.body;

    const fields: string[] = [];
    const values: Array<string | null> = [];
    let index = 1;

    if (relationship_type) {
      fields.push(`relationship_type = $${index++}`);
      values.push(relationship_type);
    }
    if (relationship_label !== undefined) {
      fields.push(`relationship_label = $${index++}`);
      values.push(relationship_label || null);
    }
    if (notes !== undefined) {
      fields.push(`notes = $${index++}`);
      values.push(notes || null);
    }

    if (fields.length === 0) {
      badRequest(res, 'No updates provided');
      return;
    }

    values.push(id, contactId);

    const result = await pool.query(
      `UPDATE contact_relationships
       SET ${fields.join(', ')}, updated_at = NOW(), modified_by = NULL
       WHERE id = $${index++} AND contact_id = $${index}
       RETURNING id, relationship_type, relationship_label, notes, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      notFoundMessage(res, 'Relationship not found');
      return;
    }

    await logPortalActivity({
      portalUserId: req.portalUser!.id,
      action: 'relationship.update',
      details: `Updated relationship ${id}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const deletePortalRelationship = async (
  req: PortalAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const contactId = getPortalContactId(req);
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE contact_relationships SET is_active = false
       WHERE id = $1 AND contact_id = $2
       RETURNING id`,
      [id, contactId]
    );

    if (result.rows.length === 0) {
      notFoundMessage(res, 'Relationship not found');
      return;
    }

    await logPortalActivity({
      portalUserId: req.portalUser!.id,
      action: 'relationship.remove',
      details: `Removed relationship ${id}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const getPortalPointpersonContext = async (
  req: PortalAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const contactId = getPortalContactId(req);
    const requestedCaseId = typeof req.query.case_id === 'string' ? req.query.case_id : undefined;
    const context = await getPortalPointpersonContextService(contactId);
    const selection = await resolvePortalCaseSelection(contactId, requestedCaseId);

    res.json({
      ...context,
      selected_case_id: selection.selected_case_id,
      selected_pointperson_user_id: selection.selected_pointperson_user_id,
    });
  } catch (error) {
    if (tryHandlePortalRequestError(error, res)) {
      return;
    }
    next(error);
  }
};

export const getPortalThreads = async (
  req: PortalAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const threads = await listPortalThreads(req.portalUser!.id);
    res.json({ threads });
  } catch (error) {
    next(error);
  }
};

export const createPortalThread = async (
  req: PortalAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const contactId = getPortalContactId(req);
    const { case_id, subject, message } = req.body as {
      case_id?: string;
      subject?: string | null;
      message: string;
    };

    const payload = await createPortalThreadWithMessage({
      portalUserId: req.portalUser!.id,
      contactId,
      caseId: case_id || null,
      subject: subject || null,
      messageText: message,
    });

    await logPortalActivity({
      portalUserId: req.portalUser!.id,
      action: 'messages.thread.create',
      details: `Created portal thread ${payload.thread.id}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });

    res.status(201).json(payload);
  } catch (error) {
    if (tryHandlePortalRequestError(error, res)) {
      return;
    }
    next(error);
  }
};

export const getPortalThread = async (
  req: PortalAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { threadId } = req.params;
    const thread = await getPortalThreadService(req.portalUser!.id, threadId);

    if (!thread) {
      notFoundMessage(res, 'Thread not found');
      return;
    }

    res.json(thread);
  } catch (error) {
    next(error);
  }
};

export const replyPortalThread = async (
  req: PortalAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { threadId } = req.params;
    const { message } = req.body as { message: string };

    const existing = await getPortalThreadService(req.portalUser!.id, threadId);
    if (!existing) {
      notFoundMessage(res, 'Thread not found');
      return;
    }

    const createdMessage = await addPortalMessage({
      portalUserId: req.portalUser!.id,
      threadId,
      messageText: message,
    });

    await logPortalActivity({
      portalUserId: req.portalUser!.id,
      action: 'messages.thread.reply',
      details: `Replied to portal thread ${threadId}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });

    res.status(201).json({ message: createdMessage });
  } catch (error) {
    if (tryHandlePortalRequestError(error, res)) {
      return;
    }
    next(error);
  }
};

export const markPortalThreadRead = async (
  req: PortalAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { threadId } = req.params;
    const existing = await getPortalThreadService(req.portalUser!.id, threadId);
    if (!existing) {
      notFoundMessage(res, 'Thread not found');
      return;
    }

    const updatedCount = await markPortalThreadReadService(req.portalUser!.id, threadId);
    res.json({ updated: updatedCount });
  } catch (error) {
    next(error);
  }
};

export const updatePortalThread = async (
  req: PortalAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { threadId } = req.params;
    const existing = await getPortalThreadService(req.portalUser!.id, threadId);
    if (!existing) {
      notFoundMessage(res, 'Thread not found');
      return;
    }

    const status = normalizePortalStatus(req.body.status);
    const subject = req.body.subject as string | null | undefined;

    const updated = await updateThread({
      threadId,
      status,
      subject,
      closedBy: null,
    });

    if (!updated) {
      notFoundMessage(res, 'Thread not found');
      return;
    }

    res.json({ thread: updated });
  } catch (error) {
    if (tryHandlePortalRequestError(error, res)) {
      return;
    }
    next(error);
  }
};

export const getPortalEvents = async (
  req: PortalAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const contactId = getPortalContactId(req);
    const events = await pool.query(
      `SELECT
         e.*,
         er.id as registration_id,
         er.registration_status
       FROM events e
       LEFT JOIN event_registrations er
         ON er.event_id = e.id AND er.contact_id = $1
       WHERE e.start_date >= NOW()
         AND e.status NOT IN ('cancelled', 'completed')
         AND (
           e.is_public = true
           OR er.id IS NOT NULL
         )
       ORDER BY e.start_date ASC`,
      [contactId]
    );

    res.json(events.rows);
  } catch (error) {
    next(error);
  }
};

export const registerPortalEvent = async (
  req: PortalAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const contactId = getPortalContactId(req);
    const { eventId } = req.params;
    const event = await pool.query(
      `SELECT id, is_public, start_date, status
       FROM events
       WHERE id = $1`,
      [eventId]
    );

    if (!event.rows[0]) {
      notFoundMessage(res, 'Event not found');
      return;
    }

    if (!event.rows[0].is_public) {
      forbidden(res, 'This event is not open for self-registration');
      return;
    }

    if (new Date(event.rows[0].start_date).getTime() < Date.now()) {
      badRequest(res, 'This event has already started');
      return;
    }

    if (['cancelled', 'completed'].includes(event.rows[0].status)) {
      badRequest(res, 'This event is not accepting registrations');
      return;
    }

    const registration = await eventService.registerContact({
      event_id: eventId,
      contact_id: contactId,
      registration_status: RegistrationStatus.REGISTERED,
    });

    await logPortalActivity({
      portalUserId: req.portalUser!.id,
      action: 'event.register',
      details: `Registered for event ${eventId}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });

    res.status(201).json(registration);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'Contact is already registered for this event') {
        conflict(res, 'Already registered for this event');
        return;
      }
      if (error.message === 'Event is at full capacity') {
        badRequest(res, error.message);
        return;
      }
      if (error.message === 'Event not found') {
        notFoundMessage(res, error.message);
        return;
      }
      if (error.message === 'Event is not open for registration') {
        badRequest(res, error.message);
        return;
      }
    }
    next(error);
  }
};

export const cancelPortalEventRegistration = async (
  req: PortalAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const contactId = getPortalContactId(req);
    const { eventId } = req.params;

    const registration = await pool.query(
      `SELECT id
       FROM event_registrations
       WHERE event_id = $1 AND contact_id = $2`,
      [eventId, contactId]
    );

    if (registration.rows.length === 0) {
      notFoundMessage(res, 'Registration not found');
      return;
    }
    await eventService.cancelRegistration(registration.rows[0].id as string);

    await logPortalActivity({
      portalUserId: req.portalUser!.id,
      action: 'event.cancel',
      details: `Cancelled registration for event ${eventId}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const getPortalAppointments = async (
  req: PortalAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const contactId = getPortalContactId(req);
    const appointments = await listPortalAppointments(contactId);
    res.json(appointments);
  } catch (error) {
    next(error);
  }
};

export const createPortalAppointment = async (
  req: PortalAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const contactId = getPortalContactId(req);
    const { case_id, title, description, start_time, end_time, location } = req.body as {
      case_id?: string;
      title: string;
      description?: string | null;
      start_time: string;
      end_time?: string | null;
      location?: string | null;
    };

    const result = await createPortalManualAppointmentRequest({
      contactId,
      portalUserId: req.portalUser!.id,
      caseId: case_id,
      title,
      description: description || null,
      startTime: start_time,
      endTime: end_time || null,
      location: location || null,
    });

    await logPortalActivity({
      portalUserId: req.portalUser!.id,
      action: 'appointment.request',
      details: `Requested appointment ${result.id}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });

    res.status(201).json(result);
  } catch (error) {
    if (tryHandlePortalRequestError(error, res)) {
      return;
    }
    next(error);
  }
};

export const cancelPortalAppointment = async (
  req: PortalAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const contactId = getPortalContactId(req);
    const { id } = req.params;
    const appointment = await cancelPortalAppointmentService({
      appointmentId: id,
      contactId,
    });

    if (!appointment) {
      notFoundMessage(res, 'Appointment not found');
      return;
    }

    await logPortalActivity({
      portalUserId: req.portalUser!.id,
      action: 'appointment.cancel',
      details: `Cancelled appointment ${id}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });

    res.json({ appointment });
  } catch (error) {
    next(error);
  }
};

export const getPortalAppointmentSlots = async (
  req: PortalAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const contactId = getPortalContactId(req);
    const caseId = typeof req.query.case_id === 'string' ? req.query.case_id : undefined;
    const payload = await listPortalAppointmentSlots(contactId, caseId);
    res.json(payload);
  } catch (error) {
    if (tryHandlePortalRequestError(error, res)) {
      return;
    }
    next(error);
  }
};

export const bookPortalAppointmentSlot = async (
  req: PortalAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const contactId = getPortalContactId(req);
    const { slotId } = req.params;
    const { case_id, title, description } = req.body as {
      case_id?: string;
      title?: string | null;
      description?: string | null;
    };

    const appointment = await bookPortalAppointmentSlotService({
      slotId,
      contactId,
      portalUserId: req.portalUser!.id,
      caseId: case_id || null,
      title: title || null,
      description: description || null,
    });

    await logPortalActivity({
      portalUserId: req.portalUser!.id,
      action: 'appointment.slot.book',
      details: `Booked appointment slot ${slotId}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });

    res.status(201).json({ appointment });
  } catch (error) {
    if (tryHandlePortalRequestError(error, res)) {
      return;
    }
    next(error);
  }
};

export const createPortalAppointmentRequest = async (
  req: PortalAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const contactId = getPortalContactId(req);
    const { case_id, title, description, start_time, end_time, location } = req.body as {
      case_id?: string;
      title: string;
      description?: string | null;
      start_time: string;
      end_time?: string | null;
      location?: string | null;
    };

    const appointment = await createPortalManualAppointmentRequest({
      contactId,
      portalUserId: req.portalUser!.id,
      caseId: case_id || null,
      title,
      description: description || null,
      startTime: start_time,
      endTime: end_time || null,
      location: location || null,
    });

    await logPortalActivity({
      portalUserId: req.portalUser!.id,
      action: 'appointment.request',
      details: `Requested appointment ${appointment.id}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });

    res.status(201).json({ appointment });
  } catch (error) {
    if (tryHandlePortalRequestError(error, res)) {
      return;
    }
    next(error);
  }
};

export const getPortalDocuments = async (
  req: PortalAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const contactId = getPortalContactId(req);
    const result = await pool.query(
      `SELECT id, original_name, document_type, title, description, file_size, mime_type, created_at
       FROM contact_documents
       WHERE contact_id = $1
         AND is_active = true
         AND is_portal_visible = true
       ORDER BY created_at DESC`,
      [contactId]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const getPortalForms = async (
  req: PortalAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const contactId = getPortalContactId(req);
    const result = await pool.query(
      `SELECT id, original_name, document_type, title, description, created_at
       FROM contact_documents
       WHERE contact_id = $1
         AND is_active = true
         AND is_portal_visible = true
         AND document_type IN ('consent_form', 'assessment', 'report')
       ORDER BY created_at DESC`,
      [contactId]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const getPortalNotes = async (
  req: PortalAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const contactId = getPortalContactId(req);
    const result = await pool.query(
      `SELECT id, note_type, subject, content, created_at
       FROM contact_notes
       WHERE contact_id = $1
         AND is_internal = false
         AND is_portal_visible = true
       ORDER BY created_at DESC`,
      [contactId]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const getPortalReminders = async (
  req: PortalAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const contactId = getPortalContactId(req);

    const appointments = await pool.query(
      `SELECT id, title, start_time
       FROM appointments
       WHERE contact_id = $1 AND status IN ('requested', 'confirmed')
       ORDER BY start_time ASC`,
      [contactId]
    );

    const events = await pool.query(
      `SELECT e.id, e.name, e.start_date
       FROM event_registrations er
       JOIN events e ON e.id = er.event_id
       WHERE er.contact_id = $1 AND e.start_date >= NOW()
       ORDER BY e.start_date ASC`,
      [contactId]
    );

    const reminders = [
      ...appointments.rows.map((appt) => ({
        type: 'appointment',
        id: appt.id,
        title: appt.title,
        date: appt.start_time,
      })),
      ...events.rows.map((event) => ({
        type: 'event',
        id: event.id,
        title: event.name,
        date: event.start_date,
      })),
    ];

    res.json(reminders);
  } catch (error) {
    next(error);
  }
};

export const downloadPortalDocument = async (
  req: PortalAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const contactId = getPortalContactId(req);
    const { id } = req.params;

    const result = await pool.query(
      `SELECT file_path, original_name, mime_type
       FROM contact_documents
       WHERE id = $1
         AND contact_id = $2
         AND is_active = true
         AND is_portal_visible = true`,
      [id, contactId]
    );

    if (result.rows.length === 0) {
      notFoundMessage(res, 'Document not found');
      return;
    }

    const document = result.rows[0];

    // Proxy download via existing storage mechanism
    const fs = await import('fs');
    const { default: fileStorage } = await import('../services/fileStorageService');
    const fullPath = fileStorage.getFullPath(document.file_path);
    const fileStream = fs.createReadStream(fullPath);

    res.setHeader('Content-Type', document.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${document.original_name}"`);
    fileStream.pipe(res);

    await logPortalActivity({
      portalUserId: req.portalUser!.id,
      action: 'document.download',
      details: `Downloaded document ${id}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });
  } catch (error) {
    logger.error('Failed to download portal document', { error });
    next(error);
  }
};

export const getCasePortalConversations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const caseId = req.params.id;
    const summaries = await listCaseThreads(caseId);
    const conversations = await Promise.all(
      summaries.map(async (thread) => {
        return getStaffThread(thread.id);
      })
    );
    res.json({ conversations: conversations.filter((entry) => entry !== null) });
  } catch (error) {
    next(error);
  }
};

export const replyCasePortalConversation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      forbidden(res, 'Authentication required');
      return;
    }

    const caseId = req.params.id;
    const threadId = req.params.threadId;
    const { message, is_internal } = req.body as { message: string; is_internal?: boolean };

    const thread = await getStaffThread(threadId);
    if (!thread || thread.thread.case_id !== caseId) {
      notFoundMessage(res, 'Conversation not found for this case');
      return;
    }

    const createdMessage = await addStaffMessage({
      threadId,
      senderUserId: req.user.id,
      messageText: message,
      isInternal: Boolean(is_internal),
    });
    await markStaffThreadRead(threadId);

    res.status(201).json({ message: createdMessage });
  } catch (error) {
    if (tryHandlePortalRequestError(error, res)) {
      return;
    }
    next(error);
  }
};
