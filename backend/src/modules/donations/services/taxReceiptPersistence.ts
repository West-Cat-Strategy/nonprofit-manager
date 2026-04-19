import { type Pool, type PoolClient } from 'pg';
import type { DataScopeFilter } from '@app-types/dataScope';
import type { OrganizationSettingsConfig } from '@app-types/organizationSettings';
import type {
  TaxReceiptDeliveryMode,
  TaxReceiptKind,
  TaxReceiptPayeeType,
} from '@app-types/taxReceipt';
import { findOrganizationSettings } from '@modules/admin/lib/organizationSettingsStore';
import {
  buildScopeConditions,
  CASH_EQUIVALENT_PAYMENT_METHODS,
  getMissingOrganizationSettingsFields,
  type DonationReceiptRow,
  type PayeeRecord,
  type ReceiptSnapshot,
  type TaxReceiptRow,
} from './taxReceiptModels';

type InsertReceiptInput = {
  organizationId: string;
  receiptNumber: string;
  sequenceYear: number;
  sequenceNumber: number;
  kind: TaxReceiptKind;
  isOfficial: boolean;
  payee: PayeeRecord;
  deliveryMode: TaxReceiptDeliveryMode;
  includePreviouslyReceipted: boolean;
  totalAmount: string;
  currency: string;
  issueDate: string;
  periodStart: string | null;
  periodEnd: string | null;
  snapshot: ReceiptSnapshot;
  pdfContent: Buffer;
  createdBy: string;
};

export class TaxReceiptPersistence {
  constructor(private readonly pool: Pool) {}

  async loadOrganizationSettings(organizationId: string): Promise<OrganizationSettingsConfig> {
    const settings = await findOrganizationSettings(organizationId);
    if (!settings) {
      throw new Error('Organization receipting settings are not configured');
    }

    const missingFields = getMissingOrganizationSettingsFields(settings.config);
    if (missingFields.length > 0) {
      throw new Error(
        `Organization receipting settings are incomplete: ${missingFields.join(', ')}`
      );
    }

    return settings.config;
  }

  async resolveSingleDonationDetails(donationId: string): Promise<DonationReceiptRow | null> {
    const result = await this.pool.query<DonationReceiptRow>(
      `SELECT
         d.id AS donation_id,
         d.donation_number,
         d.amount::text,
         d.currency,
         d.donation_date::date::text AS donation_date,
         d.payment_method,
         d.payment_status,
         d.account_id,
         d.contact_id,
         d.campaign_name,
         d.designation
       FROM donations d
       WHERE d.id = $1`,
      [donationId]
    );

    return result.rows[0] ?? null;
  }

  async ensureDonationInScope(
    donationId: string,
    scope: DataScopeFilter | undefined
  ): Promise<boolean> {
    if (!scope) {
      return true;
    }

    const scopeCheck = buildScopeConditions(scope);
    if (scopeCheck.values.length === 0) {
      return true;
    }

    const scopedResult = await this.pool.query<{ donation_id: string }>(
      `SELECT d.id AS donation_id
       FROM donations d
       WHERE d.id = $1${scopeCheck.clause}`,
      [donationId, ...scopeCheck.values]
    );

    return (scopedResult.rowCount ?? 0) > 0;
  }

  async resolvePayeeRecord(
    client: PoolClient,
    payeeType: TaxReceiptPayeeType,
    payeeId: string
  ): Promise<PayeeRecord | null> {
    if (payeeType === 'contact') {
      const result = await client.query<{
        contact_id: string;
        first_name: string;
        last_name: string;
        email: string | null;
        phone: string | null;
        address_line1: string | null;
        address_line2: string | null;
        city: string | null;
        state_province: string | null;
        postal_code: string | null;
        country: string | null;
      }>(
        `SELECT
           c.id AS contact_id,
           c.first_name,
           c.last_name,
           c.email,
           c.phone,
           c.address_line1,
           c.address_line2,
           c.city,
           c.state_province,
           c.postal_code,
           c.country
         FROM contacts c
         WHERE c.id = $1`,
        [payeeId]
      );

      const row = result.rows[0];
      if (!row) {
        return null;
      }

      return {
        payeeType,
        payeeId: row.contact_id,
        payeeName: `${row.first_name} ${row.last_name}`.trim(),
        payeeEmail: row.email,
        payeePhone: row.phone,
        payeeAddress: {
          line1: row.address_line1 ?? '',
          line2: row.address_line2 ?? '',
          city: row.city ?? '',
          province: row.state_province ?? '',
          postalCode: row.postal_code ?? '',
          country: row.country ?? '',
        },
      };
    }

    const result = await client.query<{
      account_id: string;
      account_name: string;
      email: string | null;
      phone: string | null;
      address_line1: string | null;
      address_line2: string | null;
      city: string | null;
      state_province: string | null;
      postal_code: string | null;
      country: string | null;
    }>(
      `SELECT
         a.id AS account_id,
         a.account_name,
         a.email,
         a.phone,
         a.address_line1,
         a.address_line2,
         a.city,
         a.state_province,
         a.postal_code,
         a.country
       FROM accounts a
       WHERE a.id = $1`,
      [payeeId]
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      payeeType,
      payeeId: row.account_id,
      payeeName: row.account_name,
      payeeEmail: row.email,
      payeePhone: row.phone,
      payeeAddress: {
        line1: row.address_line1 ?? '',
        line2: row.address_line2 ?? '',
        city: row.city ?? '',
        province: row.state_province ?? '',
        postalCode: row.postal_code ?? '',
        country: row.country ?? '',
      },
    };
  }

  selectSingleDonationPayee(
    donation: DonationReceiptRow,
    requestedPayeeType?: TaxReceiptPayeeType
  ): { payeeType: TaxReceiptPayeeType; payeeId: string } {
    if (requestedPayeeType === 'contact') {
      if (!donation.contact_id) {
        throw new Error('This donation is not linked to a contact payee');
      }
      return { payeeType: 'contact', payeeId: donation.contact_id };
    }

    if (requestedPayeeType === 'account') {
      if (!donation.account_id) {
        throw new Error('This donation is not linked to an account payee');
      }
      return { payeeType: 'account', payeeId: donation.account_id };
    }

    if (donation.contact_id && donation.account_id) {
      throw new Error('Select whether the official receipt should use the contact or account payee');
    }

    if (donation.contact_id) {
      return { payeeType: 'contact', payeeId: donation.contact_id };
    }

    if (donation.account_id) {
      return { payeeType: 'account', payeeId: donation.account_id };
    }

    throw new Error('Donation must be linked to a contact or account payee');
  }

  async findExistingOfficialReceiptForDonation(
    donationId: string,
    organizationId: string
  ): Promise<TaxReceiptRow | null> {
    const result = await this.pool.query<TaxReceiptRow>(
      `SELECT
         tr.id,
         tr.organization_id,
         tr.receipt_number,
         tr.sequence_year,
         tr.sequence_number,
         tr.kind,
         tr.payee_type,
         tr.payee_id,
         tr.payee_name,
         tr.payee_email,
         tr.delivery_mode,
         tr.email_delivery_status,
         tr.email_sent_at,
         tr.email_error,
         tr.issue_date::text,
         tr.period_start::text,
         tr.period_end::text,
         tr.include_previously_receipted,
         tr.is_official,
         tr.total_amount::text,
         tr.currency,
         tr.created_by,
         tr.modified_by,
         tr.created_at,
         tr.updated_at
       FROM tax_receipts tr
       INNER JOIN tax_receipt_items tri
         ON tri.receipt_id = tr.id
       WHERE tr.organization_id = $1
         AND tri.donation_id = $2
         AND tri.official_coverage = true
       ORDER BY tr.created_at DESC
       LIMIT 1`,
      [organizationId, donationId]
    );

    return result.rows[0] ?? null;
  }

  async getReceiptWithPdf(receiptId: string, organizationId: string): Promise<TaxReceiptRow | null> {
    const result = await this.pool.query<TaxReceiptRow>(
      `SELECT
         tr.id,
         tr.organization_id,
         tr.receipt_number,
         tr.sequence_year,
         tr.sequence_number,
         tr.kind,
         tr.payee_type,
         tr.payee_id,
         tr.payee_name,
         tr.payee_email,
         tr.delivery_mode,
         tr.email_delivery_status,
         tr.email_sent_at,
         tr.email_error,
         tr.issue_date::text,
         tr.period_start::text,
         tr.period_end::text,
         tr.include_previously_receipted,
         tr.is_official,
         tr.total_amount::text,
         tr.currency,
         tr.created_by,
         tr.modified_by,
         tr.created_at,
         tr.updated_at,
         tr.pdf_content,
         tr.snapshot
       FROM tax_receipts tr
       WHERE tr.id = $1
         AND tr.organization_id = $2`,
      [receiptId, organizationId]
    );

    return result.rows[0] ?? null;
  }

  async allocateReceiptNumber(
    client: PoolClient,
    organizationId: string
  ): Promise<{ receiptNumber: string; sequenceYear: number; sequenceNumber: number }> {
    const sequenceYear = new Date().getUTCFullYear();

    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
      `tax-receipt:${organizationId}:${sequenceYear}`,
    ]);

    const result = await client.query<{ next_sequence: number }>(
      `SELECT COALESCE(MAX(sequence_number), 0) + 1 AS next_sequence
       FROM tax_receipts
       WHERE organization_id = $1
         AND sequence_year = $2`,
      [organizationId, sequenceYear]
    );

    const sequenceNumber = Number(result.rows[0]?.next_sequence ?? 1);
    const receiptNumber = `TR-${sequenceYear}-${String(sequenceNumber).padStart(5, '0')}`;

    return { receiptNumber, sequenceYear, sequenceNumber };
  }

  async insertReceipt(client: PoolClient, input: InsertReceiptInput): Promise<TaxReceiptRow> {
    const result = await client.query<TaxReceiptRow>(
      `INSERT INTO tax_receipts (
         organization_id,
         receipt_number,
         sequence_year,
         sequence_number,
         kind,
         payee_type,
         payee_id,
         payee_name,
         payee_email,
         payee_address,
         delivery_mode,
         email_delivery_status,
         issue_date,
         period_start,
         period_end,
         include_previously_receipted,
         is_official,
         total_amount,
         currency,
         snapshot,
         pdf_content,
         created_by,
         modified_by,
         created_at,
         updated_at
       )
       VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12,
         $13, $14, $15, $16, $17, $18, $19, $20::jsonb, $21, $22, $22,
         CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
       )
       RETURNING
         id,
         organization_id,
         receipt_number,
         sequence_year,
         sequence_number,
         kind,
         payee_type,
         payee_id,
         payee_name,
         payee_email,
         delivery_mode,
         email_delivery_status,
         email_sent_at,
         email_error,
         issue_date::text,
         period_start::text,
         period_end::text,
         include_previously_receipted,
         is_official,
         total_amount::text,
         currency,
         created_by,
         modified_by,
         created_at,
         updated_at`,
      [
        input.organizationId,
        input.receiptNumber,
        input.sequenceYear,
        input.sequenceNumber,
        input.kind,
        input.payee.payeeType,
        input.payee.payeeId,
        input.payee.payeeName,
        input.payee.payeeEmail,
        JSON.stringify(input.payee.payeeAddress),
        input.deliveryMode,
        input.deliveryMode === 'email' || input.deliveryMode === 'both'
          ? 'pending'
          : 'not_requested',
        input.issueDate,
        input.periodStart,
        input.periodEnd,
        input.includePreviouslyReceipted,
        input.isOfficial,
        input.totalAmount,
        input.currency,
        JSON.stringify(input.snapshot),
        input.pdfContent,
        input.createdBy,
      ]
    );

    return result.rows[0];
  }

  async attachReceiptItems(
    client: PoolClient,
    receiptId: string,
    donations: DonationReceiptRow[],
    officialCoverage: boolean
  ): Promise<void> {
    if (donations.length === 0) {
      return;
    }

    await client.query(
      `INSERT INTO tax_receipt_items (receipt_id, donation_id, donation_amount, donation_date, official_coverage, created_at)
       SELECT $1::uuid, item.donation_id, item.donation_amount, item.donation_date, $5::boolean, CURRENT_TIMESTAMP
       FROM UNNEST($2::uuid[], $3::numeric[], $4::date[]) AS item(donation_id, donation_amount, donation_date)`,
      [
        receiptId,
        donations.map((donation) => donation.donation_id),
        donations.map((donation) => donation.amount),
        donations.map((donation) => donation.donation_date),
        officialCoverage,
      ]
    );
  }

  async markDonationsReceipted(
    client: PoolClient,
    donations: DonationReceiptRow[],
    userId: string
  ): Promise<void> {
    if (donations.length === 0) {
      return;
    }

    await client.query(
      `UPDATE donations
       SET receipt_sent = true,
           receipt_sent_date = CURRENT_TIMESTAMP,
           modified_by = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ANY($1::uuid[])`,
      [donations.map((donation) => donation.donation_id), userId]
    );
  }

  async updateEmailDeliveryStatus(
    receiptId: string,
    status: 'sent' | 'failed',
    errorMessage?: string | null
  ): Promise<void> {
    await this.pool.query(
      `UPDATE tax_receipts
       SET email_delivery_status = $2,
           email_sent_at = CASE WHEN $2 = 'sent' THEN CURRENT_TIMESTAMP ELSE email_sent_at END,
           email_error = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [receiptId, status, errorMessage ?? null]
    );
  }

  async listAnnualReceiptDonations(args: {
    client: PoolClient;
    payeeType: TaxReceiptPayeeType;
    payeeId: string;
    dateFrom: string;
    dateTo: string;
    includeAlreadyReceipted: boolean;
    scope?: DataScopeFilter;
  }): Promise<DonationReceiptRow[]> {
    const scopeData = buildScopeConditions(args.scope, 'd', 5);
    const payeeColumn = args.payeeType === 'contact' ? 'd.contact_id' : 'd.account_id';
    const donationQuery = `
      SELECT
        d.id AS donation_id,
        d.donation_number,
        d.amount::text,
        d.currency,
        d.donation_date::date::text AS donation_date,
        d.payment_method,
        d.payment_status,
        d.account_id,
        d.contact_id,
        d.campaign_name,
        d.designation
      FROM donations d
      LEFT JOIN tax_receipt_items tri
        ON tri.donation_id = d.id
       AND tri.official_coverage = true
      WHERE ${payeeColumn} = $1
        AND d.donation_date::date >= $2::date
        AND d.donation_date::date <= $3::date
        AND d.payment_status = 'completed'
        AND d.payment_method = ANY($4::text[])
        ${args.includeAlreadyReceipted ? '' : 'AND tri.id IS NULL'}
        ${scopeData.clause}
      ORDER BY d.donation_date ASC, d.created_at ASC
    `;

    const donationsResult = await args.client.query<DonationReceiptRow>(donationQuery, [
      args.payeeId,
      args.dateFrom,
      args.dateTo,
      Array.from(CASH_EQUIVALENT_PAYMENT_METHODS),
      ...scopeData.values,
    ]);

    return donationsResult.rows;
  }
}
