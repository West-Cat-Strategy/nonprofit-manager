/**
 * Contact Phone Service
 * Handles CRUD operations for contact phone numbers
 */

import pool from '@config/database';
import { logger } from '@config/logger';
import type {
  ContactPhoneNumber,
  CreateContactPhoneDTO,
  UpdateContactPhoneDTO,
} from '@app-types/contact';

/**
 * Get all phone numbers for a contact
 */
export async function getContactPhones(contactId: string): Promise<ContactPhoneNumber[]> {
  try {
    const result = await pool.query(
      `
      SELECT * FROM contact_phone_numbers
      WHERE contact_id = $1
      ORDER BY is_primary DESC, created_at ASC
      `,
      [contactId]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error getting contact phones:', error);
    throw new Error('Failed to retrieve contact phone numbers');
  }
}

/**
 * Get a single phone number by ID
 */
export async function getContactPhoneById(phoneId: string): Promise<ContactPhoneNumber | null> {
  try {
    const result = await pool.query(
      `SELECT * FROM contact_phone_numbers WHERE id = $1`,
      [phoneId]
    );

    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error getting contact phone by ID:', error);
    throw new Error('Failed to retrieve contact phone number');
  }
}

/**
 * Create a new phone number for a contact
 */
export async function createContactPhone(
  contactId: string,
  data: CreateContactPhoneDTO,
  userId: string
): Promise<ContactPhoneNumber> {
  try {
    const result = await pool.query(
      `
      INSERT INTO contact_phone_numbers (
        contact_id, phone_number, label, is_primary, created_by, modified_by
      ) VALUES ($1, $2, $3, $4, $5, $5)
      RETURNING *
      `,
      [
        contactId,
        data.phone_number,
        data.label || 'mobile',
        data.is_primary || false,
        userId,
      ]
    );

    logger.info(`Contact phone created for contact ${contactId}`);
    return result.rows[0];
  } catch (error: any) {
    if (error.code === '23505') {
      throw new Error('This phone number already exists for this contact');
    }
    logger.error('Error creating contact phone:', error);
    throw new Error('Failed to create contact phone number');
  }
}

/**
 * Update a phone number
 */
export async function updateContactPhone(
  phoneId: string,
  data: UpdateContactPhoneDTO,
  userId: string
): Promise<ContactPhoneNumber | null> {
  try {
    const fields: string[] = [];
    const values: any[] = [];
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

    const result = await pool.query(
      `UPDATE contact_phone_numbers SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    logger.info(`Contact phone updated: ${phoneId}`);
    return result.rows[0];
  } catch (error: any) {
    if (error.code === '23505') {
      throw new Error('This phone number already exists for this contact');
    }
    logger.error('Error updating contact phone:', error);
    throw new Error('Failed to update contact phone number');
  }
}

/**
 * Delete a phone number
 */
export async function deleteContactPhone(phoneId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `DELETE FROM contact_phone_numbers WHERE id = $1 RETURNING id`,
      [phoneId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    logger.info(`Contact phone deleted: ${phoneId}`);
    return true;
  } catch (error) {
    logger.error('Error deleting contact phone:', error);
    throw new Error('Failed to delete contact phone number');
  }
}

/**
 * Get primary phone for a contact
 */
export async function getPrimaryPhone(contactId: string): Promise<ContactPhoneNumber | null> {
  try {
    const result = await pool.query(
      `
      SELECT * FROM contact_phone_numbers
      WHERE contact_id = $1 AND is_primary = true
      LIMIT 1
      `,
      [contactId]
    );

    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error getting primary phone:', error);
    throw new Error('Failed to retrieve primary phone');
  }
}
