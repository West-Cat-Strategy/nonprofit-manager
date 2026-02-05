/**
 * Donation Controller
 * HTTP handlers for donation management
 */

import { Response, NextFunction } from 'express';
import { services } from '../container/services';
import {
  CreateDonationDTO,
  PaymentMethod,
  PaymentStatus,
  UpdateDonationDTO,
} from '../types/donation';
import { AuthRequest } from '../middleware/auth';
import { extractPagination, getString, getNumber, getBoolean } from '../utils/queryHelpers';
import { notFound } from '../utils/responseHelpers';
import type { DataScopeFilter } from '../types/dataScope';

const donationService = services.donation;

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
      res.json(result);
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

      res.json(donation);
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

      const donation = await donationService.createDonation(donationData, userId);
      res.status(201).json(donation);
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

      const donation = await donationService.updateDonation(req.params.id, donationData, userId);

      if (!donation) {
        notFound(res, 'Donation');
        return;
      }

      res.json(donation);
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
      res.json(donation);
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
      res.json(summary);
    } catch (error) {
      next(error);
    }
  }
}

export default new DonationController();
