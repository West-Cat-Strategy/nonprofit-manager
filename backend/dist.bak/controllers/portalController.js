"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadPortalDocument = exports.getPortalReminders = exports.getPortalNotes = exports.getPortalForms = exports.getPortalDocuments = exports.cancelPortalAppointment = exports.createPortalAppointment = exports.getPortalAppointments = exports.cancelPortalEventRegistration = exports.registerPortalEvent = exports.getPortalEvents = exports.deletePortalRelationship = exports.updatePortalRelationship = exports.createPortalRelationship = exports.getPortalRelationships = exports.updatePortalProfile = exports.getPortalProfile = void 0;
const database_1 = __importDefault(require("../config/database"));
const logger_1 = require("../config/logger");
const portalActivityService_1 = require("../services/portalActivityService");
const getPortalContactId = (req) => {
    if (!req.portalUser?.contactId) {
        throw new Error('Portal user not linked to a contact');
    }
    return req.portalUser.contactId;
};
const getPortalProfile = async (req, res, next) => {
    try {
        const contactId = getPortalContactId(req);
        const result = await database_1.default.query(`SELECT
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
       WHERE c.id = $1`, [contactId]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Contact not found' });
            return;
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        next(error);
    }
};
exports.getPortalProfile = getPortalProfile;
const updatePortalProfile = async (req, res, next) => {
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
        ];
        const fields = [];
        const values = [];
        let index = 1;
        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                fields.push(`${field} = $${index++}`);
                values.push(req.body[field]);
            }
        });
        if (fields.length === 0) {
            res.status(400).json({ error: 'No valid fields provided' });
            return;
        }
        values.push(contactId);
        const result = await database_1.default.query(`UPDATE contacts SET ${fields.join(', ')}, updated_at = NOW(), modified_by = NULL
       WHERE id = $${index}
       RETURNING id as contact_id, first_name, last_name, email, phone, mobile_phone,
         address_line1, address_line2, city, state_province, postal_code, country,
         preferred_contact_method, pronouns, gender`, values);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Contact not found' });
            return;
        }
        // Sync portal user email if email changed
        if (req.body.email) {
            await database_1.default.query('UPDATE portal_users SET email = $1 WHERE id = $2', [
                req.body.email.toLowerCase(),
                req.portalUser.id,
            ]);
        }
        await (0, portalActivityService_1.logPortalActivity)({
            portalUserId: req.portalUser.id,
            action: 'profile.update',
            details: 'Profile updated',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || null,
        });
        res.json(result.rows[0]);
    }
    catch (error) {
        next(error);
    }
};
exports.updatePortalProfile = updatePortalProfile;
const getPortalRelationships = async (req, res, next) => {
    try {
        const contactId = getPortalContactId(req);
        const result = await database_1.default.query(`SELECT
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
      ORDER BY cr.created_at DESC`, [contactId]);
        res.json(result.rows);
    }
    catch (error) {
        next(error);
    }
};
exports.getPortalRelationships = getPortalRelationships;
const createPortalRelationship = async (req, res, next) => {
    try {
        const contactId = getPortalContactId(req);
        const { related_contact_id, related_contact, relationship_type, relationship_label, notes } = req.body;
        let relatedContactId = related_contact_id;
        if (!relatedContactId && related_contact) {
            const { first_name, last_name, email, phone } = related_contact;
            const insertResult = await database_1.default.query(`INSERT INTO contacts (first_name, last_name, email, phone, created_by, modified_by)
         VALUES ($1, $2, $3, $4, $5, $5)
         RETURNING id`, [first_name, last_name, email || null, phone || null, null]);
            relatedContactId = insertResult.rows[0].id;
        }
        if (!relatedContactId) {
            res.status(400).json({ error: 'Related contact is required' });
            return;
        }
        const result = await database_1.default.query(`INSERT INTO contact_relationships (
        contact_id, related_contact_id, relationship_type, relationship_label, notes,
        is_bidirectional, inverse_relationship_type, created_by, modified_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
      RETURNING id, relationship_type, relationship_label, notes, created_at`, [
            contactId,
            relatedContactId,
            relationship_type,
            relationship_label || null,
            notes || null,
            false,
            null,
            null,
        ]);
        await (0, portalActivityService_1.logPortalActivity)({
            portalUserId: req.portalUser.id,
            action: 'relationship.add',
            details: `Added relationship ${result.rows[0].id}`,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || null,
        });
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        next(error);
    }
};
exports.createPortalRelationship = createPortalRelationship;
const updatePortalRelationship = async (req, res, next) => {
    try {
        const contactId = getPortalContactId(req);
        const { id } = req.params;
        const { relationship_type, relationship_label, notes } = req.body;
        const fields = [];
        const values = [];
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
            res.status(400).json({ error: 'No updates provided' });
            return;
        }
        values.push(id, contactId);
        const result = await database_1.default.query(`UPDATE contact_relationships
       SET ${fields.join(', ')}, updated_at = NOW(), modified_by = NULL
       WHERE id = $${index++} AND contact_id = $${index}
       RETURNING id, relationship_type, relationship_label, notes, updated_at`, values);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Relationship not found' });
            return;
        }
        await (0, portalActivityService_1.logPortalActivity)({
            portalUserId: req.portalUser.id,
            action: 'relationship.update',
            details: `Updated relationship ${id}`,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || null,
        });
        res.json(result.rows[0]);
    }
    catch (error) {
        next(error);
    }
};
exports.updatePortalRelationship = updatePortalRelationship;
const deletePortalRelationship = async (req, res, next) => {
    try {
        const contactId = getPortalContactId(req);
        const { id } = req.params;
        const result = await database_1.default.query(`UPDATE contact_relationships SET is_active = false
       WHERE id = $1 AND contact_id = $2
       RETURNING id`, [id, contactId]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Relationship not found' });
            return;
        }
        await (0, portalActivityService_1.logPortalActivity)({
            portalUserId: req.portalUser.id,
            action: 'relationship.remove',
            details: `Removed relationship ${id}`,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || null,
        });
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
};
exports.deletePortalRelationship = deletePortalRelationship;
const getPortalEvents = async (req, res, next) => {
    try {
        const contactId = getPortalContactId(req);
        const events = await database_1.default.query(`SELECT e.*, er.id as registration_id, er.registration_status
       FROM events e
       LEFT JOIN event_registrations er
         ON er.event_id = e.id AND er.contact_id = $1
       ORDER BY e.start_date ASC`, [contactId]);
        res.json(events.rows);
    }
    catch (error) {
        next(error);
    }
};
exports.getPortalEvents = getPortalEvents;
const registerPortalEvent = async (req, res, next) => {
    try {
        const contactId = getPortalContactId(req);
        const { eventId } = req.params;
        const registration = await database_1.default.query(`INSERT INTO event_registrations (event_id, contact_id, registration_status)
       VALUES ($1, $2, 'registered')
       RETURNING id as registration_id, event_id, contact_id, registration_status`, [eventId, contactId]);
        await database_1.default.query('UPDATE events SET registered_count = registered_count + 1 WHERE id = $1', [
            eventId,
        ]);
        await (0, portalActivityService_1.logPortalActivity)({
            portalUserId: req.portalUser.id,
            action: 'event.register',
            details: `Registered for event ${eventId}`,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || null,
        });
        res.status(201).json(registration.rows[0]);
    }
    catch (error) {
        if (error.code === '23505') {
            res.status(409).json({ error: 'Already registered for this event' });
            return;
        }
        next(error);
    }
};
exports.registerPortalEvent = registerPortalEvent;
const cancelPortalEventRegistration = async (req, res, next) => {
    try {
        const contactId = getPortalContactId(req);
        const { eventId } = req.params;
        const registration = await database_1.default.query(`DELETE FROM event_registrations
       WHERE event_id = $1 AND contact_id = $2
       RETURNING id`, [eventId, contactId]);
        if (registration.rows.length === 0) {
            res.status(404).json({ error: 'Registration not found' });
            return;
        }
        await database_1.default.query('UPDATE events SET registered_count = GREATEST(0, registered_count - 1) WHERE id = $1', [
            eventId,
        ]);
        await (0, portalActivityService_1.logPortalActivity)({
            portalUserId: req.portalUser.id,
            action: 'event.cancel',
            details: `Cancelled registration for event ${eventId}`,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || null,
        });
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
};
exports.cancelPortalEventRegistration = cancelPortalEventRegistration;
const getPortalAppointments = async (req, res, next) => {
    try {
        const contactId = getPortalContactId(req);
        const result = await database_1.default.query(`SELECT id, title, description, start_time, end_time, status, location, created_at
       FROM appointments
       WHERE contact_id = $1
       ORDER BY start_time ASC`, [contactId]);
        res.json(result.rows);
    }
    catch (error) {
        next(error);
    }
};
exports.getPortalAppointments = getPortalAppointments;
const createPortalAppointment = async (req, res, next) => {
    try {
        const contactId = getPortalContactId(req);
        const { title, description, start_time, end_time, location } = req.body;
        if (!title || !start_time) {
            res.status(400).json({ error: 'Title and start time are required' });
            return;
        }
        const result = await database_1.default.query(`INSERT INTO appointments (
        contact_id, title, description, start_time, end_time, status, location, requested_by_portal
      ) VALUES ($1, $2, $3, $4, $5, 'requested', $6, $7)
      RETURNING id, title, description, start_time, end_time, status, location`, [contactId, title, description || null, start_time, end_time || null, location || null, req.portalUser.id]);
        await (0, portalActivityService_1.logPortalActivity)({
            portalUserId: req.portalUser.id,
            action: 'appointment.request',
            details: `Requested appointment ${result.rows[0].id}`,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || null,
        });
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        next(error);
    }
};
exports.createPortalAppointment = createPortalAppointment;
const cancelPortalAppointment = async (req, res, next) => {
    try {
        const contactId = getPortalContactId(req);
        const { id } = req.params;
        const result = await database_1.default.query(`UPDATE appointments
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND contact_id = $2
       RETURNING id`, [id, contactId]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Appointment not found' });
            return;
        }
        await (0, portalActivityService_1.logPortalActivity)({
            portalUserId: req.portalUser.id,
            action: 'appointment.cancel',
            details: `Cancelled appointment ${id}`,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || null,
        });
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
};
exports.cancelPortalAppointment = cancelPortalAppointment;
const getPortalDocuments = async (req, res, next) => {
    try {
        const contactId = getPortalContactId(req);
        const result = await database_1.default.query(`SELECT id, original_name, document_type, title, description, file_size, mime_type, created_at
       FROM contact_documents
       WHERE contact_id = $1 AND is_active = true
       ORDER BY created_at DESC`, [contactId]);
        res.json(result.rows);
    }
    catch (error) {
        next(error);
    }
};
exports.getPortalDocuments = getPortalDocuments;
const getPortalForms = async (req, res, next) => {
    try {
        const contactId = getPortalContactId(req);
        const result = await database_1.default.query(`SELECT id, original_name, document_type, title, description, created_at
       FROM contact_documents
       WHERE contact_id = $1 AND is_active = true
         AND document_type IN ('consent_form', 'assessment', 'report')
       ORDER BY created_at DESC`, [contactId]);
        res.json(result.rows);
    }
    catch (error) {
        next(error);
    }
};
exports.getPortalForms = getPortalForms;
const getPortalNotes = async (req, res, next) => {
    try {
        const contactId = getPortalContactId(req);
        const result = await database_1.default.query(`SELECT id, note_type, subject, content, created_at
       FROM contact_notes
       WHERE contact_id = $1
       ORDER BY created_at DESC`, [contactId]);
        res.json(result.rows);
    }
    catch (error) {
        next(error);
    }
};
exports.getPortalNotes = getPortalNotes;
const getPortalReminders = async (req, res, next) => {
    try {
        const contactId = getPortalContactId(req);
        const appointments = await database_1.default.query(`SELECT id, title, start_time
       FROM appointments
       WHERE contact_id = $1 AND status IN ('requested', 'confirmed')
       ORDER BY start_time ASC`, [contactId]);
        const events = await database_1.default.query(`SELECT e.id, e.name, e.start_date
       FROM event_registrations er
       JOIN events e ON e.id = er.event_id
       WHERE er.contact_id = $1 AND e.start_date >= NOW()
       ORDER BY e.start_date ASC`, [contactId]);
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
    }
    catch (error) {
        next(error);
    }
};
exports.getPortalReminders = getPortalReminders;
const downloadPortalDocument = async (req, res, next) => {
    try {
        const contactId = getPortalContactId(req);
        const { id } = req.params;
        const result = await database_1.default.query(`SELECT file_path, original_name, mime_type
       FROM contact_documents
       WHERE id = $1 AND contact_id = $2 AND is_active = true`, [id, contactId]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Document not found' });
            return;
        }
        const document = result.rows[0];
        // Proxy download via existing storage mechanism
        const fs = await Promise.resolve().then(() => __importStar(require('fs')));
        const { default: fileStorage } = await Promise.resolve().then(() => __importStar(require('../services/fileStorageService')));
        const fullPath = fileStorage.getFullPath(document.file_path);
        const fileStream = fs.createReadStream(fullPath);
        res.setHeader('Content-Type', document.mime_type);
        res.setHeader('Content-Disposition', `attachment; filename="${document.original_name}"`);
        fileStream.pipe(res);
        await (0, portalActivityService_1.logPortalActivity)({
            portalUserId: req.portalUser.id,
            action: 'document.download',
            details: `Downloaded document ${id}`,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || null,
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to download portal document', { error });
        next(error);
    }
};
exports.downloadPortalDocument = downloadPortalDocument;
//# sourceMappingURL=portalController.js.map