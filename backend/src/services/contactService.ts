/**
 * Contact Service
 * Handles business logic and database operations for contacts
 */

import { Pool } from 'pg';
import {
  Contact,
  CreateContactDTO,
  UpdateContactDTO,
  ContactFilters,
  PaginationParams,
  PaginatedContacts,
} from '../types/contact';
import { logger } from '../config/logger';

type QueryValue = string | number | boolean | null;

export class ContactService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Get all contacts with filtering and pagination
   */
  async getContacts(
    filters: ContactFilters = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedContacts> {
    try {
      const page = pagination.page || 1;
      const limit = pagination.limit || 20;
      const offset = (page - 1) * limit;
      const sortBy = pagination.sort_by || 'created_at';
      const sortOrder = pagination.sort_order || 'desc';

      // Build WHERE clause
      const conditions: string[] = [];
      const values: QueryValue[] = [];
      let paramCounter = 1;

      if (filters.search) {
        conditions.push(`(
          c.first_name ILIKE $${paramCounter} OR
          c.last_name ILIKE $${paramCounter} OR
          c.email ILIKE $${paramCounter} OR
          c.phone ILIKE $${paramCounter} OR
          c.mobile_phone ILIKE $${paramCounter} OR
          CONCAT(c.first_name, ' ', c.last_name) ILIKE $${paramCounter}
        )`);
        values.push(`%${filters.search}%`);
        paramCounter++;
      }

      if (filters.account_id) {
        conditions.push(`c.account_id = $${paramCounter}`);
        values.push(filters.account_id);
        paramCounter++;
      }

      // Note: contact_role column will be added in future migration
      // if (filters.contact_role) {
      //   conditions.push(`c.contact_role = $${paramCounter}`);
      //   values.push(filters.contact_role);
      //   paramCounter++;
      // }

      if (filters.is_active !== undefined) {
        conditions.push(`c.is_active = $${paramCounter}`);
        values.push(filters.is_active);
        paramCounter++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM contacts c ${whereClause}`;
      const countResult = await this.pool.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      // Get paginated data with account info
      const dataQuery = `
        SELECT
          c.id as contact_id,
          c.account_id,
          c.first_name,
          c.last_name,
          c.email,
          c.phone,
          c.mobile_phone,
          c.job_title,
          c.preferred_contact_method,
          c.address_line1,
          c.address_line2,
          c.city,
          c.state_province,
          c.postal_code,
          c.country,
          c.notes,
          c.is_active,
          c.created_at,
          c.updated_at,
          a.account_name
        FROM contacts c
        LEFT JOIN accounts a ON c.account_id = a.id
        ${whereClause}
        ORDER BY c.${sortBy} ${sortOrder.toUpperCase()}
        LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
      `;
      const dataResult = await this.pool.query(dataQuery, [...values, limit, offset]);

      return {
        data: dataResult.rows,
        pagination: {
          total,
          page,
          limit,
          total_pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting contacts:', error);
      throw new Error('Failed to retrieve contacts');
    }
  }

  /**
   * Get contact by ID
   */
  async getContactById(contactId: string): Promise<Contact | null> {
    try {
      const result = await this.pool.query(
        `SELECT
          c.id as contact_id,
          c.account_id,
          c.first_name,
          c.last_name,
          c.email,
          c.phone,
          c.mobile_phone,
          c.job_title,
          c.preferred_contact_method,
          c.address_line1,
          c.address_line2,
          c.city,
          c.state_province,
          c.postal_code,
          c.country,
          c.notes,
          c.is_active,
          c.created_at,
          c.updated_at,
          a.account_name
         FROM contacts c
         LEFT JOIN accounts a ON c.account_id = a.id
         WHERE c.id = $1`,
        [contactId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting contact by ID:', error);
      throw new Error('Failed to retrieve contact');
    }
  }

  /**
   * Create new contact
   */
  async createContact(data: CreateContactDTO, userId: string): Promise<Contact> {
    try {
      const result = await this.pool.query(
        `INSERT INTO contacts (
          account_id, first_name, last_name,
          email, phone, mobile_phone,
          address_line1, address_line2, city, state_province, postal_code, country,
          job_title, preferred_contact_method, notes,
          created_by, modified_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $16)
        RETURNING id as contact_id, account_id, first_name, last_name,
          email, phone, mobile_phone,
          address_line1, address_line2, city, state_province, postal_code, country,
          job_title, preferred_contact_method, notes,
          is_active, created_at, updated_at, created_by, modified_by`,
        [
          data.account_id || null,
          data.first_name,
          data.last_name,
          data.email || null,
          data.phone || null,
          data.mobile_phone || null,
          data.address_line1 || null,
          data.address_line2 || null,
          data.city || null,
          data.state_province || null,
          data.postal_code || null,
          data.country || null,
          data.job_title || null,
          data.preferred_contact_method || null,
          data.notes || null,
          userId,
        ]
      );

      logger.info(`Contact created: ${result.rows[0].contact_id}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating contact:', error);
      throw new Error('Failed to create contact');
    }
  }

  /**
   * Update contact
   */
  async updateContact(
    contactId: string,
    data: UpdateContactDTO,
    userId: string
  ): Promise<Contact | null> {
    try {
      const fields: string[] = [];
      const values: QueryValue[] = [];
      let paramCounter = 1;

      // Build dynamic update query
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          fields.push(`${key} = $${paramCounter}`);
          values.push(value);
          paramCounter++;
        }
      });

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      // Add modified_by and updated_at
      fields.push(`modified_by = $${paramCounter}`);
      values.push(userId);
      paramCounter++;
      fields.push(`updated_at = CURRENT_TIMESTAMP`);

      // Add contact_id for WHERE clause
      values.push(contactId);

      const query = `
        UPDATE contacts
        SET ${fields.join(', ')}
        WHERE id = $${paramCounter}
        RETURNING id as contact_id, account_id, first_name, last_name,
          email, phone, mobile_phone, job_title, preferred_contact_method,
          address_line1, address_line2, city, state_province, postal_code, country,
          notes, is_active, created_at, updated_at, created_by, modified_by
      `;

      const result = await this.pool.query(query, values);

      if (result.rows.length === 0) {
        return null;
      }

      logger.info(`Contact updated: ${contactId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating contact:', error);
      throw new Error('Failed to update contact');
    }
  }

  /**
   * Soft delete contact
   */
  async deleteContact(contactId: string, userId: string): Promise<boolean> {
    try {
      const result = await this.pool.query(
        `UPDATE contacts 
         SET is_active = false, modified_by = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id`,
        [userId, contactId]
      );

      if (result.rows.length === 0) {
        return false;
      }

      logger.info(`Contact soft deleted: ${contactId}`);
      return true;
    } catch (error) {
      logger.error('Error deleting contact:', error);
      throw new Error('Failed to delete contact');
    }
  }
}
