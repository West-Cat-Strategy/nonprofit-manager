import { Response, NextFunction } from 'express';
import pool from '@config/database';
import { PortalAuthRequest } from '@middleware/portalAuth';
import { logger } from '@config/logger';
import { logPortalActivity } from '@services/domains/integration';
import { badRequest, conflict, notFoundMessage } from '@utils/responseHelpers';

const getPortalContactId = (req: PortalAuthRequest): string => {
  if (!req.portalUser?.contactId) {
    throw new Error('Portal user not linked to a contact');
  }
  return req.portalUser.contactId;
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

export const getPortalEvents = async (
  req: PortalAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const contactId = getPortalContactId(req);
    const events = await pool.query(
      `SELECT e.*, er.id as registration_id, er.registration_status
       FROM events e
       LEFT JOIN event_registrations er
         ON er.event_id = e.id AND er.contact_id = $1
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

    const registration = await pool.query(
      `INSERT INTO event_registrations (event_id, contact_id, registration_status)
       VALUES ($1, $2, 'registered')
       RETURNING id as registration_id, event_id, contact_id, registration_status`,
      [eventId, contactId]
    );

    await pool.query('UPDATE events SET registered_count = registered_count + 1 WHERE id = $1', [
      eventId,
    ]);

    await logPortalActivity({
      portalUserId: req.portalUser!.id,
      action: 'event.register',
      details: `Registered for event ${eventId}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });

    res.status(201).json(registration.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      conflict(res, 'Already registered for this event');
      return;
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
      `DELETE FROM event_registrations
       WHERE event_id = $1 AND contact_id = $2
       RETURNING id`,
      [eventId, contactId]
    );

    if (registration.rows.length === 0) {
      notFoundMessage(res, 'Registration not found');
      return;
    }

    await pool.query('UPDATE events SET registered_count = GREATEST(0, registered_count - 1) WHERE id = $1', [
      eventId,
    ]);

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
    const result = await pool.query(
      `SELECT id, title, description, start_time, end_time, status, location, created_at
       FROM appointments
       WHERE contact_id = $1
       ORDER BY start_time ASC`,
      [contactId]
    );
    res.json(result.rows);
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
    const { title, description, start_time, end_time, location } = req.body;

    if (!title || !start_time) {
      badRequest(res, 'Title and start time are required');
      return;
    }

    const result = await pool.query(
      `INSERT INTO appointments (
        contact_id, title, description, start_time, end_time, status, location, requested_by_portal
      ) VALUES ($1, $2, $3, $4, $5, 'requested', $6, $7)
      RETURNING id, title, description, start_time, end_time, status, location`,
      [contactId, title, description || null, start_time, end_time || null, location || null, req.portalUser!.id]
    );

    await logPortalActivity({
      portalUserId: req.portalUser!.id,
      action: 'appointment.request',
      details: `Requested appointment ${result.rows[0].id}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });

    res.status(201).json(result.rows[0]);
  } catch (error) {
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

    const result = await pool.query(
      `UPDATE appointments
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND contact_id = $2
       RETURNING id`,
      [id, contactId]
    );

    if (result.rows.length === 0) {
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

    res.status(204).send();
  } catch (error) {
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
       WHERE contact_id = $1 AND is_active = true
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
       WHERE contact_id = $1 AND is_active = true
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
       WHERE id = $1 AND contact_id = $2 AND is_active = true`,
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
