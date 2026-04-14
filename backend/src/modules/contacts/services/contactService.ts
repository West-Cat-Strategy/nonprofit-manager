import { Pool, PoolClient } from 'pg';
import {
  Contact,
  ContactMergeRequest,
  ContactMergeResult,
  CreateContactDTO,
  UpdateContactDTO,
  ContactFilters,
  ContactLookupItem,
  PaginationParams,
  PaginatedContacts,
} from '@app-types/contact';
import { logger } from '@config/logger';
import { resolveContactRoleNames } from '@modules/contacts/shared/contactRoleFilters';
import { resolveSort } from '@utils/queryHelpers';
import { encrypt } from '@utils/encryption';
import type { DataScopeFilter } from '@app-types/dataScope';
import { syncContactMethodSummaries, syncStructuredContactMethodsFromSummary } from '@services/contactMethodSyncService';
import {
  CONTACT_SEARCH_SQL,
  mapContactRow,
  normalizeDateOnly,
  normalizeNullableText,
  normalizePhn,
  type ContactRecord,
  type QueryValue,
  type ViewerRole,
} from '@services/contactServiceHelpers';
import { buildContactBulkUpdateQuery, type ContactBulkUpdateOptions } from '../shared/contactBulkUpdate';
import { ContactMergeService } from './contactMergeService';

export class ContactService {
  private pool: Pool;
  private readonly contactMergeService: ContactMergeService;

  constructor(pool: Pool) {
    this.pool = pool;
    this.contactMergeService = new ContactMergeService(pool);
  }

  async getContacts(
    filters: ContactFilters = {},
    pagination: PaginationParams = {},
    scope?: DataScopeFilter,
    viewerRole?: ViewerRole
  ): Promise<PaginatedContacts> {
    try {
      const page = pagination.page || 1;
      const limit = pagination.limit || 20;
      const offset = (page - 1) * limit;
      const sortColumnMap: Record<string, string> = {
        created_at: 'created_at',
        updated_at: 'updated_at',
        first_name: 'first_name',
        last_name: 'last_name',
        email: 'email',
        account_name: 'account_name',
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
        conditions.push(`${CONTACT_SEARCH_SQL} ILIKE $${paramCounter}`);
        values.push(`%${filters.search}%`);
        paramCounter++;
      }

      if (filters.role) {
        const roleNames = resolveContactRoleNames(filters.role);

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
      const dataQuery = `
        WITH filtered_contacts AS (
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
            c.phn_encrypted,
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
            c.document_count,
            c.tags,
            c.is_active,
            c.created_at,
            c.updated_at,
            c.created_by,
            c.modified_by,
            a.account_name
          FROM contacts c
          LEFT JOIN accounts a ON c.account_id = a.id
          ${whereClause}
        ),
        paged_contacts AS (
          SELECT
            fc.*,
            COUNT(*) OVER()::int AS total_count
          FROM filtered_contacts fc
          ORDER BY ${sortColumn} ${sortOrder}
          LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
        ),
        phone_counts AS (
          SELECT contact_id, COUNT(*)::int AS cnt
          FROM contact_phone_numbers
          WHERE contact_id IN (SELECT contact_id FROM paged_contacts)
          GROUP BY contact_id
        ),
        email_counts AS (
          SELECT contact_id, COUNT(*)::int AS cnt
          FROM contact_email_addresses
          WHERE contact_id IN (SELECT contact_id FROM paged_contacts)
          GROUP BY contact_id
        ),
        rel_counts AS (
          SELECT contact_id, COUNT(*)::int AS cnt
          FROM contact_relationships
          WHERE is_active = true
            AND contact_id IN (SELECT contact_id FROM paged_contacts)
          GROUP BY contact_id
        ),
        note_counts AS (
          SELECT contact_id, COUNT(*)::int AS cnt
          FROM contact_notes
          WHERE contact_id IN (SELECT contact_id FROM paged_contacts)
          GROUP BY contact_id
        ),
        role_names AS (
          SELECT
            cra.contact_id,
            ARRAY_AGG(cr.name ORDER BY cr.name) AS roles
          FROM contact_role_assignments cra
          INNER JOIN contact_roles cr ON cr.id = cra.role_id
          WHERE cra.contact_id IN (SELECT contact_id FROM paged_contacts)
          GROUP BY cra.contact_id
        )
        SELECT
          pc.*,
          COALESCE(phone_counts.cnt, 0) as phone_count,
          COALESCE(email_counts.cnt, 0) as email_count,
          COALESCE(rel_counts.cnt, 0) as relationship_count,
          COALESCE(note_counts.cnt, 0) as note_count,
          COALESCE(role_names.roles, ARRAY[]::text[]) as roles
        FROM paged_contacts pc
        LEFT JOIN phone_counts ON phone_counts.contact_id = pc.contact_id
        LEFT JOIN email_counts ON email_counts.contact_id = pc.contact_id
        LEFT JOIN rel_counts ON rel_counts.contact_id = pc.contact_id
        LEFT JOIN note_counts ON note_counts.contact_id = pc.contact_id
        LEFT JOIN role_names ON role_names.contact_id = pc.contact_id
        ORDER BY ${sortColumn} ${sortOrder}
      `;
      const dataResult = await this.pool.query(dataQuery, [...values, limit, offset]);
      const rows = dataResult.rows as ContactRecord[];
      const total = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;

      return {
        data: rows.map(({ total_count: _totalCount, ...row }) =>
          mapContactRow(row as ContactRecord, viewerRole)
        ),
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

  async lookupContacts(
    query: { q: string; limit?: number; is_active?: boolean },
    scope?: DataScopeFilter
  ): Promise<ContactLookupItem[]> {
    try {
      const searchTerm = query.q.trim();
      if (searchTerm.length < 2) {
        return [];
      }

      const limit = Math.min(Math.max(query.limit ?? 8, 1), 20);
      const conditions: string[] = [];
      const values: QueryValue[] = [];
      let paramCounter = 1;

      conditions.push(`${CONTACT_SEARCH_SQL} ILIKE $${paramCounter}`);
      values.push(`%${searchTerm}%`);
      paramCounter++;

      const isActive = query.is_active ?? true;
      conditions.push(`c.is_active = $${paramCounter}`);
      values.push(isActive);
      paramCounter++;

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

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const result = await this.pool.query(
        `
          SELECT
            c.id AS contact_id,
            c.first_name,
            c.preferred_name,
            c.last_name,
            c.email,
            c.phone,
            c.mobile_phone,
            c.is_active,
            a.account_name
          FROM contacts c
          LEFT JOIN accounts a ON a.id = c.account_id
          ${whereClause}
          ORDER BY c.updated_at DESC
          LIMIT $${paramCounter}
        `,
        [...values, limit]
      );

      return result.rows.map((row) => ({
        contact_id: row.contact_id,
        first_name: row.first_name,
        preferred_name: row.preferred_name,
        last_name: row.last_name,
        email: row.email,
        phone: row.phone,
        mobile_phone: row.mobile_phone,
        is_active: row.is_active,
        account_name: row.account_name ?? null,
      }));
    } catch (error) {
      logger.error('Error looking up contacts:', error);
      throw Object.assign(new Error('Failed to lookup contacts'), { cause: error });
    }
  }

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

  async getContactById(
    contactId: string,
    viewerRole?: ViewerRole,
    client?: Pool | PoolClient
  ): Promise<Contact | null> {
    try {
      const executor = client || this.pool;
      const result = await executor.query(
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
          c.phn_encrypted,
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
          c.document_count,
          c.tags,
          c.is_active,
          c.created_at,
          c.updated_at,
          a.account_name,
          (SELECT COUNT(*)::int FROM contact_phone_numbers WHERE contact_id = c.id) as phone_count,
          (SELECT COUNT(*)::int FROM contact_email_addresses WHERE contact_id = c.id) as email_count,
          (SELECT COUNT(*)::int FROM contact_relationships WHERE contact_id = c.id AND is_active = true) as relationship_count,
          (SELECT COUNT(*)::int FROM contact_notes WHERE contact_id = c.id) as note_count,
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

      const row = result.rows[0] as ContactRecord | undefined;
      return row ? mapContactRow(row, viewerRole) : null;
    } catch (error) {
      logger.error('Error getting contact by ID:', error);
      throw Object.assign(new Error('Failed to retrieve contact'), { cause: error });
    }
  }

  async getContactByIdWithScope(
    contactId: string,
    scope?: DataScopeFilter,
    viewerRole?: ViewerRole,
    client?: Pool | PoolClient
  ): Promise<Contact | null> {
    try {
      const executor = client || this.pool;
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

      const result = await executor.query(
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
          c.phn_encrypted,
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
          c.document_count,
          c.tags,
          c.is_active,
          c.created_at,
          c.updated_at,
          a.account_name,
          (SELECT COUNT(*)::int FROM contact_phone_numbers WHERE contact_id = c.id) as phone_count,
          (SELECT COUNT(*)::int FROM contact_email_addresses WHERE contact_id = c.id) as email_count,
          (SELECT COUNT(*)::int FROM contact_relationships WHERE contact_id = c.id AND is_active = true) as relationship_count,
          (SELECT COUNT(*)::int FROM contact_notes WHERE contact_id = c.id) as note_count,
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

      const row = result.rows[0] as ContactRecord | undefined;
      return row ? mapContactRow(row, viewerRole) : null;
    } catch (error) {
      logger.error('Error getting contact by ID with scope:', error);
      throw Object.assign(new Error('Failed to retrieve contact'), { cause: error });
    }
  }

  async createContact(
    data: CreateContactDTO,
    userId: string,
    viewerRole?: ViewerRole,
    client?: PoolClient
  ): Promise<Contact> {
    try {
      const normalizedPhn = normalizePhn(data.phn);
      const encryptedPhn = normalizedPhn ? encrypt(normalizedPhn) : null;
      const normalizedBirthDate = normalizeDateOnly(data.birth_date);
      const normalizedEmail = normalizeNullableText(data.email) ?? null;
      const normalizedPhone = normalizeNullableText(data.phone) ?? null;
      const normalizedMobilePhone = normalizeNullableText(data.mobile_phone) ?? null;

      const executor = client || this.pool;
      const result = await executor.query(
        `INSERT INTO contacts (
          account_id, first_name, preferred_name, last_name, middle_name, salutation, suffix,
          birth_date, gender, pronouns, phn_encrypted,
          email, phone, mobile_phone,
          address_line1, address_line2, city, state_province, postal_code, country,
          no_fixed_address,
          job_title, department, preferred_contact_method, do_not_email, do_not_phone, do_not_text, do_not_voicemail, notes,
          tags,
          created_by, modified_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $31)
        RETURNING id as contact_id, account_id, first_name, preferred_name, last_name, middle_name, salutation, suffix,
          birth_date, gender, pronouns, phn_encrypted,
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
          normalizedBirthDate,
          data.gender || null,
          data.pronouns || null,
          encryptedPhn,
          normalizedEmail,
          normalizedPhone,
          normalizedMobilePhone,
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

      const contactId = result.rows[0].contact_id as string;
      const syncExecutor = client || this.pool;
      await syncStructuredContactMethodsFromSummary(
        contactId,
        {
          email: normalizedEmail,
          phone: normalizedPhone,
          mobile_phone: normalizedMobilePhone,
        },
        userId,
        syncExecutor
      );
      await syncContactMethodSummaries(contactId, syncExecutor);

      const createdContact = await this.getContactById(contactId, viewerRole, executor);
      if (!createdContact) {
        throw new Error('Failed to reload created contact');
      }

      logger.info(`Contact created: ${contactId}`);
      return createdContact;
    } catch (error) {
      logger.error('Error creating contact:', error);
      throw Object.assign(new Error('Failed to create contact'), { cause: error });
    }
  }

  async updateContact(
    contactId: string,
    data: UpdateContactDTO,
    userId: string,
    viewerRole?: ViewerRole,
    client?: PoolClient
  ): Promise<Contact | null> {
    try {
      const updateData: Record<string, unknown> = { ...data };
      const summarySyncInput: {
        email?: string | null;
        phone?: string | null;
        mobile_phone?: string | null;
      } = {};

      if (Object.prototype.hasOwnProperty.call(updateData, 'birth_date')) {
        updateData.birth_date = normalizeDateOnly(updateData.birth_date);
      }

      if (Object.prototype.hasOwnProperty.call(updateData, 'email')) {
        const normalizedEmail = normalizeNullableText(updateData.email);
        updateData.email = normalizedEmail;
        summarySyncInput.email = normalizedEmail ?? null;
      }

      if (Object.prototype.hasOwnProperty.call(updateData, 'phone')) {
        const normalizedPhone = normalizeNullableText(updateData.phone);
        updateData.phone = normalizedPhone;
        summarySyncInput.phone = normalizedPhone ?? null;
      }

      if (Object.prototype.hasOwnProperty.call(updateData, 'mobile_phone')) {
        const normalizedMobilePhone = normalizeNullableText(updateData.mobile_phone);
        updateData.mobile_phone = normalizedMobilePhone;
        summarySyncInput.mobile_phone = normalizedMobilePhone ?? null;
      }

      if (Object.prototype.hasOwnProperty.call(updateData, 'phn')) {
        const normalizedPhn = normalizePhn(updateData.phn);
        updateData.phn_encrypted = normalizedPhn ? encrypt(normalizedPhn) : null;
        delete updateData.phn;
      }

      const fields: string[] = [];
      const values: QueryValue[] = [];
      let paramCounter = 1;

      // Build dynamic update query
      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined) {
          fields.push(`${key} = $${paramCounter}`);
          values.push(value as QueryValue);
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
          birth_date, gender, pronouns, phn_encrypted,
          email, phone, mobile_phone, job_title, department, preferred_contact_method,
          do_not_email, do_not_phone, do_not_text, do_not_voicemail,
          address_line1, address_line2, city, state_province, postal_code, country,
          no_fixed_address,
          notes, tags, is_active, created_at, updated_at, created_by, modified_by
      `;

      const executor = client || this.pool;
      const result = await executor.query(query, values);

      if (result.rows.length === 0) {
        return null;
      }

      if (
        summarySyncInput.email !== undefined ||
        summarySyncInput.phone !== undefined ||
        summarySyncInput.mobile_phone !== undefined
      ) {
        const syncExecutor = client || this.pool;
        await syncStructuredContactMethodsFromSummary(contactId, summarySyncInput, userId, syncExecutor);
        await syncContactMethodSummaries(contactId, syncExecutor);
      }

      const updatedContact = await this.getContactById(contactId, viewerRole, executor);
      if (!updatedContact) {
        throw new Error('Failed to reload updated contact');
      }

      logger.info(`Contact updated: ${contactId}`);
      return updatedContact;
    } catch (error) {
      logger.error('Error updating contact:', error);
      throw Object.assign(new Error('Failed to update contact'), { cause: error });
    }
  }

  async bulkUpdateContacts(
    contactIds: string[],
    options: ContactBulkUpdateOptions,
    userId: string
  ): Promise<number> {
    try {
      const plannedUpdate = buildContactBulkUpdateQuery(contactIds, options, userId);
      if (!plannedUpdate) {
        return 0;
      }

      const result = await this.pool.query(plannedUpdate.query, plannedUpdate.values);
      return result.rowCount || 0;
    } catch (error) {
      logger.error('Error bulk updating contacts:', error);
      throw Object.assign(new Error('Failed to bulk update contacts'), { cause: error });
    }
  }

  async mergeContacts(
    contactId: string,
    payload: ContactMergeRequest,
    userId: string,
    scope?: DataScopeFilter,
    viewerRole?: ViewerRole
  ): Promise<ContactMergeResult | null> {
    if (scope) {
      const [scopedSource, scopedTarget] = await Promise.all([
        this.getContactByIdWithScope(contactId, scope, viewerRole),
        this.getContactByIdWithScope(payload.target_contact_id, scope, viewerRole),
      ]);

      if (!scopedSource || !scopedTarget) {
        return null;
      }
    }

    return this.contactMergeService.mergeContacts(contactId, payload, userId, viewerRole);
  }

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
