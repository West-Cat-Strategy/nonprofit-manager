"use strict";
/**
 * Volunteer Service
 * Handles business logic and database operations for volunteers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VolunteerService = void 0;
const logger_1 = require("../config/logger");
const queryHelpers_1 = require("../utils/queryHelpers");
class VolunteerService {
    constructor(pool) {
        this.pool = pool;
    }
    /**
     * Get all volunteers with filtering and pagination
     */
    async getVolunteers(filters = {}, pagination = {}, scope) {
        try {
            const page = pagination.page || 1;
            const limit = pagination.limit || 20;
            const offset = (page - 1) * limit;
            const sortColumnMap = {
                created_at: 'v.created_at',
                updated_at: 'v.updated_at',
                first_name: 'c.first_name',
                last_name: 'c.last_name',
                email: 'c.email',
                volunteer_status: 'v.volunteer_status',
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
          c.email ILIKE $${paramCounter}
        )`);
                values.push(`%${filters.search}%`);
                paramCounter++;
            }
            if (filters.skills && filters.skills.length > 0) {
                conditions.push(`v.skills && $${paramCounter}::text[]`);
                values.push(filters.skills);
                paramCounter++;
            }
            if (filters.availability_status) {
                conditions.push(`v.volunteer_status = $${paramCounter}`);
                values.push(filters.availability_status);
                paramCounter++;
            }
            if (filters.background_check_status) {
                conditions.push(`v.background_check_status = $${paramCounter}`);
                values.push(filters.background_check_status);
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
                conditions.push(`v.created_by = ANY($${paramCounter}::uuid[])`);
                values.push(scope.createdByUserIds);
                paramCounter++;
            }
            // Filter by volunteer_status instead of is_active (not in schema)
            // Skip is_active filter as it doesn't exist in the schema
            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
            // Get total count
            const countQuery = `
        SELECT COUNT(*) 
        FROM volunteers v
        INNER JOIN contacts c ON v.contact_id = c.id
        ${whereClause}
      `;
            const countResult = await this.pool.query(countQuery, values);
            const total = parseInt(countResult.rows[0].count);
            // Get paginated data with contact info
            const dataQuery = `
        SELECT 
          v.*,
          c.first_name,
          c.last_name,
          c.email,
          c.phone,
          c.mobile_phone
        FROM volunteers v
        INNER JOIN contacts c ON v.contact_id = c.id
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
            logger_1.logger.error('Error getting volunteers:', error);
            throw new Error('Failed to retrieve volunteers');
        }
    }
    /**
     * Get volunteer by ID
     */
    async getVolunteerById(volunteerId, scope) {
        try {
            const conditions = ['v.id = $1'];
            const values = [volunteerId];
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
                conditions.push(`v.created_by = ANY($${paramCounter}::uuid[])`);
                values.push(scope.createdByUserIds);
                paramCounter++;
            }
            const result = await this.pool.query(`SELECT 
          v.*,
          c.first_name,
          c.last_name,
          c.email,
          c.phone,
          c.mobile_phone
         FROM volunteers v
         INNER JOIN contacts c ON v.contact_id = c.id
         WHERE ${conditions.join(' AND ')}`, values);
            return result.rows[0] || null;
        }
        catch (error) {
            logger_1.logger.error('Error getting volunteer by ID:', error);
            throw new Error('Failed to retrieve volunteer');
        }
    }
    /**
     * Create new volunteer
     */
    async createVolunteer(data, userId) {
        try {
            // Verify contact exists
            const contactCheck = await this.pool.query('SELECT id FROM contacts WHERE id = $1', [data.contact_id]);
            if (contactCheck.rows.length === 0) {
                throw new Error('Contact not found');
            }
            const result = await this.pool.query(`INSERT INTO volunteers (
          contact_id, skills, volunteer_status, availability,
          background_check_status, background_check_date,
          emergency_contact_name, emergency_contact_phone,
          created_by, modified_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
        RETURNING *`, [
                data.contact_id,
                data.skills || [],
                data.availability_status || 'active',
                data.availability_notes || null,
                data.background_check_status || null,
                data.background_check_date || null,
                data.emergency_contact_name || null,
                data.emergency_contact_phone || null,
                userId,
            ]);
            logger_1.logger.info(`Volunteer created: ${result.rows[0].id}`);
            return result.rows[0];
        }
        catch (error) {
            logger_1.logger.error('Error creating volunteer:', error);
            throw new Error('Failed to create volunteer');
        }
    }
    /**
     * Update volunteer
     */
    async updateVolunteer(volunteerId, data, userId) {
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
            // Add volunteer_id for WHERE clause
            values.push(volunteerId);
            const query = `
        UPDATE volunteers 
        SET ${fields.join(', ')}
        WHERE id = $${paramCounter}
        RETURNING *
      `;
            const result = await this.pool.query(query, values);
            if (result.rows.length === 0) {
                return null;
            }
            logger_1.logger.info(`Volunteer updated: ${volunteerId}`);
            return result.rows[0];
        }
        catch (error) {
            logger_1.logger.error('Error updating volunteer:', error);
            throw new Error('Failed to update volunteer');
        }
    }
    /**
     * Soft delete volunteer
     */
    async deleteVolunteer(volunteerId, userId) {
        try {
            const result = await this.pool.query(`UPDATE volunteers
         SET volunteer_status = 'inactive', modified_by = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id`, [userId, volunteerId]);
            if (result.rows.length === 0) {
                return false;
            }
            logger_1.logger.info(`Volunteer soft deleted: ${volunteerId}`);
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error deleting volunteer:', error);
            throw new Error('Failed to delete volunteer');
        }
    }
    /**
     * Find volunteers by skills (skill matching algorithm)
     */
    async findVolunteersBySkills(requiredSkills) {
        try {
            // Find volunteers who have ANY of the required skills and are active
            const result = await this.pool.query(`SELECT
          v.*,
          c.first_name,
          c.last_name,
          c.email,
          c.phone,
          cardinality(v.skills & $1::text[]) as matching_skills_count
         FROM volunteers v
         INNER JOIN contacts c ON v.contact_id = c.id
         WHERE v.skills && $1::text[]
           AND v.volunteer_status = 'active'
         ORDER BY matching_skills_count DESC, v.hours_contributed ASC`, [requiredSkills]);
            return result.rows;
        }
        catch (error) {
            logger_1.logger.error('Error finding volunteers by skills:', error);
            throw new Error('Failed to find volunteers by skills');
        }
    }
    /**
     * Get volunteer assignments
     */
    async getVolunteerAssignments(filters = {}) {
        try {
            const conditions = [];
            const values = [];
            let paramCounter = 1;
            if (filters.volunteer_id) {
                conditions.push(`va.volunteer_id = $${paramCounter}`);
                values.push(filters.volunteer_id);
                paramCounter++;
            }
            if (filters.event_id) {
                conditions.push(`va.event_id = $${paramCounter}`);
                values.push(filters.event_id);
                paramCounter++;
            }
            if (filters.task_id) {
                conditions.push(`va.task_id = $${paramCounter}`);
                values.push(filters.task_id);
                paramCounter++;
            }
            if (filters.status) {
                conditions.push(`va.status = $${paramCounter}`);
                values.push(filters.status);
                paramCounter++;
            }
            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
            const result = await this.pool.query(`SELECT 
          va.*,
          c.first_name || ' ' || c.last_name as volunteer_name,
          e.name as event_name,
          t.subject as task_name
         FROM volunteer_assignments va
         INNER JOIN volunteers v ON va.volunteer_id = v.id
         INNER JOIN contacts c ON v.contact_id = c.id
         LEFT JOIN events e ON va.event_id = e.id
         LEFT JOIN tasks t ON va.task_id = t.id
         ${whereClause}
         ORDER BY va.start_time DESC`, values);
            return result.rows;
        }
        catch (error) {
            logger_1.logger.error('Error getting volunteer assignments:', error);
            throw new Error('Failed to retrieve volunteer assignments');
        }
    }
    /**
     * Create volunteer assignment
     */
    async createAssignment(data, userId) {
        try {
            const result = await this.pool.query(`INSERT INTO volunteer_assignments (
          volunteer_id, event_id, task_id, assignment_type, role,
          start_time, end_time, notes, created_by, modified_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
        RETURNING *`, [
                data.volunteer_id,
                data.event_id || null,
                data.task_id || null,
                data.assignment_type,
                data.role || null,
                data.start_time,
                data.end_time || null,
                data.notes || null,
                userId,
            ]);
            logger_1.logger.info(`Volunteer assignment created: ${result.rows[0].assignment_id}`);
            return result.rows[0];
        }
        catch (error) {
            logger_1.logger.error('Error creating assignment:', error);
            throw new Error('Failed to create assignment');
        }
    }
    /**
     * Update assignment (including logging hours)
     */
    async updateAssignment(assignmentId, data, userId) {
        try {
            const fields = [];
            const values = [];
            let paramCounter = 1;
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
            fields.push(`modified_by = $${paramCounter}`);
            values.push(userId);
            paramCounter++;
            fields.push(`updated_at = CURRENT_TIMESTAMP`);
            values.push(assignmentId);
            const query = `
        UPDATE volunteer_assignments 
        SET ${fields.join(', ')}
        WHERE assignment_id = $${paramCounter}
        RETURNING *
      `;
            const result = await this.pool.query(query, values);
            if (result.rows.length === 0) {
                return null;
            }
            // If hours were logged, update volunteer's total hours
            if (data.hours_logged !== undefined) {
                await this.pool.query(`UPDATE volunteers
           SET hours_contributed = hours_contributed + $1
           WHERE id = (
             SELECT volunteer_id FROM volunteer_assignments WHERE assignment_id = $2
           )`, [data.hours_logged, assignmentId]);
            }
            logger_1.logger.info(`Assignment updated: ${assignmentId}`);
            return result.rows[0];
        }
        catch (error) {
            logger_1.logger.error('Error updating assignment:', error);
            throw new Error('Failed to update assignment');
        }
    }
}
exports.VolunteerService = VolunteerService;
//# sourceMappingURL=volunteerService.js.map