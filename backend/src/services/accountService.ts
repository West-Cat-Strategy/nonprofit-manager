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

type QueryValue = string | number | boolean | null;

export class AccountService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Generate unique account number
   */
  private async generateAccountNumber(): Promise<string> {
    const result = await this.pool.query(
      `SELECT account_number FROM accounts ORDER BY created_at DESC LIMIT 1`
    );

    if (result.rows.length === 0) {
      return 'ACC-10001';
    }

    const lastNumber = result.rows[0].account_number;
    const numPart = parseInt(lastNumber.split('-')[1]);
    return `ACC-${numPart + 1}`;
  }

  /**
   * Get all accounts with filtering and pagination
   */
  async getAccounts(
    filters: AccountFilters = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedAccounts> {
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
        ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
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

  /**
   * Create new account
   */
  async createAccount(data: CreateAccountDTO, userId: string): Promise<Account> {
    try {
      const accountNumber = await this.generateAccountNumber();

      const result = await this.pool.query(
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

      logger.info(`Account created: ${result.rows[0].account_id}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating account:', error);
      throw new Error('Failed to create account');
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
