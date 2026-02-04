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
} from '../types/account';
import { Contact } from '../types/contact';
import { logger } from '../config/logger';
import { resolveSort } from '../utils/queryHelpers';
import type { DataScopeFilter } from '../types/dataScope';

type QueryValue = string | number | boolean | null | string[];
type DbClient = Pick<Pool, 'query'>;

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
      `SELECT account_number
       FROM accounts
       WHERE account_number IS NOT NULL
       ORDER BY created_at DESC
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return 'ACC-10001';
    }

    const lastNumber = result.rows[0].account_number;
    if (!lastNumber || typeof lastNumber !== 'string' || !lastNumber.includes('-')) {
      return 'ACC-10001';
    }

    const numPart = parseInt(lastNumber.split('-')[1], 10);
    if (Number.isNaN(numPart)) {
      return 'ACC-10001';
    }

    return `ACC-${numPart + 1}`;
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
        conditions.push(`(
          account_name ILIKE $${paramCounter} OR
          email ILIKE $${paramCounter} OR
          account_number ILIKE $${paramCounter}
        )`);
        values.push(`%${filters.search}%`);
        paramCounter++;
      }

      if (filters.account_type) {
        conditions.push(`account_type = $${paramCounter}`);
        values.push(filters.account_type);
        paramCounter++;
      }

      // Note: category column will be added in migration 003
      // if (filters.category) {
      //   conditions.push(`category = $${paramCounter}`);
      //   values.push(filters.category);
      //   paramCounter++;
      // }

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

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM accounts ${whereClause}`;
      const countResult = await this.pool.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      // Get paginated data
      const dataQuery = `
        SELECT
          id as account_id,
          account_number,
          account_name,
          account_type,
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
          is_active,
          created_at,
          updated_at,
          created_by,
          modified_by
        FROM accounts
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
      logger.error('Error getting accounts:', error);
      throw new Error('Failed to retrieve accounts');
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
      throw new Error('Failed to retrieve account');
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
      throw new Error('Failed to retrieve account');
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
           email, phone, website, description,
           address_line1, address_line2, city, state_province, postal_code, country,
           created_by, modified_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14)
         RETURNING id as account_id, account_number, account_name, account_type,
           email, phone, website, description,
           address_line1, address_line2, city, state_province, postal_code, country,
           is_active, created_at, updated_at, created_by, modified_by`,
        [
          accountNumber,
          data.account_name,
          data.account_type,
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
      throw new Error('Failed to create account');
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

      // Add account_id for WHERE clause
      values.push(accountId);

      const query = `
        UPDATE accounts
        SET ${fields.join(', ')}
        WHERE id = $${paramCounter}
        RETURNING id as account_id, account_number, account_name, account_type,
          email, phone, website, description,
          address_line1, address_line2, city, state_province, postal_code, country,
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
      throw new Error('Failed to update account');
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
      throw new Error('Failed to delete account');
    }
  }

  /**
   * Get contacts for an account
   */
  async getAccountContacts(accountId: string): Promise<Contact[]> {
    try {
      const result = await this.pool.query(
        `SELECT * FROM contacts 
         WHERE account_id = $1 AND is_active = true
         ORDER BY created_at DESC`,
        [accountId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting account contacts:', error);
      throw new Error('Failed to retrieve account contacts');
    }
  }
}
