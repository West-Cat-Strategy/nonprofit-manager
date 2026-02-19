/**
 * Donation Service
 * Business logic for donation management
 */

import { Pool } from 'pg';
import pool from '@config/database';
import {
  Donation,
  CreateDonationDTO,
  UpdateDonationDTO,
  DonationFilters,
  PaginationParams,
  PaginatedDonations,
  DonationSummary,
} from '@app-types/donation';
import { resolveSort } from '@utils/queryHelpers';
import type { DataScopeFilter } from '@app-types/dataScope';

type QueryValue = string | number | boolean | Date | null | string[];

export class DonationService {
  constructor(private pool: Pool) {}

  /**
   * Generate unique donation number (DON-YYMMDD-XXXXX)
   */
  private async generateDonationNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const prefix = `DON-${year}${month}${day}`;

    // Get count of donations with same prefix today
    const countQuery = `
      SELECT COUNT(*) FROM donations 
      WHERE donation_number LIKE $1
    `;
    const result = await this.pool.query(countQuery, [`${prefix}%`]);
    const count = parseInt(result.rows[0].count) + 1;
    const sequence = String(count).padStart(5, '0');

    return `${prefix}-${sequence}`;
  }

  /**
   * Get all donations with filtering and pagination
   */
  async getDonations(
    filters: DonationFilters = {},
    pagination: PaginationParams = {},
    scope?: DataScopeFilter
  ): Promise<PaginatedDonations> {
    const {
      search,
      account_id,
      contact_id,
      payment_method,
      payment_status,
      campaign_name,
      is_recurring,
      min_amount,
      max_amount,
      start_date,
      end_date,
    } = filters;

    const {
      page = 1,
      limit = 20,
      sort_by,
      sort_order,
    } = pagination;

    const offset = (page - 1) * limit;

    // Build dynamic WHERE clause
    const conditions: string[] = [];
    const params: QueryValue[] = [];
    let paramCount = 1;

    if (search) {
      conditions.push(`(
        d.donation_number ILIKE $${paramCount} OR 
        d.campaign_name ILIKE $${paramCount} OR
        d.designation ILIKE $${paramCount} OR
        d.transaction_id ILIKE $${paramCount}
      )`);
      params.push(`%${search}%`);
      paramCount++;
    }

    if (account_id) {
      conditions.push(`d.account_id = $${paramCount}`);
      params.push(account_id);
      paramCount++;
    }

    if (contact_id) {
      conditions.push(`d.contact_id = $${paramCount}`);
      params.push(contact_id);
      paramCount++;
    }

    if (payment_method) {
      conditions.push(`d.payment_method = $${paramCount}`);
      params.push(payment_method);
      paramCount++;
    }

    if (payment_status) {
      conditions.push(`d.payment_status = $${paramCount}`);
      params.push(payment_status);
      paramCount++;
    }

    if (campaign_name) {
      conditions.push(`d.campaign_name ILIKE $${paramCount}`);
      params.push(`%${campaign_name}%`);
      paramCount++;
    }

    if (is_recurring !== undefined) {
      conditions.push(`d.is_recurring = $${paramCount}`);
      params.push(is_recurring);
      paramCount++;
    }

    if (min_amount !== undefined) {
      conditions.push(`d.amount >= $${paramCount}`);
      params.push(min_amount);
      paramCount++;
    }

    if (max_amount !== undefined) {
      conditions.push(`d.amount <= $${paramCount}`);
      params.push(max_amount);
      paramCount++;
    }

    if (start_date) {
      conditions.push(`d.donation_date >= $${paramCount}`);
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      conditions.push(`d.donation_date <= $${paramCount}`);
      params.push(end_date);
      paramCount++;
    }

    if (scope?.accountIds && scope.accountIds.length > 0) {
      conditions.push(`d.account_id = ANY($${paramCount}::uuid[])`);
      params.push(scope.accountIds);
      paramCount++;
    }

    if (scope?.contactIds && scope.contactIds.length > 0) {
      conditions.push(`d.contact_id = ANY($${paramCount}::uuid[])`);
      params.push(scope.contactIds);
      paramCount++;
    }

    if (scope?.createdByUserIds && scope.createdByUserIds.length > 0) {
      conditions.push(`d.created_by = ANY($${paramCount}::uuid[])`);
      params.push(scope.createdByUserIds);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count and summary
    const summaryQuery = `
      SELECT 
        COUNT(*) as total,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(AVG(amount), 0) as average_amount
      FROM donations d
      ${whereClause}
    `;
    const summaryResult = await this.pool.query(summaryQuery, params);
    const total = parseInt(summaryResult.rows[0].total);
    const summary = {
      total_amount: parseFloat(summaryResult.rows[0].total_amount),
      count: total,
      average_amount: parseFloat(summaryResult.rows[0].average_amount),
    };

    const sortColumnMap: Record<string, string> = {
      donation_date: 'd.donation_date',
      created_at: 'd.created_at',
      amount: 'd.amount',
      donation_number: 'd.donation_number',
      payment_status: 'd.payment_status',
      payment_method: 'd.payment_method',
    };
    const { sortColumn, sortOrder } = resolveSort(
      sort_by,
      sort_order,
      sortColumnMap,
      'donation_date'
    );

    // Get paginated results with joined data
    const dataQuery = `
      SELECT 
        d.id as donation_id,
        d.donation_number,
        d.account_id,
        d.contact_id,
        d.amount,
        d.currency,
        d.donation_date,
        d.payment_method,
        d.payment_status,
        d.transaction_id,
        d.campaign_name,
        d.designation,
        d.is_recurring,
        d.recurring_frequency,
        d.notes,
        d.receipt_sent,
        d.receipt_sent_date,
        d.created_at,
        d.updated_at,
        d.created_by,
        d.modified_by,
        a.account_name,
        CONCAT(c.first_name, ' ', c.last_name) as contact_name
      FROM donations d
      LEFT JOIN accounts a ON d.account_id = a.id
      LEFT JOIN contacts c ON d.contact_id = c.id
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    params.push(limit, offset);
    const dataResult = await this.pool.query(dataQuery, params);

    return {
      data: dataResult.rows,
      pagination: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
      summary,
    };
  }

  /**
   * Get donation by ID
   */
  async getDonationById(
    donationId: string,
    scope?: DataScopeFilter
  ): Promise<Donation | null> {
    const query = `
      SELECT 
        d.id as donation_id,
        d.donation_number,
        d.account_id,
        d.contact_id,
        d.amount,
        d.currency,
        d.donation_date,
        d.payment_method,
        d.payment_status,
        d.transaction_id,
        d.campaign_name,
        d.designation,
        d.is_recurring,
        d.recurring_frequency,
        d.notes,
        d.receipt_sent,
        d.receipt_sent_date,
        d.created_at,
        d.updated_at,
        d.created_by,
        d.modified_by,
        a.account_name,
        CONCAT(c.first_name, ' ', c.last_name) as contact_name
      FROM donations d
      LEFT JOIN accounts a ON d.account_id = a.id
      LEFT JOIN contacts c ON d.contact_id = c.id
      WHERE d.id = $1
    `;

    const params: QueryValue[] = [donationId];
    let paramCount = 2;
    const conditions: string[] = [];

    if (scope?.accountIds && scope.accountIds.length > 0) {
      conditions.push(`d.account_id = ANY($${paramCount}::uuid[])`);
      params.push(scope.accountIds);
      paramCount++;
    }

    if (scope?.contactIds && scope.contactIds.length > 0) {
      conditions.push(`d.contact_id = ANY($${paramCount}::uuid[])`);
      params.push(scope.contactIds);
      paramCount++;
    }

    if (scope?.createdByUserIds && scope.createdByUserIds.length > 0) {
      conditions.push(`d.created_by = ANY($${paramCount}::uuid[])`);
      params.push(scope.createdByUserIds);
    }

    const finalQuery =
      conditions.length > 0 ? `${query} AND ${conditions.join(' AND ')}` : query;
    const result = await this.pool.query(finalQuery, params);
    return result.rows[0] || null;
  }

  /**
   * Create new donation
   */
  async createDonation(donationData: CreateDonationDTO, userId: string): Promise<Donation> {
    const {
      account_id,
      contact_id,
      amount,
      currency = 'USD',
      donation_date,
      payment_method,
      payment_status = 'pending',
      transaction_id,
      campaign_name,
      designation,
      is_recurring = false,
      recurring_frequency,
      notes,
    } = donationData;

    // Validate that either account_id or contact_id is provided
    if (!account_id && !contact_id) {
      throw new Error('Either account_id or contact_id must be provided');
    }

    const donation_number = await this.generateDonationNumber();

    const query = `
      INSERT INTO donations (
        donation_number, account_id, contact_id, amount, currency, donation_date,
        payment_method, payment_status, transaction_id, campaign_name, designation,
        is_recurring, recurring_frequency, notes, created_by, modified_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $15)
      RETURNING 
        id as donation_id,
        donation_number,
        account_id,
        contact_id,
        amount,
        currency,
        donation_date,
        payment_method,
        payment_status,
        transaction_id,
        campaign_name,
        designation,
        is_recurring,
        recurring_frequency,
        notes,
        receipt_sent,
        receipt_sent_date,
        created_at,
        updated_at,
        created_by,
        modified_by
    `;

    const result = await this.pool.query(query, [
      donation_number,
      account_id || null,
      contact_id || null,
      amount,
      currency,
      donation_date,
      payment_method || null,
      payment_status,
      transaction_id || null,
      campaign_name || null,
      designation || null,
      is_recurring,
      recurring_frequency || null,
      notes || null,
      userId,
    ]);

    return result.rows[0];
  }

  /**
   * Update donation
   */
  async updateDonation(
    donationId: string,
    donationData: UpdateDonationDTO,
    userId: string
  ): Promise<Donation> {
    const fields: string[] = [];
    const values: QueryValue[] = [];
    let paramCount = 1;

    Object.entries(donationData).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`modified_by = $${paramCount}`);
    values.push(userId);
    paramCount++;

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    values.push(donationId);

    const query = `
      UPDATE donations
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING 
        id as donation_id,
        donation_number,
        account_id,
        contact_id,
        amount,
        currency,
        donation_date,
        payment_method,
        payment_status,
        transaction_id,
        campaign_name,
        designation,
        is_recurring,
        recurring_frequency,
        notes,
        receipt_sent,
        receipt_sent_date,
        created_at,
        updated_at,
        created_by,
        modified_by
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Delete donation
   */
  async deleteDonation(donationId: string): Promise<boolean> {
    const query = `DELETE FROM donations WHERE id = $1`;
    const result = await this.pool.query(query, [donationId]);
    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * Mark receipt as sent
   */
  async markReceiptSent(donationId: string, userId: string): Promise<Donation> {
    const query = `
      UPDATE donations
      SET 
        receipt_sent = true,
        receipt_sent_date = CURRENT_TIMESTAMP,
        modified_by = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING 
        id as donation_id,
        donation_number,
        account_id,
        contact_id,
        amount,
        currency,
        donation_date,
        payment_method,
        payment_status,
        transaction_id,
        campaign_name,
        designation,
        is_recurring,
        recurring_frequency,
        notes,
        receipt_sent,
        receipt_sent_date,
        created_at,
        updated_at,
        created_by,
        modified_by
    `;

    const result = await this.pool.query(query, [userId, donationId]);
    return result.rows[0];
  }

  /**
   * Get donation summary statistics
   */
  async getDonationSummary(
    filters: DonationFilters = {},
    scope?: DataScopeFilter
  ): Promise<DonationSummary> {
    const conditions: string[] = [];
    const params: QueryValue[] = [];
    let paramCount = 1;

    // Apply same filters as getDonations
    if (filters.account_id) {
      conditions.push(`account_id = $${paramCount}`);
      params.push(filters.account_id);
      paramCount++;
    }

    if (filters.contact_id) {
      conditions.push(`contact_id = $${paramCount}`);
      params.push(filters.contact_id);
      paramCount++;
    }

    if (filters.start_date) {
      conditions.push(`donation_date >= $${paramCount}`);
      params.push(filters.start_date);
      paramCount++;
    }

    if (filters.end_date) {
      conditions.push(`donation_date <= $${paramCount}`);
      params.push(filters.end_date);
      paramCount++;
    }

    if (scope?.accountIds && scope.accountIds.length > 0) {
      conditions.push(`account_id = ANY($${paramCount}::uuid[])`);
      params.push(scope.accountIds);
      paramCount++;
    }

    if (scope?.contactIds && scope.contactIds.length > 0) {
      conditions.push(`contact_id = ANY($${paramCount}::uuid[])`);
      params.push(scope.contactIds);
      paramCount++;
    }

    if (scope?.createdByUserIds && scope.createdByUserIds.length > 0) {
      conditions.push(`created_by = ANY($${paramCount}::uuid[])`);
      params.push(scope.createdByUserIds);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get overall summary
    const summaryQuery = `
      SELECT 
        COALESCE(SUM(amount), 0) as total_amount,
        COUNT(*) as total_count,
        COALESCE(AVG(amount), 0) as average_donation,
        COALESCE(SUM(CASE WHEN is_recurring THEN 1 ELSE 0 END), 0) as recurring_count,
        COALESCE(SUM(CASE WHEN is_recurring THEN amount ELSE 0 END), 0) as recurring_amount
      FROM donations
      ${whereClause}
    `;

    const summaryResult = await this.pool.query(summaryQuery, params);
    const summary = summaryResult.rows[0];

    // Get by payment method
    const methodQuery = `
      SELECT 
        payment_method,
        COUNT(*) as count,
        SUM(amount) as amount
      FROM donations
      ${whereClause}
      GROUP BY payment_method
    `;

    const methodResult = await this.pool.query(methodQuery, params);
    const by_payment_method: Record<string, { count: number; amount: number }> = {};
    methodResult.rows.forEach((row) => {
      by_payment_method[row.payment_method || 'unknown'] = {
        count: parseInt(row.count),
        amount: parseFloat(row.amount),
      };
    });

    // Get by campaign
    const campaignQuery = `
      SELECT 
        campaign_name,
        COUNT(*) as count,
        SUM(amount) as amount
      FROM donations
      ${whereClause}
      GROUP BY campaign_name
    `;

    const campaignResult = await this.pool.query(campaignQuery, params);
    const by_campaign: Record<string, { count: number; amount: number }> = {};
    campaignResult.rows.forEach((row) => {
      by_campaign[row.campaign_name || 'unrestricted'] = {
        count: parseInt(row.count),
        amount: parseFloat(row.amount),
      };
    });

    return {
      total_amount: parseFloat(summary.total_amount),
      total_count: parseInt(summary.total_count),
      average_donation: parseFloat(summary.average_donation),
      recurring_count: parseInt(summary.recurring_count),
      recurring_amount: parseFloat(summary.recurring_amount),
      by_payment_method,
      by_campaign,
    };
  }
}

export default new DonationService(pool);
