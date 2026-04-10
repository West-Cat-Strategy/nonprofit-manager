/**
 * Donation Service
 * Business logic for donation management
 */

import { Pool } from 'pg';
import { randomInt } from 'crypto';
import pool from '@config/database';
import { logger } from '@config/logger';
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
import { activityEventService } from '@services/activityEventService';

type QueryValue = string | number | boolean | Date | null | string[];

import {
  DONATION_SELECT_COLUMNS,
  DONATION_RETURNING_COLUMNS,
  DONATION_TAX_RECEIPT_JOIN,
} from './donationServiceSQL';

export class DonationService {
  constructor(private pool: Pool) {}

  private async hasOfficialTaxReceiptCoverage(donationId: string): Promise<boolean> {
    const result = await this.pool.query<{ receipt_id: string }>(
      `SELECT tri.receipt_id
       FROM tax_receipt_items tri
       WHERE tri.donation_id = $1
         AND tri.official_coverage = true
       LIMIT 1`,
      [donationId]
    );

    return result.rowCount ? result.rowCount > 0 : false;
  }

  private isDonationNumberCollision(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const dbError = error as { code?: string; constraint?: string };
    return (
      dbError.code === '23505' &&
      dbError.constraint === 'donations_donation_number_key'
    );
  }

  /**
   * Generate unique donation number (DON-YYMMDD-XXXXX)
   */
  private generateDonationNumber(): string {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const prefix = `DON-${year}${month}${day}`;
    const sequence = String(randomInt(0, 100000)).padStart(5, '0');
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
        ${DONATION_SELECT_COLUMNS}
      FROM donations d
      LEFT JOIN accounts a ON d.account_id = a.id
      LEFT JOIN contacts c ON d.contact_id = c.id
      LEFT JOIN recurring_donation_plans rdp ON d.recurring_plan_id = rdp.id
      ${DONATION_TAX_RECEIPT_JOIN}
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
        ${DONATION_SELECT_COLUMNS}
      FROM donations d
      LEFT JOIN accounts a ON d.account_id = a.id
      LEFT JOIN contacts c ON d.contact_id = c.id
      LEFT JOIN recurring_donation_plans rdp ON d.recurring_plan_id = rdp.id
      ${DONATION_TAX_RECEIPT_JOIN}
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
      recurring_plan_id,
      amount,
      currency = 'CAD',
      donation_date,
      payment_method,
      payment_status = 'pending',
      transaction_id,
      payment_provider,
      provider_transaction_id,
      provider_checkout_session_id,
      provider_subscription_id,
      provider_customer_id,
      stripe_subscription_id,
      stripe_invoice_id,
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

    const query = `
      INSERT INTO donations (
        donation_number, account_id, contact_id, recurring_plan_id, amount, currency, donation_date,
        payment_method, payment_status, transaction_id, payment_provider, provider_transaction_id,
        provider_checkout_session_id, provider_subscription_id, provider_customer_id,
        stripe_subscription_id, stripe_invoice_id, campaign_name, designation, is_recurring,
        recurring_frequency, notes, created_by, modified_by
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
        $19, $20, $21, $22, $23, $24
      )
      RETURNING 
        ${DONATION_RETURNING_COLUMNS}
    `;
    const maxAttempts = 6;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const donation_number = this.generateDonationNumber();

      try {
        const result = await this.pool.query(query, [
          donation_number,
          account_id || null,
          contact_id || null,
          recurring_plan_id || null,
          amount,
          currency,
          donation_date,
          payment_method || null,
          payment_status,
          transaction_id || null,
          payment_provider || null,
          provider_transaction_id || null,
          provider_checkout_session_id || null,
          provider_subscription_id || null,
          provider_customer_id || null,
          stripe_subscription_id || null,
          stripe_invoice_id || null,
          campaign_name || null,
          designation || null,
          is_recurring,
          recurring_frequency || null,
          notes || null,
          userId,
          userId,
        ]);

        const donation = result.rows[0];

        try {
          await activityEventService.recordEvent({
            organizationId: account_id || null,
            type: 'donation_received',
            title: 'Donation received',
            description: `Donation of $${Number(amount).toFixed(2)}`,
            userId,
            entityType: 'donation',
            entityId: donation.donation_id,
            relatedEntityType: contact_id ? 'contact' : undefined,
            relatedEntityId: contact_id || undefined,
            sourceTable: 'donations',
            sourceRecordId: donation.donation_id,
            metadata: {
              amount,
              currency,
              paymentStatus: payment_status,
              paymentMethod: payment_method || null,
              campaignName: campaign_name || null,
            },
          });
        } catch (activityError) {
          logger.warn('Failed to record donation activity event', {
            activityError,
            donationId: donation.donation_id,
          });
        }

        return donation;
      } catch (error) {
        if (!this.isDonationNumberCollision(error) || attempt === maxAttempts) {
          throw error;
        }
      }
    }

    throw new Error('Failed to generate unique donation number');
  }

  /**
   * Update donation
   */
  async updateDonation(
    donationId: string,
    donationData: UpdateDonationDTO,
    userId: string
  ): Promise<Donation> {
    if (
      donationData.payment_status &&
      ['refunded', 'cancelled'].includes(donationData.payment_status)
    ) {
      const hasReceiptCoverage = await this.hasOfficialTaxReceiptCoverage(donationId);
      if (hasReceiptCoverage) {
        throw new Error(
          'Receipted donations cannot be marked refunded or cancelled until receipt reversal is supported'
        );
      }
    }

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
        ${DONATION_RETURNING_COLUMNS}
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
        ${DONATION_RETURNING_COLUMNS}
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
