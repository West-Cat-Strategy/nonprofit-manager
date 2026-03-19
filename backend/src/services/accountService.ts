/**
 * Account Service
 * Handles business logic and database operations for accounts
 */

import { Pool } from 'pg';
import {
  Account,
  CreateAccountDTO,
  UpdateAccountDTO,
  AccountFilters,
  PaginationParams,
  PaginatedAccounts,
} from '@app-types/account';
import { Contact } from '@app-types/contact';
import { logger } from '@config/logger';
import { resolveSort } from '@utils/queryHelpers';
import type { DataScopeFilter } from '@app-types/dataScope';
import { mapContactRow, type ContactRecord } from './contactServiceHelpers';

type QueryValue = string | number | boolean | null | string[];
type DbClient = Pick<Pool, 'query'>;
type AccountListRow = Account & { total_count?: number | string };
type AccountContactRow = ContactRecord & { total_count?: number | string };

const ACCOUNT_SEARCH_SQL =
  `coalesce(nullif(account_name, ''), '')`
  + ` || CASE WHEN nullif(email, '') IS NOT NULL THEN ' ' || email ELSE '' END`
  + ` || CASE WHEN nullif(account_number, '') IS NOT NULL THEN ' ' || account_number ELSE '' END`;

const ACCOUNT_CONTACT_COLUMNS = [
  'id',
  'account_id',
  'first_name',
  'preferred_name',
  'last_name',
  'middle_name',
  'salutation',
  'suffix',
  'birth_date',
  'gender',
  'pronouns',
  'phn_encrypted',
  'email',
  'phone',
  'mobile_phone',
  'address_line1',
  'address_line2',
  'city',
  'state_province',
  'postal_code',
  'country',
  'no_fixed_address',
  'job_title',
  'department',
  'preferred_contact_method',
  'do_not_email',
  'do_not_phone',
  'do_not_text',
  'do_not_voicemail',
  'notes',
  'tags',
  'is_active',
  'created_at',
  'updated_at',
  'created_by',
  'modified_by',
].join(', ');

export class AccountService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Generate unique account number
   */
  private async generateAccountNumber(db: DbClient = this.pool): Promise<string> {
    const result = await db.query(
      `SELECT MAX(CAST(SPLIT_PART(account_number, '-', 2) AS INTEGER)) AS max_number
       FROM accounts
       WHERE account_number ~ '^ACC-[0-9]+$'`
    );

    const maxNumber = result.rows[0]?.max_number;
    if (!maxNumber || Number.isNaN(Number(maxNumber))) {
      return 'ACC-10001';
    }

    return `ACC-${Number(maxNumber) + 1}`;
  }

  /**
   * Get all accounts with filtering and pagination
   */
  async getAccounts(
    filters: AccountFilters = {},
    pagination: PaginationParams = {},
    scope?: DataScopeFilter
  ): Promise<PaginatedAccounts> {
    try {
      const page = pagination.page || 1;
      const limit = pagination.limit || 20;
      const offset = (page - 1) * limit;
      const sortColumnMap: Record<string, string> = {
        created_at: 'created_at',
        updated_at: 'updated_at',
        account_name: 'account_name',
        account_number: 'account_number',
        account_type: 'account_type',
        email: 'email',
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
        conditions.push(`${ACCOUNT_SEARCH_SQL} ILIKE $${paramCounter}`);
        values.push(`%${filters.search}%`);
        paramCounter++;
      }

      if (filters.account_type) {
        conditions.push(`account_type = $${paramCounter}`);
        values.push(filters.account_type);
        paramCounter++;
      }

      if (filters.category) {
        conditions.push(`category = $${paramCounter}`);
        values.push(filters.category);
        paramCounter++;
      }

      if (filters.is_active !== undefined) {
        conditions.push(`is_active = $${paramCounter}`);
        values.push(filters.is_active);
        paramCounter++;
      }

      if (scope?.accountIds && scope.accountIds.length > 0) {
        conditions.push(`id = ANY($${paramCounter}::uuid[])`);
        values.push(scope.accountIds);
        paramCounter++;
      }

      if (scope?.createdByUserIds && scope.createdByUserIds.length > 0) {
        conditions.push(`created_by = ANY($${paramCounter}::uuid[])`);
        values.push(scope.createdByUserIds);
        paramCounter++;
      }

      if (scope?.accountTypes && scope.accountTypes.length > 0) {
        conditions.push(`account_type = ANY($${paramCounter}::text[])`);
        values.push(scope.accountTypes);
        paramCounter++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const accountColumns = [
        'id as account_id',
        'account_number',
        'account_name',
        'account_type',
        'category',
        'email',
        'phone',
        'website',
        'description',
        'address_line1',
        'address_line2',
        'city',
        'state_province',
        'postal_code',
        'country',
        'tax_id',
        'is_active',
        'created_at',
        'updated_at',
        'created_by',
        'modified_by',
      ].join(', ');

      // Get paginated data
      const dataQuery = `
        SELECT ${accountColumns},
               COUNT(*) OVER()::int AS total_count
        FROM accounts
        ${whereClause}
        ORDER BY ${sortColumn} ${sortOrder}
        LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
      `;
      const dataResult = await this.pool.query(dataQuery, [...values, limit, offset]);
      const rows = dataResult.rows as AccountListRow[];
      const total = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
      const data = rows.map(({ total_count: _totalCount, ...account }) => account);

      return {
        data,
        pagination: {
          total,
          page,
          limit,
          total_pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting accounts:', error);
      throw Object.assign(new Error('Failed to retrieve accounts'), { cause: error });
    }
  }

  /**
   * Get account by ID
   */
  async getAccountById(accountId: string): Promise<Account | null> {
    try {
      const result = await this.pool.query(
        `SELECT
          id as account_id,
          account_number,
          account_name,
          account_type,
          category,
          email,
          phone,
          website,
          description,
          address_line1,
          address_line2,
          city,
          state_province,
          postal_code,
          country,
          tax_id,
          is_active,
          created_at,
          updated_at,
          created_by,
          modified_by
        FROM accounts WHERE id = $1`,
        [accountId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting account by ID:', error);
      throw Object.assign(new Error('Failed to retrieve account'), { cause: error });
    }
  }

  async getAccountByIdWithScope(
    accountId: string,
    scope?: DataScopeFilter
  ): Promise<Account | null> {
    try {
      const conditions = ['id = $1'];
      const values: QueryValue[] = [accountId];
      let paramCounter = 2;

      if (scope?.accountIds && scope.accountIds.length > 0) {
        conditions.push(`id = ANY($${paramCounter}::uuid[])`);
        values.push(scope.accountIds);
        paramCounter++;
      }

      if (scope?.createdByUserIds && scope.createdByUserIds.length > 0) {
        conditions.push(`created_by = ANY($${paramCounter}::uuid[])`);
        values.push(scope.createdByUserIds);
        paramCounter++;
      }

      if (scope?.accountTypes && scope.accountTypes.length > 0) {
        conditions.push(`account_type = ANY($${paramCounter}::text[])`);
        values.push(scope.accountTypes);
        paramCounter++;
      }

      const result = await this.pool.query(
        `SELECT
          id as account_id,
          account_number,
          account_name,
          account_type,
          category,
          email,
          phone,
          website,
          description,
          address_line1,
          address_line2,
          city,
          state_province,
          postal_code,
          country,
          tax_id,
          is_active,
          created_at,
          updated_at,
          created_by,
          modified_by
        FROM accounts WHERE ${conditions.join(' AND ')}`,
        values
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting account by ID with scope:', error);
      throw Object.assign(new Error('Failed to retrieve account'), { cause: error });
    }
  }

  /**
   * Create new account
   */
  async createAccount(data: CreateAccountDTO, userId: string): Promise<Account> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Prevent account_number collisions under concurrent account creation.
      // We serialize just the number allocation using a transaction-scoped advisory lock.
      await client.query('SELECT pg_advisory_xact_lock($1)', [911_000_001]);

      const accountNumber = await this.generateAccountNumber(client);

      const result = await client.query(
        `INSERT INTO accounts (
           account_number, account_name, account_type,
           category,
           email, phone, website, description,
           address_line1, address_line2, city, state_province, postal_code, country,
           tax_id,
           created_by, modified_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $16)
         RETURNING id as account_id, account_number, account_name, account_type, category,
           email, phone, website, description,
           address_line1, address_line2, city, state_province, postal_code, country,
           tax_id, is_active, created_at, updated_at, created_by, modified_by`,
        [
          accountNumber,
          data.account_name,
          data.account_type,
          data.category || null,
          data.email || null,
          data.phone || null,
          data.website || null,
          data.description || null,
          data.address_line1 || null,
          data.address_line2 || null,
          data.city || null,
          data.state_province || null,
          data.postal_code || null,
          data.country || null,
          data.tax_id || null,
          userId,
        ]
      );

      await client.query('COMMIT');

      logger.info(`Account created: ${result.rows[0].account_id}`);
      return result.rows[0];
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // ignore rollback errors; original error is what matters
      }
      logger.error('Error creating account:', error);
      throw Object.assign(new Error('Failed to create account'), { cause: error });
    } finally {
      client.release();
    }
  }

  /**
   * Update account
   */
  async updateAccount(
    accountId: string,
    data: UpdateAccountDTO,
    userId: string
  ): Promise<Account | null> {
    try {
      const fields: string[] = [];
      const values: QueryValue[] = [];
      let paramCounter = 1;

      const allowedFields = new Set([
        'account_name',
        'account_type',
        'category',
        'email',
        'phone',
        'website',
        'description',
        'address_line1',
        'address_line2',
        'city',
        'state_province',
        'postal_code',
        'country',
        'tax_id',
        'is_active',
      ]);

      // Build dynamic update query (ignore unknown fields like category)
      Object.entries(data).forEach(([key, value]) => {
        if (!allowedFields.has(key)) {
          return;
        }
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

      // Add account_id for WHERE clause
      values.push(accountId);

      const query = `
        UPDATE accounts
        SET ${fields.join(', ')}
        WHERE id = $${paramCounter}
        RETURNING id as account_id, account_number, account_name, account_type, category,
          email, phone, website, description,
          address_line1, address_line2, city, state_province, postal_code, country, tax_id,
          is_active, created_at, updated_at, created_by, modified_by
      `;

      const result = await this.pool.query(query, values);

      if (result.rows.length === 0) {
        return null;
      }

      logger.info(`Account updated: ${accountId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating account:', error);
      throw Object.assign(new Error('Failed to update account'), { cause: error });
    }
  }

  /**
   * Soft delete account
   */
  async deleteAccount(accountId: string, userId: string): Promise<boolean> {
    try {
      const result = await this.pool.query(
        `UPDATE accounts 
         SET is_active = false, modified_by = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id`,
        [userId, accountId]
      );

      if (result.rows.length === 0) {
        return false;
      }

      logger.info(`Account soft deleted: ${accountId}`);
      return true;
    } catch (error) {
      logger.error('Error deleting account:', error);
      throw Object.assign(new Error('Failed to delete account'), { cause: error });
    }
  }

  /**
   * Get contacts for an account
   */
  async getAccountContacts(
    accountId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ contacts: Contact[]; total: number }> {
    try {
      const result = await this.pool.query<AccountContactRow>(
        `SELECT ${ACCOUNT_CONTACT_COLUMNS},
                COUNT(*) OVER()::int AS total_count
         FROM contacts
         WHERE account_id = $1 AND is_active = true
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [accountId, limit, offset]
      );

      const rows = result.rows;
      let total = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
      let contacts = rows.map(({ total_count: _totalCount, ...contact }) =>
        mapContactRow(contact as ContactRecord, 'staff')
      );

      if (rows.length === 0) {
        const countResult = await this.pool.query<{ total: string }>(
          'SELECT COUNT(*) as total FROM contacts WHERE account_id = $1 AND is_active = true',
          [accountId]
        );
        total = parseInt(countResult.rows[0]?.total || '0', 10);
        contacts = [];
      }

      return { contacts, total };
    } catch (error) {
      logger.error('Error getting account contacts:', error);
      throw Object.assign(new Error('Failed to retrieve account contacts'), { cause: error });
    }
  }
}
