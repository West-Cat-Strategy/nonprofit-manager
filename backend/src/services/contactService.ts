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
} from '@app-types/contact';
import { logger } from '@config/logger';
import { resolveSort } from '@utils/queryHelpers';
import type { DataScopeFilter } from '@app-types/dataScope';

type QueryValue = string | number | boolean | null | string[];

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
    pagination: PaginationParams = {},
    scope?: DataScopeFilter
  ): Promise<PaginatedContacts> {
    try {
      const page = pagination.page || 1;
      const limit = pagination.limit || 20;
      const offset = (page - 1) * limit;
      const sortColumnMap: Record<string, string> = {
        created_at: 'c.created_at',
        updated_at: 'c.updated_at',
        first_name: 'c.first_name',
        last_name: 'c.last_name',
        email: 'c.email',
        account_name: 'a.account_name',
      };
      const { sortColumn, sortOrder } = resolveSort(
        pagination.sort_by,
        pagination.sort_order,
        sortColumnMap,
        'created_at'
      );

      // Build WHERE clause
      const conditions: string[] = [];
      const values: QueryValue[] = [];
      let paramCounter = 1;

      if (filters.search) {
        conditions.push(`(
          c.first_name ILIKE $${paramCounter} OR
          c.preferred_name ILIKE $${paramCounter} OR
          c.last_name ILIKE $${paramCounter} OR
          c.email ILIKE $${paramCounter} OR
          c.phone ILIKE $${paramCounter} OR
          c.mobile_phone ILIKE $${paramCounter} OR
          CONCAT(c.first_name, ' ', c.last_name) ILIKE $${paramCounter} OR
          CONCAT(COALESCE(c.preferred_name, ''), ' ', c.last_name) ILIKE $${paramCounter}
        )`);
        values.push(`%${filters.search}%`);
        paramCounter++;
      }

      if (filters.role) {
        const roleNames =
          filters.role === 'staff'
            ? ['Staff', 'Executive Director']
            : filters.role === 'volunteer'
              ? ['Volunteer']
              : ['Board Member'];

        conditions.push(`EXISTS (
          SELECT 1
          FROM contact_role_assignments cra
          INNER JOIN contact_roles cr ON cr.id = cra.role_id
          WHERE cra.contact_id = c.id
            AND cr.name = ANY($${paramCounter}::text[])
        )`);
        values.push(roleNames);
        paramCounter++;
      }

      if (filters.account_id) {
        conditions.push(`c.account_id = $${paramCounter}`);
        values.push(filters.account_id);
        paramCounter++;
      }

      if (filters.is_active !== undefined) {
        conditions.push(`c.is_active = $${paramCounter}`);
        values.push(filters.is_active);
        paramCounter++;
      }

      if (filters.tags && filters.tags.length > 0) {
        conditions.push(`c.tags && $${paramCounter}::text[]`);
        values.push(filters.tags);
        paramCounter++;
      }

      if (scope?.accountIds && scope.accountIds.length > 0) {
        conditions.push(`c.account_id = ANY($${paramCounter}::uuid[])`);
        values.push(scope.accountIds);
        paramCounter++;
      }

      if (scope?.contactIds && scope.contactIds.length > 0) {
        conditions.push(`c.id = ANY($${paramCounter}::uuid[])`);
        values.push(scope.contactIds);
        paramCounter++;
      }

      if (scope?.createdByUserIds && scope.createdByUserIds.length > 0) {
        conditions.push(`c.created_by = ANY($${paramCounter}::uuid[])`);
        values.push(scope.createdByUserIds);
        paramCounter++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM contacts c ${whereClause}`;
      const countResult = await this.pool.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      // Get paginated data with account info and aggregated counts
      // Using LEFT JOINs with GROUP BY instead of correlated subqueries for better performance
      const dataQuery = `
        SELECT
          c.id as contact_id,
          c.account_id,
          c.first_name,
          c.preferred_name,
          c.last_name,
          c.middle_name,
          c.salutation,
          c.suffix,
          c.birth_date,
          c.gender,
          c.pronouns,
          c.email,
          c.phone,
          c.mobile_phone,
          c.job_title,
          c.department,
          c.preferred_contact_method,
          c.do_not_email,
          c.do_not_phone,
          c.do_not_text,
          c.do_not_voicemail,
          c.address_line1,
          c.address_line2,
          c.city,
          c.state_province,
          c.postal_code,
          c.country,
          c.no_fixed_address,
          c.notes,
          c.tags,
          c.is_active,
          c.created_at,
          c.updated_at,
          a.account_name,
          COALESCE(phone_counts.cnt, 0) as phone_count,
          COALESCE(email_counts.cnt, 0) as email_count,
          COALESCE(rel_counts.cnt, 0) as relationship_count,
          COALESCE(note_counts.cnt, 0) as note_count,
          COALESCE(
            (SELECT ARRAY_AGG(cr.name) FROM contact_role_assignments cra
             JOIN contact_roles cr ON cr.id = cra.role_id
             WHERE cra.contact_id = c.id),
            ARRAY[]::text[]
          ) as roles
        FROM contacts c
        LEFT JOIN accounts a ON c.account_id = a.id
        LEFT JOIN (
          SELECT contact_id, COUNT(*) as cnt FROM contact_phone_numbers GROUP BY contact_id
        ) phone_counts ON phone_counts.contact_id = c.id
        LEFT JOIN (
          SELECT contact_id, COUNT(*) as cnt FROM contact_email_addresses GROUP BY contact_id
        ) email_counts ON email_counts.contact_id = c.id
        LEFT JOIN (
          SELECT contact_id, COUNT(*) as cnt FROM contact_relationships WHERE is_active = true GROUP BY contact_id
        ) rel_counts ON rel_counts.contact_id = c.id
        LEFT JOIN (
          SELECT contact_id, COUNT(*) as cnt FROM contact_notes GROUP BY contact_id
        ) note_counts ON note_counts.contact_id = c.id
        ${whereClause}
        ORDER BY ${sortColumn} ${sortOrder}
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
      throw Object.assign(new Error('Failed to retrieve contacts'), { cause: error });
    }
  }

  /**
   * Get distinct tags applied to contacts
   */
  async getContactTags(scope?: DataScopeFilter): Promise<string[]> {
    try {
      const conditions: string[] = [];
      const values: QueryValue[] = [];
      let paramCounter = 1;

      if (scope?.accountIds && scope.accountIds.length > 0) {
        conditions.push(`c.account_id = ANY($${paramCounter}::uuid[])`);
        values.push(scope.accountIds);
        paramCounter++;
      }

      if (scope?.contactIds && scope.contactIds.length > 0) {
        conditions.push(`c.id = ANY($${paramCounter}::uuid[])`);
        values.push(scope.contactIds);
        paramCounter++;
      }

      if (scope?.createdByUserIds && scope.createdByUserIds.length > 0) {
        conditions.push(`c.created_by = ANY($${paramCounter}::uuid[])`);
        values.push(scope.createdByUserIds);
        paramCounter++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const result = await this.pool.query(
        `
          SELECT DISTINCT UNNEST(COALESCE(c.tags, ARRAY[]::text[])) AS tag
          FROM contacts c
          ${whereClause}
          ORDER BY tag ASC
        `,
        values
      );

      return result.rows.map((row) => row.tag).filter((tag) => Boolean(tag));
    } catch (error) {
      logger.error('Error getting contact tags:', error);
      throw Object.assign(new Error('Failed to retrieve contact tags'), { cause: error });
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
          c.preferred_name,
          c.last_name,
          c.middle_name,
          c.salutation,
          c.suffix,
          c.birth_date,
          c.gender,
          c.pronouns,
          c.email,
          c.phone,
          c.mobile_phone,
          c.job_title,
          c.department,
          c.preferred_contact_method,
          c.do_not_email,
          c.do_not_phone,
          c.do_not_text,
          c.do_not_voicemail,
          c.address_line1,
          c.address_line2,
          c.city,
          c.state_province,
          c.postal_code,
          c.country,
          c.no_fixed_address,
          c.notes,
          c.tags,
          c.is_active,
          c.created_at,
          c.updated_at,
          a.account_name,
          (SELECT COUNT(*) FROM contact_phone_numbers WHERE contact_id = c.id) as phone_count,
          (SELECT COUNT(*) FROM contact_email_addresses WHERE contact_id = c.id) as email_count,
          (SELECT COUNT(*) FROM contact_relationships WHERE contact_id = c.id AND is_active = true) as relationship_count,
          (SELECT COUNT(*) FROM contact_notes WHERE contact_id = c.id) as note_count,
          COALESCE(
            (SELECT ARRAY_AGG(cr.name) FROM contact_role_assignments cra
             JOIN contact_roles cr ON cr.id = cra.role_id
             WHERE cra.contact_id = c.id),
            ARRAY[]::text[]
          ) as roles
         FROM contacts c
         LEFT JOIN accounts a ON c.account_id = a.id
         WHERE c.id = $1`,
        [contactId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting contact by ID:', error);
      throw Object.assign(new Error('Failed to retrieve contact'), { cause: error });
    }
  }

  async getContactByIdWithScope(
    contactId: string,
    scope?: DataScopeFilter
  ): Promise<Contact | null> {
    try {
      const conditions = ['c.id = $1'];
      const values: QueryValue[] = [contactId];
      let paramCounter = 2;

      if (scope?.accountIds && scope.accountIds.length > 0) {
        conditions.push(`c.account_id = ANY($${paramCounter}::uuid[])`);
        values.push(scope.accountIds);
        paramCounter++;
      }

      if (scope?.contactIds && scope.contactIds.length > 0) {
        conditions.push(`c.id = ANY($${paramCounter}::uuid[])`);
        values.push(scope.contactIds);
        paramCounter++;
      }

      if (scope?.createdByUserIds && scope.createdByUserIds.length > 0) {
        conditions.push(`c.created_by = ANY($${paramCounter}::uuid[])`);
        values.push(scope.createdByUserIds);
        paramCounter++;
      }

      const result = await this.pool.query(
        `SELECT
          c.id as contact_id,
          c.account_id,
          c.first_name,
          c.preferred_name,
          c.last_name,
          c.middle_name,
          c.salutation,
          c.suffix,
          c.birth_date,
          c.gender,
          c.pronouns,
          c.email,
          c.phone,
          c.mobile_phone,
          c.job_title,
          c.department,
          c.preferred_contact_method,
          c.do_not_email,
          c.do_not_phone,
          c.do_not_text,
          c.do_not_voicemail,
          c.address_line1,
          c.address_line2,
          c.city,
          c.state_province,
          c.postal_code,
          c.country,
          c.no_fixed_address,
          c.notes,
          c.tags,
          c.is_active,
          c.created_at,
          c.updated_at,
          a.account_name,
          (SELECT COUNT(*) FROM contact_phone_numbers WHERE contact_id = c.id) as phone_count,
          (SELECT COUNT(*) FROM contact_email_addresses WHERE contact_id = c.id) as email_count,
          (SELECT COUNT(*) FROM contact_relationships WHERE contact_id = c.id AND is_active = true) as relationship_count,
          (SELECT COUNT(*) FROM contact_notes WHERE contact_id = c.id) as note_count,
          COALESCE(
            (SELECT ARRAY_AGG(cr.name) FROM contact_role_assignments cra
             JOIN contact_roles cr ON cr.id = cra.role_id
             WHERE cra.contact_id = c.id),
            ARRAY[]::text[]
          ) as roles
         FROM contacts c
         LEFT JOIN accounts a ON c.account_id = a.id
         WHERE ${conditions.join(' AND ')}`,
        values
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting contact by ID with scope:', error);
      throw Object.assign(new Error('Failed to retrieve contact'), { cause: error });
    }
  }

  /**
   * Create new contact
   */
  async createContact(data: CreateContactDTO, userId: string): Promise<Contact> {
    try {
      const result = await this.pool.query(
        `INSERT INTO contacts (
          account_id, first_name, preferred_name, last_name, middle_name, salutation, suffix,
          birth_date, gender, pronouns,
          email, phone, mobile_phone,
          address_line1, address_line2, city, state_province, postal_code, country,
          no_fixed_address,
          job_title, department, preferred_contact_method, do_not_email, do_not_phone, do_not_text, do_not_voicemail, notes,
          tags,
          created_by, modified_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $30)
        RETURNING id as contact_id, account_id, first_name, preferred_name, last_name, middle_name, salutation, suffix,
          birth_date, gender, pronouns,
          email, phone, mobile_phone,
          address_line1, address_line2, city, state_province, postal_code, country,
          no_fixed_address,
          job_title, department, preferred_contact_method, do_not_email, do_not_phone, do_not_text, do_not_voicemail, notes,
          tags,
          is_active, created_at, updated_at, created_by, modified_by`,
        [
          data.account_id || null,
          data.first_name,
          data.preferred_name || null,
          data.last_name,
          data.middle_name || null,
          data.salutation || null,
          data.suffix || null,
          data.birth_date || null,
          data.gender || null,
          data.pronouns || null,
          data.email || null,
          data.phone || null,
          data.mobile_phone || null,
          data.address_line1 || null,
          data.address_line2 || null,
          data.city || null,
          data.state_province || null,
          data.postal_code || null,
          data.country || null,
          data.no_fixed_address || false,
          data.job_title || null,
          data.department || null,
          data.preferred_contact_method || null,
          data.do_not_email || false,
          data.do_not_phone || false,
          data.do_not_text || false,
          data.do_not_voicemail || false,
          data.notes || null,
          data.tags || [],
          userId,
        ]
      );

      logger.info(`Contact created: ${result.rows[0].contact_id}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating contact:', error);
      throw Object.assign(new Error('Failed to create contact'), { cause: error });
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
        RETURNING id as contact_id, account_id, first_name, preferred_name, last_name, middle_name, salutation, suffix,
          birth_date, gender, pronouns,
          email, phone, mobile_phone, job_title, department, preferred_contact_method,
          do_not_email, do_not_phone, do_not_text, do_not_voicemail,
          address_line1, address_line2, city, state_province, postal_code, country,
          no_fixed_address,
          notes, tags, is_active, created_at, updated_at, created_by, modified_by
      `;

      const result = await this.pool.query(query, values);

      if (result.rows.length === 0) {
        return null;
      }

      logger.info(`Contact updated: ${contactId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating contact:', error);
      throw Object.assign(new Error('Failed to update contact'), { cause: error });
    }
  }

  /**
   * Bulk update contacts (tags and/or active status)
   */
  async bulkUpdateContacts(
    contactIds: string[],
    options: {
      is_active?: boolean;
      tags?: { add?: string[]; remove?: string[]; replace?: string[] };
    },
    userId: string
  ): Promise<number> {
    try {
      if (contactIds.length === 0) {
        return 0;
      }

      const fields: string[] = [];
      const values: QueryValue[] = [];
      let paramCounter = 1;

      if (options.is_active !== undefined) {
        fields.push(`is_active = $${paramCounter}`);
        values.push(options.is_active);
        paramCounter++;
      }

      if (options.tags?.replace) {
        fields.push(`tags = $${paramCounter}::text[]`);
        values.push(options.tags.replace);
        paramCounter++;
      } else if (options.tags?.add || options.tags?.remove) {
        const addTags = options.tags?.add ?? [];
        const removeTags = options.tags?.remove ?? [];
        const addParam = paramCounter++;
        const removeParam = paramCounter++;
        values.push(addTags, removeTags);
        fields.push(`tags = (
          SELECT ARRAY(
            SELECT DISTINCT t
            FROM UNNEST(COALESCE(c.tags, ARRAY[]::text[]) || $${addParam}::text[]) t
            WHERE NOT (t = ANY($${removeParam}::text[]))
          )
        )`);
      }

      if (fields.length === 0) {
        return 0;
      }

      fields.push(`modified_by = $${paramCounter}`);
      values.push(userId);
      paramCounter++;
      fields.push('updated_at = CURRENT_TIMESTAMP');

      values.push(contactIds);
      const query = `
        UPDATE contacts c
        SET ${fields.join(', ')}
        WHERE c.id = ANY($${paramCounter}::uuid[])
      `;

      const result = await this.pool.query(query, values);
      return result.rowCount || 0;
    } catch (error) {
      logger.error('Error bulk updating contacts:', error);
      throw Object.assign(new Error('Failed to bulk update contacts'), { cause: error });
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
      throw Object.assign(new Error('Failed to delete contact'), { cause: error });
    }
  }
}
