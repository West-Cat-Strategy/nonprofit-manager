/**
 * Donation Controller
 * HTTP handlers for donation management
 */

import { Response, NextFunction } from 'express';
import { services } from '@container/services';
import {
  CreateDonationDTO,
  PaymentMethod,
  PaymentStatus,
  UpdateDonationDTO,
} from '@app-types/donation';
import type {
  IssueAnnualTaxReceiptRequest,
  IssueTaxReceiptRequest,
} from '@app-types/taxReceipt';
import { AuthRequest } from '@middleware/auth';
import { extractPagination, getString, getNumber, getBoolean } from '@utils/queryHelpers';
import { notFound } from '@utils/responseHelpers';
import type { DataScopeFilter } from '@app-types/dataScope';
import { sendError, sendSuccess } from '@modules/shared/http/envelope';
import { requireActiveOrganizationSafe } from '@services/authGuardService';

const donationService = services.donation;
const donationDesignationService = services.donationDesignation;
const taxReceiptService = services.taxReceipt;

export class DonationController {
  /**
   * Get all donations
   */
  async getDonations(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        search: getString(req.query.search),
        account_id: getString(req.query.account_id),
        contact_id: getString(req.query.contact_id),
        payment_method: getString(req.query.payment_method) as PaymentMethod | undefined,
        payment_status: getString(req.query.payment_status) as PaymentStatus | undefined,
        campaign_name: getString(req.query.campaign_name),
        is_recurring: getBoolean(req.query.is_recurring),
        min_amount: getNumber(req.query.min_amount),
        max_amount: getNumber(req.query.max_amount),
        start_date: getString(req.query.start_date),
        end_date: getString(req.query.end_date),
      };

      const pagination = extractPagination(req.query);

      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      const result = await donationService.getDonations(filters, pagination, scope);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get donation by ID
   */
  async getDonationById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      const donation = await donationService.getDonationById(req.params.id, scope);
      
      if (!donation) {
        notFound(res, 'Donation');
        return;
      }

      sendSuccess(res, donation);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new donation
   */
  async createDonation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const donationData: CreateDonationDTO = req.body;
      const userId = req.user!.id;

      const donation = await donationService.createDonation(
        donationData,
        userId,
        req.organizationId || req.accountId || req.tenantId || null
      );
      sendSuccess(res, donation, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update donation
   */
  async updateDonation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const donationData: UpdateDonationDTO = req.body;
      const userId = req.user!.id;

      const donation = await donationService.updateDonation(
        req.params.id,
        donationData,
        userId,
        req.organizationId || req.accountId || req.tenantId || null
      );

      if (!donation) {
        notFound(res, 'Donation');
        return;
      }

      sendSuccess(res, donation);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete donation
   */
  async deleteDonation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const deleted = await donationService.deleteDonation(req.params.id);

      if (!deleted) {
        notFound(res, 'Donation');
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark receipt as sent
   */
  async markReceiptSent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const donation = await donationService.markReceiptSent(req.params.id, userId);
      sendSuccess(res, donation);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get donation summary statistics
   */
  async getDonationSummary(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        account_id: getString(req.query.account_id),
        contact_id: getString(req.query.contact_id),
        start_date: getString(req.query.start_date),
        end_date: getString(req.query.end_date),
      };

      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      const summary = await donationService.getDonationSummary(filters, scope);
      sendSuccess(res, summary);
    } catch (error) {
      next(error);
    }
  }

  async listDesignations(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgResult = await requireActiveOrganizationSafe(req);
      if (!orgResult.ok) {
        sendError(
          res,
          orgResult.error.code.toUpperCase(),
          orgResult.error.message,
          orgResult.error.statusCode,
          undefined,
          req.correlationId
        );
        return;
      }

      const includeInactive = req.query.include_inactive === 'true';
      const designations = await donationDesignationService.listDesignations(
        orgResult.data.organizationId,
        includeInactive
      );
      sendSuccess(res, designations);
    } catch (error) {
      next(error);
    }
  }

  async issueTaxReceipt(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgResult = await requireActiveOrganizationSafe(req);
      if (!orgResult.ok) {
        sendError(
          res,
          orgResult.error.code.toUpperCase(),
          orgResult.error.message,
          orgResult.error.statusCode,
          undefined,
          req.correlationId
        );
        return;
      }

      const result = await taxReceiptService.issueSingleReceipt({
        organizationId: orgResult.data.organizationId,
        userId: req.user!.id,
        donationId: req.params.id,
        request: req.body as IssueTaxReceiptRequest,
        scope: req.dataScope?.filter as DataScopeFilter | undefined,
      });

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async issueAnnualTaxReceipt(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const orgResult = await requireActiveOrganizationSafe(req);
      if (!orgResult.ok) {
        sendError(
          res,
          orgResult.error.code.toUpperCase(),
          orgResult.error.message,
          orgResult.error.statusCode,
          undefined,
          req.correlationId
        );
        return;
      }

      const result = await taxReceiptService.issueAnnualReceipt({
        organizationId: orgResult.data.organizationId,
        userId: req.user!.id,
        request: req.body as IssueAnnualTaxReceiptRequest,
        scope: req.dataScope?.filter as DataScopeFilter | undefined,
      });

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async downloadTaxReceiptPdf(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const orgResult = await requireActiveOrganizationSafe(req);
      if (!orgResult.ok) {
        sendError(
          res,
          orgResult.error.code.toUpperCase(),
          orgResult.error.message,
          orgResult.error.statusCode,
          undefined,
          req.correlationId
        );
        return;
      }

      const result = await taxReceiptService.downloadReceiptPdf({
        organizationId: orgResult.data.organizationId,
        receiptId: req.params.receiptId,
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.pdfContent);
    } catch (error) {
      next(error);
    }
  }
}

export default new DonationController();
