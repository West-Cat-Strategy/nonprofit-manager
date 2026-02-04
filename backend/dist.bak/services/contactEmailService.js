"use strict";
/**
 * Contact Email Service
 * Handles CRUD operations for contact email addresses
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContactEmails = getContactEmails;
exports.getContactEmailById = getContactEmailById;
exports.createContactEmail = createContactEmail;
exports.updateContactEmail = updateContactEmail;
exports.deleteContactEmail = deleteContactEmail;
exports.getPrimaryEmail = getPrimaryEmail;
const database_1 = __importDefault(require("../config/database"));
const logger_1 = require("../config/logger");
/**
 * Get all email addresses for a contact
 */
async function getContactEmails(contactId) {
    try {
        const result = await database_1.default.query(`
      SELECT * FROM contact_email_addresses
      WHERE contact_id = $1
      ORDER BY is_primary DESC, created_at ASC
      `, [contactId]);
        return result.rows;
    }
    catch (error) {
        logger_1.logger.error('Error getting contact emails:', error);
        throw new Error('Failed to retrieve contact email addresses');
    }
}
/**
 * Get a single email address by ID
 */
async function getContactEmailById(emailId) {
    try {
        const result = await database_1.default.query(`SELECT * FROM contact_email_addresses WHERE id = $1`, [emailId]);
        return result.rows[0] || null;
    }
    catch (error) {
        logger_1.logger.error('Error getting contact email by ID:', error);
        throw new Error('Failed to retrieve contact email address');
    }
}
/**
 * Create a new email address for a contact
 */
async function createContactEmail(contactId, data, userId) {
    try {
        const result = await database_1.default.query(`
      INSERT INTO contact_email_addresses (
        contact_id, email_address, label, is_primary, created_by, modified_by
      ) VALUES ($1, $2, $3, $4, $5, $5)
      RETURNING *
      `, [
            contactId,
            data.email_address,
            data.label || 'personal',
            data.is_primary || false,
            userId,
        ]);
        logger_1.logger.info(`Contact email created for contact ${contactId}`);
        return result.rows[0];
    }
    catch (error) {
        if (error.code === '23505') {
            throw new Error('This email address already exists for this contact');
        }
        logger_1.logger.error('Error creating contact email:', error);
        throw new Error('Failed to create contact email address');
    }
}
/**
 * Update an email address
 */
async function updateContactEmail(emailId, data, userId) {
    try {
        const fields = [];
        const values = [];
        let paramIndex = 1;
        if (data.email_address !== undefined) {
            fields.push(`email_address = $${paramIndex++}`);
            values.push(data.email_address);
        }
        if (data.label !== undefined) {
            fields.push(`label = $${paramIndex++}`);
            values.push(data.label);
        }
        if (data.is_primary !== undefined) {
            fields.push(`is_primary = $${paramIndex++}`);
            values.push(data.is_primary);
        }
        if (fields.length === 0) {
            throw new Error('No fields to update');
        }
        fields.push(`modified_by = $${paramIndex++}`);
        values.push(userId);
        values.push(emailId);
        const result = await database_1.default.query(`UPDATE contact_email_addresses SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`, values);
        if (result.rows.length === 0) {
            return null;
        }
        logger_1.logger.info(`Contact email updated: ${emailId}`);
        return result.rows[0];
    }
    catch (error) {
        if (error.code === '23505') {
            throw new Error('This email address already exists for this contact');
        }
        logger_1.logger.error('Error updating contact email:', error);
        throw new Error('Failed to update contact email address');
    }
}
/**
 * Delete an email address
 */
async function deleteContactEmail(emailId) {
    try {
        const result = await database_1.default.query(`DELETE FROM contact_email_addresses WHERE id = $1 RETURNING id`, [emailId]);
        if (result.rows.length === 0) {
            return false;
        }
        logger_1.logger.info(`Contact email deleted: ${emailId}`);
        return true;
    }
    catch (error) {
        logger_1.logger.error('Error deleting contact email:', error);
        throw new Error('Failed to delete contact email address');
    }
}
/**
 * Get primary email for a contact
 */
async function getPrimaryEmail(contactId) {
    try {
        const result = await database_1.default.query(`
      SELECT * FROM contact_email_addresses
      WHERE contact_id = $1 AND is_primary = true
      LIMIT 1
      `, [contactId]);
        return result.rows[0] || null;
    }
    catch (error) {
        logger_1.logger.error('Error getting primary email:', error);
        throw new Error('Failed to retrieve primary email');
    }
}
//# sourceMappingURL=contactEmailService.js.map