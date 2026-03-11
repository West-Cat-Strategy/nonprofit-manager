/**
 * Volunteer Service
 * Handles business logic and database operations for volunteers
 */

import { Pool } from 'pg';
import {
  Volunteer,
  CreateVolunteerDTO,
  UpdateVolunteerDTO,
  VolunteerFilters,
  PaginationParams,
  PaginatedVolunteers,
  VolunteerAssignment,
  CreateAssignmentDTO,
  UpdateAssignmentDTO,
  AssignmentFilters,
  AvailabilityStatus,
  BackgroundCheckStatus,
} from '@app-types/volunteer';
import { logger } from '@config/logger';
import { resolveSort } from '@utils/queryHelpers';
import type { DataScopeFilter } from '@app-types/dataScope';

type QueryValue = string | number | boolean | string[] | Date | null;
type DatabaseRow = Record<string, unknown>;

const normalizedAvailabilitySql = `
  COALESCE(
    NULLIF(v.availability_status, ''),
    CASE
      WHEN v.volunteer_status IN ('available', 'unavailable', 'limited') THEN v.volunteer_status
      WHEN v.volunteer_status IN ('inactive', 'retired', 'on_leave') THEN 'unavailable'
      ELSE 'available'
    END
  )
`;

const normalizedIsActiveSql = `
  COALESCE(
    v.is_active,
    CASE
      WHEN v.volunteer_status IN ('inactive', 'retired') THEN FALSE
      ELSE TRUE
    END
  )
`;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const parseNumericValue = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const normalizeBackgroundCheckStatus = (value: unknown): Volunteer['background_check_status'] => {
  switch (value) {
    case BackgroundCheckStatus.PENDING:
    case BackgroundCheckStatus.IN_PROGRESS:
    case BackgroundCheckStatus.APPROVED:
    case BackgroundCheckStatus.REJECTED:
    case BackgroundCheckStatus.EXPIRED:
      return value;
    case 'not_started':
    case null:
    case undefined:
    case '':
      return BackgroundCheckStatus.NOT_REQUIRED;
    default:
      return BackgroundCheckStatus.NOT_REQUIRED;
  }
};

const normalizeAvailabilityStatus = (
  availabilityStatus: unknown,
  volunteerStatus: unknown
): Volunteer['availability_status'] => {
  switch (availabilityStatus) {
    case AvailabilityStatus.AVAILABLE:
    case AvailabilityStatus.UNAVAILABLE:
    case AvailabilityStatus.LIMITED:
      return availabilityStatus;
    default:
      break;
  }

  switch (volunteerStatus) {
    case AvailabilityStatus.AVAILABLE:
    case AvailabilityStatus.UNAVAILABLE:
    case AvailabilityStatus.LIMITED:
      return volunteerStatus;
    case 'inactive':
    case 'retired':
    case 'on_leave':
      return AvailabilityStatus.UNAVAILABLE;
    default:
      return AvailabilityStatus.AVAILABLE;
  }
};

const normalizeIsActive = (isActive: unknown, volunteerStatus: unknown): boolean => {
  if (typeof isActive === 'boolean') {
    return isActive;
  }

  return !['inactive', 'retired'].includes(String(volunteerStatus || '').toLowerCase());
};

const normalizeVolunteerRow = (row: DatabaseRow): Volunteer => {
  const normalizedRow = { ...row };
  const volunteerId = isNonEmptyString(row.volunteer_id)
    ? row.volunteer_id
    : isNonEmptyString(row.id)
      ? row.id
      : '';

  const availabilityStatus = normalizeAvailabilityStatus(
    row.availability_status,
    row.volunteer_status
  );
  const backgroundCheckStatus = normalizeBackgroundCheckStatus(row.background_check_status);
  const totalHoursLogged =
    parseNumericValue(row.total_hours_logged) ??
    parseNumericValue(row.hours_contributed) ??
    0;
  const maxHoursPerWeek = parseNumericValue(row.max_hours_per_week);

  return {
    ...normalizedRow,
    volunteer_id: volunteerId,
    contact_id: String(row.contact_id || ''),
    skills: Array.isArray(row.skills) ? (row.skills as string[]) : [],
    availability_status: availabilityStatus,
    availability_notes: isNonEmptyString(row.availability_notes)
      ? row.availability_notes
      : isNonEmptyString(row.availability)
        ? row.availability
        : null,
    background_check_status: backgroundCheckStatus,
    background_check_date: (row.background_check_date as Volunteer['background_check_date']) ?? null,
    background_check_expiry:
      (row.background_check_expiry as Volunteer['background_check_expiry']) ?? null,
    preferred_roles: Array.isArray(row.preferred_roles)
      ? (row.preferred_roles as string[])
      : null,
    max_hours_per_week: maxHoursPerWeek,
    emergency_contact_name:
      (row.emergency_contact_name as Volunteer['emergency_contact_name']) ?? null,
    emergency_contact_phone:
      (row.emergency_contact_phone as Volunteer['emergency_contact_phone']) ?? null,
    emergency_contact_relationship:
      (row.emergency_contact_relationship as Volunteer['emergency_contact_relationship']) ?? null,
    volunteer_since:
      (row.volunteer_since as Volunteer['volunteer_since']) ||
      (row.created_at as Volunteer['volunteer_since']) ||
      new Date(),
    total_hours_logged: totalHoursLogged,
    is_active: normalizeIsActive(row.is_active, row.volunteer_status),
    created_at: (row.created_at as Volunteer['created_at']) ?? new Date(),
    updated_at: (row.updated_at as Volunteer['updated_at']) ?? new Date(),
    created_by: String(row.created_by || ''),
    modified_by: String(row.modified_by || ''),
  };
};

const normalizeAssignmentRow = (row: DatabaseRow): VolunteerAssignment => ({
  ...row,
  assignment_id: String(row.assignment_id || ''),
  volunteer_id: String(row.volunteer_id || ''),
  event_id: isNonEmptyString(row.event_id) ? row.event_id : null,
  task_id: isNonEmptyString(row.task_id) ? row.task_id : null,
  assignment_type:
    row.assignment_type === 'event' || row.assignment_type === 'task'
      ? row.assignment_type
      : 'general',
  role: isNonEmptyString(row.role) ? row.role : null,
  start_time: (row.start_time as VolunteerAssignment['start_time']) ?? new Date(),
  end_time: (row.end_time as VolunteerAssignment['end_time']) ?? null,
  hours_logged: parseNumericValue(row.hours_logged) ?? 0,
  status:
    row.status === 'in_progress' ||
    row.status === 'completed' ||
    row.status === 'cancelled'
      ? row.status
      : 'scheduled',
  notes: isNonEmptyString(row.notes) ? row.notes : null,
  created_at: (row.created_at as VolunteerAssignment['created_at']) ?? new Date(),
  updated_at: (row.updated_at as VolunteerAssignment['updated_at']) ?? new Date(),
  created_by: String(row.created_by || ''),
  modified_by: String(row.modified_by || ''),
  volunteer_name: isNonEmptyString(row.volunteer_name) ? row.volunteer_name : undefined,
  event_name: isNonEmptyString(row.event_name) ? row.event_name : undefined,
  task_name: isNonEmptyString(row.task_name) ? row.task_name : undefined,
});

export class VolunteerService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Get all volunteers with filtering and pagination
   */
  async getVolunteers(
    filters: VolunteerFilters = {},
    pagination: PaginationParams = {},
    scope?: DataScopeFilter
  ): Promise<PaginatedVolunteers> {
    try {
      const page = pagination.page || 1;
      const limit = pagination.limit || 20;
      const offset = (page - 1) * limit;
      const sortColumnMap: Record<string, string> = {
        created_at: 'v.created_at',
        updated_at: 'v.updated_at',
        first_name: 'c.first_name',
        last_name: 'c.last_name',
        email: 'c.email',
        volunteer_status: 'v.volunteer_status',
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
        conditions.push(`${normalizedAvailabilitySql} = $${paramCounter}`);
        values.push(filters.availability_status);
        paramCounter++;
      }

      if (filters.background_check_status) {
        conditions.push(`v.background_check_status = $${paramCounter}`);
        values.push(filters.background_check_status);
        paramCounter++;
      }

      if (filters.is_active !== undefined) {
        conditions.push(`${normalizedIsActiveSql} = $${paramCounter}`);
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
        conditions.push(`v.created_by = ANY($${paramCounter}::uuid[])`);
        values.push(scope.createdByUserIds);
        paramCounter++;
      }

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
        data: dataResult.rows.map((row) => normalizeVolunteerRow(row as DatabaseRow)),
        pagination: {
          total,
          page,
          limit,
          total_pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting volunteers:', error);
      throw Object.assign(new Error('Failed to retrieve volunteers'), { cause: error });
    }
  }

  /**
   * Get volunteer by ID
   */
  async getVolunteerById(
    volunteerId: string,
    scope?: DataScopeFilter
  ): Promise<Volunteer | null> {
    try {
      const conditions: string[] = ['v.id = $1'];
      const values: QueryValue[] = [volunteerId];
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

      const result = await this.pool.query(
        `SELECT 
          v.*,
          c.first_name,
          c.last_name,
          c.email,
          c.phone,
          c.mobile_phone
         FROM volunteers v
         INNER JOIN contacts c ON v.contact_id = c.id
         WHERE ${conditions.join(' AND ')}`,
        values
      );

      return result.rows[0] ? normalizeVolunteerRow(result.rows[0] as DatabaseRow) : null;
    } catch (error) {
      logger.error('Error getting volunteer by ID:', error);
      throw Object.assign(new Error('Failed to retrieve volunteer'), { cause: error });
    }
  }

  /**
   * Create new volunteer
   */
  async createVolunteer(data: CreateVolunteerDTO, userId: string): Promise<Volunteer> {
    try {
      // Verify contact exists
      const contactCheck = await this.pool.query(
        'SELECT id FROM contacts WHERE id = $1',
        [data.contact_id]
      );

      if (contactCheck.rows.length === 0) {
        throw new Error('Contact not found');
      }

      const result = await this.pool.query(
        `INSERT INTO volunteers (
          contact_id, skills, volunteer_status, availability,
          availability_status, availability_notes,
          background_check_status, background_check_date, background_check_expiry,
          preferred_roles, max_hours_per_week,
          emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
          is_active, created_by, modified_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $16
        )
        RETURNING *`,
        [
          data.contact_id,
          data.skills || [],
          'active',
          data.availability_notes || null,
          data.availability_status || AvailabilityStatus.AVAILABLE,
          data.availability_notes || null,
          normalizeBackgroundCheckStatus(data.background_check_status),
          data.background_check_date || null,
          data.background_check_expiry || null,
          data.preferred_roles || null,
          data.max_hours_per_week || null,
          data.emergency_contact_name || null,
          data.emergency_contact_phone || null,
          data.emergency_contact_relationship || null,
          true,
          userId,
        ]
      );

      logger.info(`Volunteer created: ${result.rows[0].id}`);
      return normalizeVolunteerRow(result.rows[0] as DatabaseRow);
    } catch (error) {
      logger.error('Error creating volunteer:', error);
      throw Object.assign(new Error('Failed to create volunteer'), { cause: error });
    }
  }

  /**
   * Update volunteer
   */
  async updateVolunteer(
    volunteerId: string,
    data: UpdateVolunteerDTO,
    userId: string
  ): Promise<Volunteer | null> {
    try {
      const fields: string[] = [];
      const values: QueryValue[] = [];
      let paramCounter = 1;
      const updatePayload: Record<string, QueryValue> = {};

      if (data.skills !== undefined) {
        updatePayload.skills = data.skills;
      }
      if (data.availability_status !== undefined) {
        updatePayload.availability_status = data.availability_status;
      }
      if (data.availability_notes !== undefined) {
        updatePayload.availability_notes = data.availability_notes || null;
        updatePayload.availability = data.availability_notes || null;
      }
      if (data.background_check_status !== undefined) {
        updatePayload.background_check_status = normalizeBackgroundCheckStatus(
          data.background_check_status
        );
      }
      if (data.background_check_date !== undefined) {
        updatePayload.background_check_date = data.background_check_date;
      }
      if (data.background_check_expiry !== undefined) {
        updatePayload.background_check_expiry = data.background_check_expiry;
      }
      if (data.preferred_roles !== undefined) {
        updatePayload.preferred_roles = data.preferred_roles;
      }
      if (data.max_hours_per_week !== undefined) {
        updatePayload.max_hours_per_week = data.max_hours_per_week;
      }
      if (data.emergency_contact_name !== undefined) {
        updatePayload.emergency_contact_name = data.emergency_contact_name || null;
      }
      if (data.emergency_contact_phone !== undefined) {
        updatePayload.emergency_contact_phone = data.emergency_contact_phone || null;
      }
      if (data.emergency_contact_relationship !== undefined) {
        updatePayload.emergency_contact_relationship = data.emergency_contact_relationship || null;
      }
      if (data.is_active !== undefined) {
        updatePayload.is_active = data.is_active;
        updatePayload.volunteer_status = data.is_active ? 'active' : 'inactive';
      }

      // Build dynamic update query
      Object.entries(updatePayload).forEach(([key, value]) => {
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

      logger.info(`Volunteer updated: ${volunteerId}`);
      return normalizeVolunteerRow(result.rows[0] as DatabaseRow);
    } catch (error) {
      logger.error('Error updating volunteer:', error);
      throw Object.assign(new Error('Failed to update volunteer'), { cause: error });
    }
  }

  /**
   * Soft delete volunteer
   */
  async deleteVolunteer(volunteerId: string, userId: string): Promise<boolean> {
    try {
      const result = await this.pool.query(
        `UPDATE volunteers
         SET volunteer_status = 'inactive', is_active = FALSE, modified_by = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id`,
        [userId, volunteerId]
      );

      if (result.rows.length === 0) {
        return false;
      }

      logger.info(`Volunteer soft deleted: ${volunteerId}`);
      return true;
    } catch (error) {
      logger.error('Error deleting volunteer:', error);
      throw Object.assign(new Error('Failed to delete volunteer'), { cause: error });
    }
  }

  /**
   * Find volunteers by skills (skill matching algorithm)
   */
  async findVolunteersBySkills(requiredSkills: string[]): Promise<Volunteer[]> {
    try {
      // Find volunteers who have ANY of the required skills and are active
      const result = await this.pool.query(
        `SELECT
          v.*,
          c.first_name,
          c.last_name,
          c.email,
          c.phone,
          cardinality(v.skills & $1::text[]) as matching_skills_count
         FROM volunteers v
         INNER JOIN contacts c ON v.contact_id = c.id
         WHERE v.skills && $1::text[]
           AND ${normalizedIsActiveSql} = TRUE
         ORDER BY matching_skills_count DESC, v.hours_contributed ASC`,
        [requiredSkills]
      );

      return result.rows.map((row) => normalizeVolunteerRow(row as DatabaseRow));
    } catch (error) {
      logger.error('Error finding volunteers by skills:', error);
      throw Object.assign(new Error('Failed to find volunteers by skills'), { cause: error });
    }
  }

  /**
   * Get volunteer assignments
   */
  async getVolunteerAssignments(filters: AssignmentFilters = {}): Promise<VolunteerAssignment[]> {
    try {
      const conditions: string[] = [];
      const values: QueryValue[] = [];
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

      const result = await this.pool.query(
        `SELECT 
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
         ORDER BY va.start_time DESC`,
        values
      );

      return result.rows.map((row) => normalizeAssignmentRow(row as DatabaseRow));
    } catch (error) {
      logger.error('Error getting volunteer assignments:', error);
      throw Object.assign(new Error('Failed to retrieve volunteer assignments'), { cause: error });
    }
  }

  /**
   * Create volunteer assignment
   */
  async createAssignment(data: CreateAssignmentDTO, userId: string): Promise<VolunteerAssignment> {
    try {
      const result = await this.pool.query(
        `INSERT INTO volunteer_assignments (
          volunteer_id, event_id, task_id, assignment_type, role,
          start_time, end_time, notes, created_by, modified_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
        RETURNING *`,
        [
          data.volunteer_id,
          data.event_id || null,
          data.task_id || null,
          data.assignment_type,
          data.role || null,
          data.start_time,
          data.end_time || null,
          data.notes || null,
          userId,
        ]
      );

      logger.info(`Volunteer assignment created: ${result.rows[0].assignment_id}`);
      return normalizeAssignmentRow(result.rows[0] as DatabaseRow);
    } catch (error) {
      logger.error('Error creating assignment:', error);
      throw Object.assign(new Error('Failed to create assignment'), { cause: error });
    }
  }

  /**
   * Update assignment (including logging hours)
   */
  async updateAssignment(
    assignmentId: string,
    data: UpdateAssignmentDTO,
    userId: string
  ): Promise<VolunteerAssignment | null> {
    try {
      const existingResult = await this.pool.query(
        `SELECT volunteer_id, COALESCE(hours_logged, 0) as hours_logged
         FROM volunteer_assignments
         WHERE assignment_id = $1`,
        [assignmentId]
      );

      if (existingResult.rows.length === 0) {
        return null;
      }

      const fields: string[] = [];
      const values: QueryValue[] = [];
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
        const previousHours = parseNumericValue(existingResult.rows[0].hours_logged) ?? 0;
        const currentHours = parseNumericValue(result.rows[0].hours_logged) ?? 0;
        const hoursDelta = currentHours - previousHours;

        if (hoursDelta !== 0) {
          await this.pool.query(
            `UPDATE volunteers
             SET hours_contributed = COALESCE(hours_contributed, 0) + $1,
                 total_hours_logged = COALESCE(total_hours_logged, 0) + $1
             WHERE id = $2`,
            [hoursDelta, existingResult.rows[0].volunteer_id]
          );
        }
      }

      logger.info(`Assignment updated: ${assignmentId}`);
      return normalizeAssignmentRow(result.rows[0] as DatabaseRow);
    } catch (error) {
      logger.error('Error updating assignment:', error);
      throw Object.assign(new Error('Failed to update assignment'), { cause: error });
    }
  }
}
