import { type Pool } from 'pg';
import type { DataScopeFilter } from '@app-types/dataScope';
import type {
  IssueAnnualTaxReceiptRequest,
  IssueTaxReceiptRequest,
  IssueTaxReceiptResult,
  TaxReceipt,
  TaxReceiptDeliveryMode,
  TaxReceiptDeliverySummary,
  TaxReceiptKind,
} from '@app-types/taxReceipt';
import { attemptTaxReceiptEmailDelivery } from './taxReceiptDelivery';
import {
  buildReceiptFilename,
  buildReceiptSnapshot,
  eligiblePaymentMethod,
  getMissingPayeeAddressFields,
  mapReceiptRow,
  toIsoDate,
} from './taxReceiptModels';
import { renderReceiptPdf } from './taxReceiptPdf';
import { TaxReceiptPersistence } from './taxReceiptPersistence';

export class TaxReceiptService {
  private readonly persistence: TaxReceiptPersistence;

  constructor(private readonly pool: Pool) {
    this.persistence = new TaxReceiptPersistence(pool);
  }

  private buildPendingDelivery(
    deliveryMode: TaxReceiptDeliveryMode,
    recipientEmail: string | null
  ): TaxReceiptDeliverySummary {
    const requested = deliveryMode === 'email' || deliveryMode === 'both';
    return {
      requested,
      sent: false,
      status: requested ? 'pending' : 'not_requested',
      recipientEmail,
    };
  }

  private async maybeDeliverReceipt(
    deliveryMode: TaxReceiptDeliveryMode,
    receipt: Parameters<typeof attemptTaxReceiptEmailDelivery>[0]['receipt'],
    pdfContent: Buffer,
    recipientEmail: string | null,
    payeeName: string
  ): Promise<TaxReceiptDeliverySummary> {
    if (deliveryMode !== 'email' && deliveryMode !== 'both') {
      return this.buildPendingDelivery(deliveryMode, recipientEmail);
    }

    return attemptTaxReceiptEmailDelivery({
      receipt,
      pdfContent,
      recipientEmail,
      payeeName,
      updateEmailDeliveryStatus: this.persistence.updateEmailDeliveryStatus.bind(this.persistence),
    });
  }

  async issueSingleReceipt(args: {
    organizationId: string;
    userId: string;
    donationId: string;
    request: IssueTaxReceiptRequest;
    scope?: DataScopeFilter;
  }): Promise<IssueTaxReceiptResult> {
    const donation = await this.persistence.resolveSingleDonationDetails(args.donationId);
    if (!donation) {
      throw new Error('Donation not found');
    }

    if (donation.payment_status !== 'completed') {
      throw new Error('Only completed donations can receive official tax receipts');
    }

    if (!eligiblePaymentMethod(donation.payment_method)) {
      throw new Error('Official tax receipts are only available for cash-equivalent donations');
    }

    const inScope = await this.persistence.ensureDonationInScope(args.donationId, args.scope);
    if (!inScope) {
      throw new Error('Donation not found');
    }

    const existingReceipt = await this.persistence.findExistingOfficialReceiptForDonation(
      args.donationId,
      args.organizationId
    );
    if (existingReceipt) {
      const existingWithPdf = await this.persistence.getReceiptWithPdf(
        existingReceipt.id,
        args.organizationId
      );
      if (!existingWithPdf?.pdf_content) {
        throw new Error('Existing tax receipt is unavailable');
      }

      const deliveryMode = args.request.deliveryMode ?? 'download';
      const requestedRecipient = args.request.email ?? existingWithPdf.payee_email;
      const delivery =
        deliveryMode === 'email' || deliveryMode === 'both'
          ? await this.maybeDeliverReceipt(
              deliveryMode,
              existingWithPdf,
              existingWithPdf.pdf_content,
              requestedRecipient,
              existingWithPdf.payee_name
            )
          : {
              requested: false,
              sent: false,
              status: existingWithPdf.email_delivery_status,
              recipientEmail: requestedRecipient,
            };

      return {
        receipt: mapReceiptRow(existingWithPdf),
        coveredDonationIds: [args.donationId],
        delivery,
        reusedExistingReceipt: true,
      };
    }

    const organizationSettings = await this.persistence.loadOrganizationSettings(args.organizationId);
    const payeeSelection = this.persistence.selectSingleDonationPayee(
      donation,
      args.request.payeeType
    );
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const payee = await this.persistence.resolvePayeeRecord(
        client,
        payeeSelection.payeeType,
        payeeSelection.payeeId
      );
      if (!payee) {
        throw new Error('Receipt payee could not be resolved');
      }

      const missingPayeeAddress = getMissingPayeeAddressFields(payee);
      if (missingPayeeAddress.length > 0) {
        throw new Error(`Receipt payee address is incomplete: ${missingPayeeAddress.join(', ')}`);
      }

      const issueDate = toIsoDate(new Date());
      const receiptAllocation = await this.persistence.allocateReceiptNumber(
        client,
        args.organizationId
      );
      const snapshot = buildReceiptSnapshot({
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
      const receipt = await this.persistence.insertReceipt(client, {
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
      await this.persistence.attachReceiptItems(client, receipt.id, [donation], true);
      await this.persistence.markDonationsReceipted(client, [donation], args.userId);
      await client.query('COMMIT');

      const storedReceipt = await this.persistence.getReceiptWithPdf(receipt.id, args.organizationId);
      if (!storedReceipt?.pdf_content) {
        throw new Error('Failed to load stored receipt');
      }

      const delivery = await this.maybeDeliverReceipt(
        args.request.deliveryMode ?? 'download',
        storedReceipt,
        storedReceipt.pdf_content,
        args.request.email ?? payee.payeeEmail,
        payee.payeeName
      );

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
    const organizationSettings = await this.persistence.loadOrganizationSettings(args.organizationId);
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const payee = await this.persistence.resolvePayeeRecord(
        client,
        args.request.payeeType,
        args.request.payeeId
      );
      if (!payee) {
        throw new Error('Receipt payee could not be resolved');
      }

      const missingPayeeAddress = getMissingPayeeAddressFields(payee);
      if (missingPayeeAddress.length > 0) {
        throw new Error(`Receipt payee address is incomplete: ${missingPayeeAddress.join(', ')}`);
      }

      const includeAlreadyReceipted = args.request.includeAlreadyReceipted === true;
      const donations = await this.persistence.listAnnualReceiptDonations({
        client,
        payeeType: args.request.payeeType,
        payeeId: args.request.payeeId,
        dateFrom: args.request.dateFrom,
        dateTo: args.request.dateTo,
        includeAlreadyReceipted,
        scope: args.scope,
      });

      if (donations.length === 0) {
        throw new Error('No eligible donations were found for the selected annual receipt scope');
      }

      const kind: TaxReceiptKind = includeAlreadyReceipted
        ? 'annual_summary_reprint'
        : 'annual_official';
      const issueDate = toIsoDate(new Date());
      const receiptAllocation = await this.persistence.allocateReceiptNumber(
        client,
        args.organizationId
      );
      const snapshot = buildReceiptSnapshot({
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
      const receipt = await this.persistence.insertReceipt(client, {
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
      await this.persistence.attachReceiptItems(
        client,
        receipt.id,
        donations,
        kind !== 'annual_summary_reprint'
      );
      if (kind === 'annual_official') {
        await this.persistence.markDonationsReceipted(client, donations, args.userId);
      }
      await client.query('COMMIT');

      const storedReceipt = await this.persistence.getReceiptWithPdf(receipt.id, args.organizationId);
      if (!storedReceipt?.pdf_content) {
        throw new Error('Failed to load stored receipt');
      }

      const delivery = await this.maybeDeliverReceipt(
        args.request.deliveryMode ?? 'download',
        storedReceipt,
        storedReceipt.pdf_content,
        args.request.email ?? payee.payeeEmail,
        payee.payeeName
      );

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
    const receipt = await this.persistence.getReceiptWithPdf(args.receiptId, args.organizationId);
    if (!receipt?.pdf_content) {
      throw new Error('Tax receipt not found');
    }

    return {
      receipt: mapReceiptRow(receipt),
      pdfContent: receipt.pdf_content,
      filename: buildReceiptFilename(mapReceiptRow(receipt)),
    };
  }
}
