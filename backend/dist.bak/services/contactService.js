"use strict";
/**
 * Contact Service
 * Handles business logic and database operations for contacts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactService = void 0;
const logger_1 = require("../config/logger");
const queryHelpers_1 = require("../utils/queryHelpers");
class ContactService {
    constructor(pool) {
        this.pool = pool;
    }
    /**
     * Get all contacts with filtering and pagination
     */
    async getContacts(filters = {}, pagination = {}, scope) {
        try {
            const page = pagination.page || 1;
            const limit = pagination.limit || 20;
            const offset = (page - 1) * limit;
            const sortColumnMap = {
                created_at: 'c.created_at',
                updated_at: 'c.updated_at',
                first_name: 'c.first_name',
                last_name: 'c.last_name',
                email: 'c.email',
                account_name: 'a.account_name',
            };
            const { sortColumn, sortOrder } = (0, queryHelpers_1.resolveSort)(pagination.sort_by, pagination.sort_order, sortColumnMap, 'created_at');
            // Build WHERE clause
            const conditions = [];
            const values = [];
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
            if (filters.role) {
                const roleNames = filters.role === 'staff'
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
            // Get paginated data with account info
            const dataQuery = `
        SELECT
          c.id as contact_id,
          c.account_id,
          c.first_name,
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
          a.account_name,
          (SELECT COUNT(*) FROM contact_phone_numbers WHERE contact_id = c.id) as phone_count,
          (SELECT COUNT(*) FROM contact_email_addresses WHERE contact_id = c.id) as email_count,
          (SELECT COUNT(*) FROM contact_relationships WHERE contact_id = c.id AND is_active = true) as relationship_count,
          (SELECT COUNT(*) FROM contact_notes WHERE contact_id = c.id) as note_count
        FROM contacts c
        LEFT JOIN accounts a ON c.account_id = a.id
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
        }
        catch (error) {
            logger_1.logger.error('Error getting contacts:', error);
            throw new Error('Failed to retrieve contacts');
        }
    }
    /**
     * Get contact by ID
     */
    async getContactById(contactId) {
        try {
            const result = await this.pool.query(`SELECT
          c.id as contact_id,
          c.account_id,
          c.first_name,
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
          a.account_name,
          (SELECT COUNT(*) FROM contact_phone_numbers WHERE contact_id = c.id) as phone_count,
          (SELECT COUNT(*) FROM contact_email_addresses WHERE contact_id = c.id) as email_count,
          (SELECT COUNT(*) FROM contact_relationships WHERE contact_id = c.id AND is_active = true) as relationship_count,
          (SELECT COUNT(*) FROM contact_notes WHERE contact_id = c.id) as note_count
         FROM contacts c
         LEFT JOIN accounts a ON c.account_id = a.id
         WHERE c.id = $1`, [contactId]);
            return result.rows[0] || null;
        }
        catch (error) {
            logger_1.logger.error('Error getting contact by ID:', error);
            throw new Error('Failed to retrieve contact');
        }
    }
    async getContactByIdWithScope(contactId, scope) {
        try {
            const conditions = ['c.id = $1'];
            const values = [contactId];
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
            const result = await this.pool.query(`SELECT
          c.id as contact_id,
          c.account_id,
          c.first_name,
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
          a.account_name,
          (SELECT COUNT(*) FROM contact_phone_numbers WHERE contact_id = c.id) as phone_count,
          (SELECT COUNT(*) FROM contact_email_addresses WHERE contact_id = c.id) as email_count,
          (SELECT COUNT(*) FROM contact_relationships WHERE contact_id = c.id AND is_active = true) as relationship_count,
          (SELECT COUNT(*) FROM contact_notes WHERE contact_id = c.id) as note_count
         FROM contacts c
         LEFT JOIN accounts a ON c.account_id = a.id
         WHERE ${conditions.join(' AND ')}`, values);
            return result.rows[0] || null;
        }
        catch (error) {
            logger_1.logger.error('Error getting contact by ID with scope:', error);
            throw new Error('Failed to retrieve contact');
        }
    }
    /**
     * Create new contact
     */
    async createContact(data, userId) {
        try {
            const result = await this.pool.query(`INSERT INTO contacts (
          account_id, first_name, last_name, middle_name, salutation, suffix,
          birth_date, gender, pronouns,
          email, phone, mobile_phone,
          address_line1, address_line2, city, state_province, postal_code, country,
          job_title, department, preferred_contact_method, do_not_email, do_not_phone, notes,
          created_by, modified_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $25)
        RETURNING id as contact_id, account_id, first_name, last_name, middle_name, salutation, suffix,
          birth_date, gender, pronouns,
          email, phone, mobile_phone,
          address_line1, address_line2, city, state_province, postal_code, country,
          job_title, department, preferred_contact_method, do_not_email, do_not_phone, notes,
          is_active, created_at, updated_at, created_by, modified_by`, [
                data.account_id || null,
                data.first_name,
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
                data.job_title || null,
                data.department || null,
                data.preferred_contact_method || null,
                data.do_not_email || false,
                data.do_not_phone || false,
                data.notes || null,
                userId,
            ]);
            logger_1.logger.info(`Contact created: ${result.rows[0].contact_id}`);
            return result.rows[0];
        }
        catch (error) {
            logger_1.logger.error('Error creating contact:', error);
            throw new Error('Failed to create contact');
        }
    }
    /**
     * Update contact
     */
    async updateContact(contactId, data, userId) {
        try {
            const fields = [];
            const values = [];
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
        RETURNING id as contact_id, account_id, first_name, last_name, middle_name, salutation, suffix,
          birth_date, gender, pronouns,
          email, phone, mobile_phone, job_title, department, preferred_contact_method,
          do_not_email, do_not_phone,
          address_line1, address_line2, city, state_province, postal_code, country,
          notes, is_active, created_at, updated_at, created_by, modified_by
      `;
            const result = await this.pool.query(query, values);
            if (result.rows.length === 0) {
                return null;
            }
            logger_1.logger.info(`Contact updated: ${contactId}`);
            return result.rows[0];
        }
        catch (error) {
            logger_1.logger.error('Error updating contact:', error);
            throw new Error('Failed to update contact');
        }
    }
    /**
     * Soft delete contact
     */
    async deleteContact(contactId, userId) {
        try {
            const result = await this.pool.query(`UPDATE contacts 
         SET is_active = false, modified_by = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id`, [userId, contactId]);
            if (result.rows.length === 0) {
                return false;
            }
            logger_1.logger.info(`Contact soft deleted: ${contactId}`);
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error deleting contact:', error);
            throw new Error('Failed to delete contact');
        }
    }
}
exports.ContactService = ContactService;
//# sourceMappingURL=contactService.js.map