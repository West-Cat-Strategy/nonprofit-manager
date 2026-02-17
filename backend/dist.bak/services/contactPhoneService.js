"use strict";
/**
 * Contact Phone Service
 * Handles CRUD operations for contact phone numbers
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContactPhones = getContactPhones;
exports.getContactPhoneById = getContactPhoneById;
exports.createContactPhone = createContactPhone;
exports.updateContactPhone = updateContactPhone;
exports.deleteContactPhone = deleteContactPhone;
exports.getPrimaryPhone = getPrimaryPhone;
const database_1 = __importDefault(require("../config/database"));
const logger_1 = require("../config/logger");
/**
 * Get all phone numbers for a contact
 */
async function getContactPhones(contactId) {
    try {
        const result = await database_1.default.query(`
      SELECT * FROM contact_phone_numbers
      WHERE contact_id = $1
      ORDER BY is_primary DESC, created_at ASC
      `, [contactId]);
        return result.rows;
    }
    catch (error) {
        logger_1.logger.error('Error getting contact phones:', error);
        throw new Error('Failed to retrieve contact phone numbers');
    }
}
/**
 * Get a single phone number by ID
 */
async function getContactPhoneById(phoneId) {
    try {
        const result = await database_1.default.query(`SELECT * FROM contact_phone_numbers WHERE id = $1`, [phoneId]);
        return result.rows[0] || null;
    }
    catch (error) {
        logger_1.logger.error('Error getting contact phone by ID:', error);
        throw new Error('Failed to retrieve contact phone number');
    }
}
/**
 * Create a new phone number for a contact
 */
async function createContactPhone(contactId, data, userId) {
    try {
        const result = await database_1.default.query(`
      INSERT INTO contact_phone_numbers (
        contact_id, phone_number, label, is_primary, created_by, modified_by
      ) VALUES ($1, $2, $3, $4, $5, $5)
      RETURNING *
      `, [
            contactId,
            data.phone_number,
            data.label || 'mobile',
            data.is_primary || false,
            userId,
        ]);
        logger_1.logger.info(`Contact phone created for contact ${contactId}`);
        return result.rows[0];
    }
    catch (error) {
        if (error.code === '23505') {
            throw new Error('This phone number already exists for this contact');
        }
        logger_1.logger.error('Error creating contact phone:', error);
        throw new Error('Failed to create contact phone number');
    }
}
/**
 * Update a phone number
 */
async function updateContactPhone(phoneId, data, userId) {
    try {
        const fields = [];
        const values = [];
        let paramIndex = 1;
        if (data.phone_number !== undefined) {
            fields.push(`phone_number = $${paramIndex++}`);
            values.push(data.phone_number);
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
        values.push(phoneId);
        const result = await database_1.default.query(`UPDATE contact_phone_numbers SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`, values);
        if (result.rows.length === 0) {
            return null;
        }
        logger_1.logger.info(`Contact phone updated: ${phoneId}`);
        return result.rows[0];
    }
    catch (error) {
        if (error.code === '23505') {
            throw new Error('This phone number already exists for this contact');
        }
        logger_1.logger.error('Error updating contact phone:', error);
        throw new Error('Failed to update contact phone number');
    }
}
/**
 * Delete a phone number
 */
async function deleteContactPhone(phoneId) {
    try {
        const result = await database_1.default.query(`DELETE FROM contact_phone_numbers WHERE id = $1 RETURNING id`, [phoneId]);
        if (result.rows.length === 0) {
            return false;
        }
        logger_1.logger.info(`Contact phone deleted: ${phoneId}`);
        return true;
    }
    catch (error) {
        logger_1.logger.error('Error deleting contact phone:', error);
        throw new Error('Failed to delete contact phone number');
    }
}
/**
 * Get primary phone for a contact
 */
async function getPrimaryPhone(contactId) {
    try {
        const result = await database_1.default.query(`
      SELECT * FROM contact_phone_numbers
      WHERE contact_id = $1 AND is_primary = true
      LIMIT 1
      `, [contactId]);
        return result.rows[0] || null;
    }
    catch (error) {
        logger_1.logger.error('Error getting primary phone:', error);
        throw new Error('Failed to retrieve primary phone');
    }
}
//# sourceMappingURL=contactPhoneService.js.map