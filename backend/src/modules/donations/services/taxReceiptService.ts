import { Pool, type PoolClient } from 'pg';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { sendMail } from '@services/emailService';
import type { DataScopeFilter } from '@app-types/dataScope';
import type { OrganizationSettingsConfig } from '@app-types/organizationSettings';
import type {
  IssueAnnualTaxReceiptRequest,
  IssueTaxReceiptRequest,
  IssueTaxReceiptResult,
  TaxReceipt,
  TaxReceiptDeliveryMode,
  TaxReceiptDeliverySummary,
  TaxReceiptKind,
  TaxReceiptPayeeType,
} from '@app-types/taxReceipt';
import { findOrganizationSettings } from '@modules/admin/lib/organizationSettingsStore';

const CASH_EQUIVALENT_PAYMENT_METHODS = new Set([
  'cash',
  'check',
  'credit_card',
  'debit_card',
  'bank_transfer',
  'paypal',
]);

type DonationReceiptRow = {
  donation_id: string;
  donation_number: string;
  amount: string;
  currency: string;
  donation_date: string;
  payment_method: string | null;
  payment_status: string;
  account_id: string | null;
  contact_id: string | null;
  campaign_name: string | null;
  designation: string | null;
};

type PayeeRecord = {
  payeeType: TaxReceiptPayeeType;
  payeeId: string;
  payeeName: string;
  payeeEmail: string | null;
  payeePhone: string | null;
  payeeAddress: {
    line1: string;
    line2: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
};

type TaxReceiptRow = {
  id: string;
  organization_id: string;
  receipt_number: string;
  sequence_year: number;
  sequence_number: number;
  kind: TaxReceiptKind;
  payee_type: TaxReceiptPayeeType;
  payee_id: string;
  payee_name: string;
  payee_email: string | null;
  delivery_mode: TaxReceiptDeliveryMode;
  email_delivery_status: 'not_requested' | 'pending' | 'sent' | 'failed';
  email_sent_at: Date | null;
  email_error: string | null;
  issue_date: string;
  period_start: string | null;
  period_end: string | null;
  include_previously_receipted: boolean;
  is_official: boolean;
  total_amount: string;
  currency: string;
  created_by: string | null;
  modified_by: string | null;
  created_at: Date;
  updated_at: Date;
  pdf_content?: Buffer;
  snapshot?: ReceiptSnapshot;
};

type ReceiptSnapshot = {
  title: string;
  issueDate: string;
  receiptNumber: string;
  periodStart: string | null;
  periodEnd: string | null;
  isOfficial: boolean;
  organization: {
    legalName: string;
    charitableRegistrationNumber: string;
    receiptingAddress: OrganizationSettingsConfig['taxReceipt']['receiptingAddress'];
    receiptIssueLocation: string;
    authorizedSignerName: string;
    authorizedSignerTitle: string;
    contactEmail: string;
    contactPhone: string;
  };
  payee: {
    type: TaxReceiptPayeeType;
    name: string;
    email: string | null;
    address: PayeeRecord['payeeAddress'];
  };
  items: Array<{
    donationId: string;
    donationNumber: string;
    donationDate: string;
    amount: string;
    currency: string;
    campaignName: string | null;
    designation: string | null;
  }>;
  totalAmount: string;
  currency: string;
  notes: string[];
};

const toIsoDate = (value: string | Date): string => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
};

const toNumericAmount = (value: string | number): number => {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeCurrencyAmount = (value: string | number): string => {
  const parsed = toNumericAmount(value);
  if (!Number.isFinite(parsed)) {
    return '0.00';
  }
  return parsed.toFixed(2);
};

const sumCurrencyAmounts = (values: Array<string | number>): string => {
  const total = values.reduce<number>((acc, value) => acc + toNumericAmount(value), 0);
  return total.toFixed(2);
};

const mapReceiptRow = (row: TaxReceiptRow): TaxReceipt => ({
  id: row.id,
  organization_id: row.organization_id,
  receipt_number: row.receipt_number,
  sequence_year: row.sequence_year,
  sequence_number: row.sequence_number,
  kind: row.kind,
  payee_type: row.payee_type,
  payee_id: row.payee_id,
  payee_name: row.payee_name,
  payee_email: row.payee_email,
  delivery_mode: row.delivery_mode,
  email_delivery_status: row.email_delivery_status,
  email_sent_at: row.email_sent_at ? row.email_sent_at.toISOString() : null,
  email_error: row.email_error,
  issue_date: row.issue_date,
  period_start: row.period_start,
  period_end: row.period_end,
  include_previously_receipted: row.include_previously_receipted,
  is_official: row.is_official,
  total_amount: row.total_amount,
  currency: row.currency,
  created_by: row.created_by,
  modified_by: row.modified_by,
  created_at: row.created_at.toISOString(),
  updated_at: row.updated_at.toISOString(),
});

const formatAddressLines = (address: PayeeRecord['payeeAddress']): string[] => {
  const locality = [address.city, address.province, address.postalCode]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ');

  return [address.line1, address.line2, locality, address.country]
    .map((line) => line.trim())
    .filter(Boolean);
};

const buildOfficialReceiptNotes = (
  kind: TaxReceiptKind,
  includePreviouslyReceipted: boolean
): string[] => {
  if (kind === 'annual_summary_reprint') {
    return [
      'Summary copy only. This document does not create new official tax receipt coverage.',
      includePreviouslyReceipted
        ? 'This summary may include donations that were officially receipted previously.'
        : 'This summary does not modify prior official receipt coverage.',
    ];
  }

  if (kind === 'annual_official') {
    return [
      'Official annual cumulative receipt for cash donations within the selected date range.',
    ];
  }

  return ['Official donation receipt for income tax purposes.'];
};

const getMissingOrganizationSettingsFields = (
  config: OrganizationSettingsConfig
): string[] => {
  const missing: string[] = [];
  const tax = config.taxReceipt;

  if (!tax.legalName.trim()) missing.push('taxReceipt.legalName');
  if (!tax.charitableRegistrationNumber.trim()) {
    missing.push('taxReceipt.charitableRegistrationNumber');
  }
  if (!tax.receiptingAddress.line1.trim()) missing.push('taxReceipt.receiptingAddress.line1');
  if (!tax.receiptingAddress.city.trim()) missing.push('taxReceipt.receiptingAddress.city');
  if (!tax.receiptingAddress.province.trim()) {
    missing.push('taxReceipt.receiptingAddress.province');
  }
  if (!tax.receiptingAddress.postalCode.trim()) {
    missing.push('taxReceipt.receiptingAddress.postalCode');
  }
  if (!tax.receiptingAddress.country.trim()) {
    missing.push('taxReceipt.receiptingAddress.country');
  }
  if (!tax.receiptIssueLocation.trim()) missing.push('taxReceipt.receiptIssueLocation');
  if (!tax.authorizedSignerName.trim()) missing.push('taxReceipt.authorizedSignerName');
  if (!tax.authorizedSignerTitle.trim()) missing.push('taxReceipt.authorizedSignerTitle');
  if (!tax.contactEmail.trim()) missing.push('taxReceipt.contactEmail');
  if (!tax.contactPhone.trim()) missing.push('taxReceipt.contactPhone');

  return missing;
};

const getMissingPayeeAddressFields = (payee: PayeeRecord): string[] => {
  const missing: string[] = [];
  if (!payee.payeeAddress.line1.trim()) missing.push('line1');
  if (!payee.payeeAddress.city.trim()) missing.push('city');
  if (!payee.payeeAddress.province.trim()) missing.push('province');
  if (!payee.payeeAddress.postalCode.trim()) missing.push('postalCode');
  if (!payee.payeeAddress.country.trim()) missing.push('country');
  return missing;
};

const buildReceiptFilename = (receipt: TaxReceipt): string => `${receipt.receipt_number}.pdf`;

const eligiblePaymentMethod = (paymentMethod: string | null): boolean =>
  Boolean(paymentMethod && CASH_EQUIVALENT_PAYMENT_METHODS.has(paymentMethod));

const buildScopeConditions = (
  scope: DataScopeFilter | undefined,
  alias = 'd',
  startIndex = 1
): { clause: string; values: Array<string[]>; nextIndex: number } => {
  const clauses: string[] = [];
  const values: Array<string[]> = [];
  let index = startIndex;

  if (scope?.accountIds && scope.accountIds.length > 0) {
    clauses.push(`${alias}.account_id = ANY($${index}::uuid[])`);
    values.push(scope.accountIds);
    index += 1;
  }

  if (scope?.contactIds && scope.contactIds.length > 0) {
    clauses.push(`${alias}.contact_id = ANY($${index}::uuid[])`);
    values.push(scope.contactIds);
    index += 1;
  }

  if (scope?.createdByUserIds && scope.createdByUserIds.length > 0) {
    clauses.push(`${alias}.created_by = ANY($${index}::uuid[])`);
    values.push(scope.createdByUserIds);
    index += 1;
  }

  return {
    clause: clauses.length > 0 ? ` AND ${clauses.join(' AND ')}` : '',
    values,
    nextIndex: index,
  };
};

const drawWrappedText = (
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  width: number,
  font: PDFFont,
  size: number,
  color = rgb(0, 0, 0)
): number => {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    const nextWidth = font.widthOfTextAtSize(next, size);
    if (nextWidth > width && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }

  let currentY = y;
  for (const line of lines) {
    page.drawText(line, { x, y: currentY, size, font, color });
    currentY -= size + 4;
  }

  return currentY;
};

const renderReceiptPdf = async (snapshot: ReceiptSnapshot): Promise<Buffer> => {
  const pdfDoc = await PDFDocument.create();
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([612, 792]);
  let y = 748;

  const ensureSpace = (required = 48) => {
    if (y > required) {
      return;
    }
    page = pdfDoc.addPage([612, 792]);
    y = 748;
  };

  const addLine = (
    text: string,
    options?: { bold?: boolean; size?: number; color?: ReturnType<typeof rgb> }
  ) => {
    ensureSpace();
    const font = options?.bold ? bold : regular;
    const size = options?.size ?? 11;
    y = drawWrappedText(page, text, 48, y, 516, font, size, options?.color ?? rgb(0, 0, 0));
  };

  addLine(snapshot.title, { bold: true, size: 18 });
  y -= 6;
  addLine(`Receipt Number: ${snapshot.receiptNumber}`, { bold: true });
  addLine(`Issue Date: ${snapshot.issueDate}`);
  if (snapshot.periodStart && snapshot.periodEnd) {
    addLine(`Receipt Period: ${snapshot.periodStart} to ${snapshot.periodEnd}`);
  }
  y -= 8;

  addLine('Organization', { bold: true, size: 13 });
  addLine(snapshot.organization.legalName);
  for (const line of formatAddressLines(snapshot.organization.receiptingAddress)) {
    addLine(line);
  }
  addLine(`Charitable Registration Number: ${snapshot.organization.charitableRegistrationNumber}`);
  addLine(`Issue Location: ${snapshot.organization.receiptIssueLocation}`);
  addLine(
    `Authorized Signer: ${snapshot.organization.authorizedSignerName} (${snapshot.organization.authorizedSignerTitle})`
  );
  addLine(
    `Receipt Contact: ${snapshot.organization.contactEmail} | ${snapshot.organization.contactPhone}`
  );
  y -= 8;

  addLine('Donor', { bold: true, size: 13 });
  addLine(snapshot.payee.name);
  for (const line of formatAddressLines(snapshot.payee.address)) {
    addLine(line);
  }
  if (snapshot.payee.email) {
    addLine(snapshot.payee.email);
  }
  y -= 8;

  addLine('Covered Donations', { bold: true, size: 13 });
  for (const item of snapshot.items) {
    ensureSpace(120);
    addLine(`${item.donationDate}  ${item.donationNumber}  ${item.currency} ${item.amount}`, {
      bold: true,
    });
    if (item.campaignName) {
      addLine(`Campaign: ${item.campaignName}`);
    }
    if (item.designation) {
      addLine(`Designation: ${item.designation}`);
    }
    y -= 4;
  }

  y -= 4;
  addLine(`Eligible Amount: ${snapshot.currency} ${snapshot.totalAmount}`, {
    bold: true,
    size: 13,
  });
  y -= 8;

  addLine('Notes', { bold: true, size: 13 });
  for (const note of snapshot.notes) {
    addLine(note, { color: rgb(0.2, 0.2, 0.2) });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
};

export class TaxReceiptService {
  constructor(private readonly pool: Pool) {}

  private async loadOrganizationSettings(
    organizationId: string
  ): Promise<OrganizationSettingsConfig> {
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

  private async resolveSingleDonationDetails(
    donationId: string
  ): Promise<DonationReceiptRow | null> {
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

  private async resolvePayeeRecord(
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

  private selectSingleDonationPayee(
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

  private async findExistingOfficialReceiptForDonation(
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

  private async getReceiptWithPdf(
    receiptId: string,
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

  private async allocateReceiptNumber(
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

  private async insertReceipt(
    client: PoolClient,
    input: {
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
    }
  ): Promise<TaxReceiptRow> {
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

  private async attachReceiptItems(
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

  private async markDonationsReceipted(
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

  private async updateEmailDeliveryStatus(
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

  private buildSnapshot(
    input: {
      receiptNumber: string;
      kind: TaxReceiptKind;
      isOfficial: boolean;
      organizationSettings: OrganizationSettingsConfig;
      payee: PayeeRecord;
      donations: DonationReceiptRow[];
      issueDate: string;
      periodStart: string | null;
      periodEnd: string | null;
      includePreviouslyReceipted: boolean;
    }
  ): ReceiptSnapshot {
    const currency = input.donations[0]?.currency ?? input.organizationSettings.currency;
    return {
      title:
        input.kind === 'annual_summary_reprint'
          ? 'Donation Summary / Reprint'
          : 'Official Donation Receipt for Income Tax Purposes',
      issueDate: input.issueDate,
      receiptNumber: input.receiptNumber,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      isOfficial: input.isOfficial,
      organization: {
        legalName: input.organizationSettings.taxReceipt.legalName,
        charitableRegistrationNumber:
          input.organizationSettings.taxReceipt.charitableRegistrationNumber,
        receiptingAddress: input.organizationSettings.taxReceipt.receiptingAddress,
        receiptIssueLocation: input.organizationSettings.taxReceipt.receiptIssueLocation,
        authorizedSignerName: input.organizationSettings.taxReceipt.authorizedSignerName,
        authorizedSignerTitle: input.organizationSettings.taxReceipt.authorizedSignerTitle,
        contactEmail: input.organizationSettings.taxReceipt.contactEmail,
        contactPhone: input.organizationSettings.taxReceipt.contactPhone,
      },
      payee: {
        type: input.payee.payeeType,
        name: input.payee.payeeName,
        email: input.payee.payeeEmail,
        address: input.payee.payeeAddress,
      },
      items: input.donations.map((donation) => ({
        donationId: donation.donation_id,
        donationNumber: donation.donation_number,
        donationDate: donation.donation_date,
        amount: normalizeCurrencyAmount(donation.amount),
        currency: donation.currency,
        campaignName: donation.campaign_name,
        designation: donation.designation,
      })),
      totalAmount: sumCurrencyAmounts(input.donations.map((donation) => donation.amount)),
      currency,
      notes: buildOfficialReceiptNotes(
        input.kind,
        input.includePreviouslyReceipted
      ),
    };
  }

  private async attemptEmailDelivery(
    receipt: TaxReceiptRow,
    pdfContent: Buffer,
    recipientEmail: string | null,
    payeeName: string
  ): Promise<TaxReceiptDeliverySummary> {
    if (!recipientEmail) {
      await this.updateEmailDeliveryStatus(receipt.id, 'failed', 'No recipient email available');
      return {
        requested: true,
        sent: false,
        status: 'failed',
        recipientEmail,
        warning: 'No recipient email is available for this receipt.',
      };
    }

    const subject =
      receipt.kind === 'annual_summary_reprint'
        ? `Donation summary ${receipt.receipt_number}`
        : `Official donation receipt ${receipt.receipt_number}`;

    const sent = await sendMail({
      to: recipientEmail,
      subject,
      text: [
        `Hello ${payeeName},`,
        '',
        receipt.kind === 'annual_summary_reprint'
          ? 'Please find your donation summary attached.'
          : 'Please find your official donation receipt attached.',
        '',
        `Receipt number: ${receipt.receipt_number}`,
      ].join('\n'),
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
          <p>Hello ${payeeName},</p>
          <p>${
            receipt.kind === 'annual_summary_reprint'
              ? 'Please find your donation summary attached.'
              : 'Please find your official donation receipt attached.'
          }</p>
          <p><strong>Receipt number:</strong> ${receipt.receipt_number}</p>
        </div>
      `,
      attachments: [
        {
          filename: buildReceiptFilename(mapReceiptRow(receipt)),
          content: pdfContent,
          contentType: 'application/pdf',
        },
      ],
    });

    if (sent) {
      await this.updateEmailDeliveryStatus(receipt.id, 'sent', null);
      return {
        requested: true,
        sent: true,
        status: 'sent',
        recipientEmail,
      };
    }

    await this.updateEmailDeliveryStatus(
      receipt.id,
      'failed',
      'Unable to send receipt email with the current SMTP configuration'
    );
    return {
      requested: true,
      sent: false,
      status: 'failed',
      recipientEmail,
      warning: 'The receipt was created, but the email could not be sent.',
    };
  }

  async issueSingleReceipt(args: {
    organizationId: string;
    userId: string;
    donationId: string;
    request: IssueTaxReceiptRequest;
    scope?: DataScopeFilter;
  }): Promise<IssueTaxReceiptResult> {
    const donation = await this.resolveSingleDonationDetails(args.donationId);
    if (!donation) {
      throw new Error('Donation not found');
    }

    if (donation.payment_status !== 'completed') {
      throw new Error('Only completed donations can receive official tax receipts');
    }

    if (!eligiblePaymentMethod(donation.payment_method)) {
      throw new Error('Official tax receipts are only available for cash-equivalent donations');
    }

    if (args.scope) {
      const scopeCheck = buildScopeConditions(args.scope);
      if (scopeCheck.values.length > 0) {
        const scopedResult = await this.pool.query<{ donation_id: string }>(
          `SELECT d.id AS donation_id
           FROM donations d
           WHERE d.id = $1${scopeCheck.clause}`,
          [args.donationId, ...scopeCheck.values]
        );
        if (scopedResult.rowCount === 0) {
          throw new Error('Donation not found');
        }
      }
    }

    const existingReceipt = await this.findExistingOfficialReceiptForDonation(
      args.donationId,
      args.organizationId
    );
    if (existingReceipt) {
      const existingWithPdf = await this.getReceiptWithPdf(existingReceipt.id, args.organizationId);
      if (!existingWithPdf || !existingWithPdf.pdf_content) {
        throw new Error('Existing tax receipt is unavailable');
      }

      const deliveryMode = args.request.deliveryMode ?? 'download';
      let delivery: TaxReceiptDeliverySummary = {
        requested: deliveryMode === 'email' || deliveryMode === 'both',
        sent: false,
        status: existingWithPdf.email_delivery_status,
        recipientEmail: args.request.email ?? existingWithPdf.payee_email,
      };

      if (deliveryMode === 'email' || deliveryMode === 'both') {
        delivery = await this.attemptEmailDelivery(
          existingWithPdf,
          existingWithPdf.pdf_content,
          args.request.email ?? existingWithPdf.payee_email,
          existingWithPdf.payee_name
        );
      }

      return {
        receipt: mapReceiptRow(existingWithPdf),
        coveredDonationIds: [args.donationId],
        delivery,
        reusedExistingReceipt: true,
      };
    }

    const organizationSettings = await this.loadOrganizationSettings(args.organizationId);
    const payeeSelection = this.selectSingleDonationPayee(donation, args.request.payeeType);
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const payee = await this.resolvePayeeRecord(
        client,
        payeeSelection.payeeType,
        payeeSelection.payeeId
      );
      if (!payee) {
        throw new Error('Receipt payee could not be resolved');
      }

      const missingPayeeAddress = getMissingPayeeAddressFields(payee);
      if (missingPayeeAddress.length > 0) {
        throw new Error(
          `Receipt payee address is incomplete: ${missingPayeeAddress.join(', ')}`
        );
      }

      const issueDate = toIsoDate(new Date());
      const receiptAllocation = await this.allocateReceiptNumber(client, args.organizationId);
      const snapshot = this.buildSnapshot({
        receiptNumber: receiptAllocation.receiptNumber,
        kind: 'single_official',
        isOfficial: true,
        organizationSettings,
        payee,
        donations: [donation],
        issueDate,
        periodStart: null,
        periodEnd: null,
        includePreviouslyReceipted: false,
      });
      const pdfContent = await renderReceiptPdf(snapshot);
      const receipt = await this.insertReceipt(client, {
        organizationId: args.organizationId,
        receiptNumber: receiptAllocation.receiptNumber,
        sequenceYear: receiptAllocation.sequenceYear,
        sequenceNumber: receiptAllocation.sequenceNumber,
        kind: 'single_official',
        isOfficial: true,
        payee,
        deliveryMode: args.request.deliveryMode ?? 'download',
        includePreviouslyReceipted: false,
        totalAmount: snapshot.totalAmount,
        currency: donation.currency,
        issueDate,
        periodStart: null,
        periodEnd: null,
        snapshot,
        pdfContent,
        createdBy: args.userId,
      });
      await this.attachReceiptItems(client, receipt.id, [donation], true);
      await this.markDonationsReceipted(client, [donation], args.userId);
      await client.query('COMMIT');

      const storedReceipt = await this.getReceiptWithPdf(receipt.id, args.organizationId);
      if (!storedReceipt || !storedReceipt.pdf_content) {
        throw new Error('Failed to load stored receipt');
      }

      const deliveryMode = args.request.deliveryMode ?? 'download';
      let delivery: TaxReceiptDeliverySummary = {
        requested: deliveryMode === 'email' || deliveryMode === 'both',
        sent: false,
        status:
          deliveryMode === 'email' || deliveryMode === 'both' ? 'pending' : 'not_requested',
        recipientEmail: args.request.email ?? payee.payeeEmail,
      };
      if (delivery.requested) {
        delivery = await this.attemptEmailDelivery(
          storedReceipt,
          storedReceipt.pdf_content,
          args.request.email ?? payee.payeeEmail,
          payee.payeeName
        );
      }

      return {
        receipt: mapReceiptRow(storedReceipt),
        coveredDonationIds: [donation.donation_id],
        delivery,
        reusedExistingReceipt: false,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async issueAnnualReceipt(args: {
    organizationId: string;
    userId: string;
    request: IssueAnnualTaxReceiptRequest;
    scope?: DataScopeFilter;
  }): Promise<IssueTaxReceiptResult> {
    const organizationSettings = await this.loadOrganizationSettings(args.organizationId);
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const payee = await this.resolvePayeeRecord(
        client,
        args.request.payeeType,
        args.request.payeeId
      );
      if (!payee) {
        throw new Error('Receipt payee could not be resolved');
      }

      const missingPayeeAddress = getMissingPayeeAddressFields(payee);
      if (missingPayeeAddress.length > 0) {
        throw new Error(
          `Receipt payee address is incomplete: ${missingPayeeAddress.join(', ')}`
        );
      }

      const scopeData = buildScopeConditions(args.scope, 'd', 5);
      const payeeColumn = args.request.payeeType === 'contact' ? 'd.contact_id' : 'd.account_id';
      const includeAlreadyReceipted = args.request.includeAlreadyReceipted === true;
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
          ${includeAlreadyReceipted ? '' : 'AND tri.id IS NULL'}
          ${scopeData.clause}
        ORDER BY d.donation_date ASC, d.created_at ASC
      `;

      const donationsResult = await client.query<DonationReceiptRow>(donationQuery, [
        args.request.payeeId,
        args.request.dateFrom,
        args.request.dateTo,
        Array.from(CASH_EQUIVALENT_PAYMENT_METHODS),
        ...scopeData.values,
      ]);
      const donations = donationsResult.rows;

      if (donations.length === 0) {
        throw new Error('No eligible donations were found for the selected annual receipt scope');
      }

      const kind: TaxReceiptKind = includeAlreadyReceipted
        ? 'annual_summary_reprint'
        : 'annual_official';
      const issueDate = toIsoDate(new Date());
      const receiptAllocation = await this.allocateReceiptNumber(client, args.organizationId);
      const snapshot = this.buildSnapshot({
        receiptNumber: receiptAllocation.receiptNumber,
        kind,
        isOfficial: kind !== 'annual_summary_reprint',
        organizationSettings,
        payee,
        donations,
        issueDate,
        periodStart: args.request.dateFrom,
        periodEnd: args.request.dateTo,
        includePreviouslyReceipted: includeAlreadyReceipted,
      });
      const pdfContent = await renderReceiptPdf(snapshot);
      const receipt = await this.insertReceipt(client, {
        organizationId: args.organizationId,
        receiptNumber: receiptAllocation.receiptNumber,
        sequenceYear: receiptAllocation.sequenceYear,
        sequenceNumber: receiptAllocation.sequenceNumber,
        kind,
        isOfficial: kind !== 'annual_summary_reprint',
        payee,
        deliveryMode: args.request.deliveryMode ?? 'download',
        includePreviouslyReceipted: includeAlreadyReceipted,
        totalAmount: snapshot.totalAmount,
        currency: donations[0]?.currency ?? organizationSettings.currency,
        issueDate,
        periodStart: args.request.dateFrom,
        periodEnd: args.request.dateTo,
        snapshot,
        pdfContent,
        createdBy: args.userId,
      });
      await this.attachReceiptItems(
        client,
        receipt.id,
        donations,
        kind !== 'annual_summary_reprint'
      );
      if (kind === 'annual_official') {
        await this.markDonationsReceipted(client, donations, args.userId);
      }
      await client.query('COMMIT');

      const storedReceipt = await this.getReceiptWithPdf(receipt.id, args.organizationId);
      if (!storedReceipt || !storedReceipt.pdf_content) {
        throw new Error('Failed to load stored receipt');
      }

      const deliveryMode = args.request.deliveryMode ?? 'download';
      let delivery: TaxReceiptDeliverySummary = {
        requested: deliveryMode === 'email' || deliveryMode === 'both',
        sent: false,
        status:
          deliveryMode === 'email' || deliveryMode === 'both' ? 'pending' : 'not_requested',
        recipientEmail: args.request.email ?? payee.payeeEmail,
      };
      if (delivery.requested) {
        delivery = await this.attemptEmailDelivery(
          storedReceipt,
          storedReceipt.pdf_content,
          args.request.email ?? payee.payeeEmail,
          payee.payeeName
        );
      }

      return {
        receipt: mapReceiptRow(storedReceipt),
        coveredDonationIds:
          kind === 'annual_official'
            ? donations.map((donation) => donation.donation_id)
            : [],
        delivery,
        reusedExistingReceipt: false,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async downloadReceiptPdf(args: {
    organizationId: string;
    receiptId: string;
  }): Promise<{ receipt: TaxReceipt; pdfContent: Buffer; filename: string }> {
    const receipt = await this.getReceiptWithPdf(args.receiptId, args.organizationId);
    if (!receipt || !receipt.pdf_content) {
      throw new Error('Tax receipt not found');
    }

    return {
      receipt: mapReceiptRow(receipt),
      pdfContent: receipt.pdf_content,
      filename: buildReceiptFilename(mapReceiptRow(receipt)),
    };
  }
}
