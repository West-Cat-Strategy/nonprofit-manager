import pool from '@config/database';
import { logger } from '@config/logger';
import type {
  ContactEmailAddress,
  CreateContactEmailDTO,
  UpdateContactEmailDTO,
} from '@app-types/contact';
import { syncContactMethodSummaries } from '@services/contactMethodSyncService';
import type { ContactEmailsPort } from '../types/ports';

const CONTACT_EMAIL_COLUMNS = [
  'id',
  'contact_id',
  'email_address',
  'label',
  'is_primary',
  'created_at',
  'updated_at',
  'created_by',
  'modified_by',
].join(', ');

export async function getContactEmails(contactId: string): Promise<ContactEmailAddress[]> {
  try {
    const result = await pool.query(
      `
      SELECT ${CONTACT_EMAIL_COLUMNS} FROM contact_email_addresses
      WHERE contact_id = $1
      ORDER BY is_primary DESC, created_at ASC
      `,
      [contactId]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error getting contact emails:', error);
    throw Object.assign(new Error('Failed to retrieve contact email addresses'), { cause: error });
  }
}

export async function getContactEmailById(emailId: string): Promise<ContactEmailAddress | null> {
  try {
    const result = await pool.query(
      `SELECT ${CONTACT_EMAIL_COLUMNS} FROM contact_email_addresses WHERE id = $1`,
      [emailId]
    );

    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error getting contact email by ID:', error);
    throw Object.assign(new Error('Failed to retrieve contact email address'), { cause: error });
  }
}

export async function createContactEmail(
  contactId: string,
  data: CreateContactEmailDTO,
  userId: string
): Promise<ContactEmailAddress> {
  try {
    const result = await pool.query(
      `
      INSERT INTO contact_email_addresses (
        contact_id, email_address, label, is_primary, created_by, modified_by
      ) VALUES ($1, $2, $3, $4, $5, $5)
      RETURNING ${CONTACT_EMAIL_COLUMNS}
      `,
      [
        contactId,
        data.email_address,
        data.label || 'personal',
        data.is_primary || false,
        userId,
      ]
    );

    await syncContactMethodSummaries(contactId);
    logger.info(`Contact email created for contact ${contactId}`);
    return result.rows[0];
  } catch (error: any) {
    if (error.code === '23505') {
      throw Object.assign(new Error('This email address already exists for this contact'), { cause: error });
    }
    logger.error('Error creating contact email:', error);
    throw Object.assign(new Error('Failed to create contact email address'), { cause: error });
  }
}

export async function updateContactEmail(
  emailId: string,
  data: UpdateContactEmailDTO,
  userId: string
): Promise<ContactEmailAddress | null> {
  try {
    const fields: string[] = [];
    const values: any[] = [];
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

    const result = await pool.query(
      `UPDATE contact_email_addresses SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING ${CONTACT_EMAIL_COLUMNS}`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    await syncContactMethodSummaries(result.rows[0].contact_id as string);
    logger.info(`Contact email updated: ${emailId}`);
    return result.rows[0];
  } catch (error: any) {
    if (error.code === '23505') {
      throw Object.assign(new Error('This email address already exists for this contact'), { cause: error });
    }
    logger.error('Error updating contact email:', error);
    throw Object.assign(new Error('Failed to update contact email address'), { cause: error });
  }
}

export async function deleteContactEmail(emailId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `DELETE FROM contact_email_addresses WHERE id = $1 RETURNING id, contact_id`,
      [emailId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    await syncContactMethodSummaries(result.rows[0].contact_id as string);
    logger.info(`Contact email deleted: ${emailId}`);
    return true;
  } catch (error) {
    logger.error('Error deleting contact email:', error);
    throw Object.assign(new Error('Failed to delete contact email address'), { cause: error });
  }
}

export async function getPrimaryEmail(contactId: string): Promise<ContactEmailAddress | null> {
  try {
    const result = await pool.query(
      `
      SELECT ${CONTACT_EMAIL_COLUMNS} FROM contact_email_addresses
      WHERE contact_id = $1 AND is_primary = true
      LIMIT 1
      `,
      [contactId]
    );

    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error getting primary email:', error);
    throw Object.assign(new Error('Failed to retrieve primary email'), { cause: error });
  }
}

export class ContactEmailsRepository implements ContactEmailsPort {
  async list(contactId: string): Promise<ContactEmailAddress[]> {
    return getContactEmails(contactId);
  }

  async getById(emailId: string): Promise<ContactEmailAddress | null> {
    return getContactEmailById(emailId);
  }

  async create(contactId: string, payload: CreateContactEmailDTO, userId: string): Promise<ContactEmailAddress> {
    return createContactEmail(contactId, payload, userId);
  }

  async update(
    emailId: string,
    payload: UpdateContactEmailDTO,
    userId: string
  ): Promise<ContactEmailAddress | null> {
    return updateContactEmail(emailId, payload, userId);
  }

  async delete(emailId: string): Promise<boolean> {
    return deleteContactEmail(emailId);
  }
}
