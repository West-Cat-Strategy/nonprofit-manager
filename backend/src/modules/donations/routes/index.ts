/**
 * Donation Routes
 * API endpoints for donation management
 */

import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '@middleware/zodValidation';
import { donationController } from '../controllers';
import { authenticate } from '@middleware/domains/auth';
import { loadDataScope } from '@middleware/domains/data';
import {
  createDonationSchema,
  createDonationBatchSchema,
  issueAnnualTaxReceiptSchema,
  issueTaxReceiptSchema,
  updateDonationSchema,
  uuidSchema,
} from '@validations/donation';
import { z } from 'zod';
import { piiFieldAccessControl } from '@middleware/piiFieldAccessControl';
import { services } from '@container/services';
import { requirePermission } from '@middleware/permissions';
import { Permission } from '@utils/permissions';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(loadDataScope('donations'));

/**
 * GET /api/donations
 * Get all donations with filtering and pagination
 */
router.get(
  '/',
  validateQuery(z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    payment_method: z.enum(['cash', 'check', 'credit_card', 'debit_card', 'bank_transfer', 'paypal', 'stock', 'in_kind', 'other']).optional(),
    payment_status: z.enum(['pending', 'completed', 'failed', 'refunded', 'cancelled']).optional(),
    appeal_campaign_id: uuidSchema.optional(),
    campaign_name: z.string().trim().min(1).max(255).optional(),
    is_recurring: z.boolean().optional(),
    min_amount: z.coerce.number().nonnegative().optional(),
    max_amount: z.coerce.number().nonnegative().optional(),
  })),
  requirePermission(Permission.DONATION_VIEW),
  piiFieldAccessControl(services.pii, 'donations'),
  donationController.getDonations
);

router.post(
  '/annual-tax-receipts',
  validateBody(issueAnnualTaxReceiptSchema),
  requirePermission(Permission.DONATION_EDIT),
  donationController.issueAnnualTaxReceipt
);

router.get(
  '/tax-receipts/:receiptId/pdf',
  validateParams(z.object({ receiptId: uuidSchema })),
  requirePermission(Permission.DONATION_VIEW),
  donationController.downloadTaxReceiptPdf
);

/**
 * GET /api/donations/summary
 * Get donation summary
 */
router.get('/summary', requirePermission(Permission.DONATION_VIEW), donationController.getDonationSummary);

router.get(
  '/designations',
  validateQuery(z.object({ include_inactive: z.enum(['true', 'false']).optional() })),
  requirePermission(Permission.DONATION_VIEW),
  donationController.listDesignations
);

router.get('/batches', requirePermission(Permission.DONATION_VIEW), donationController.listDonationBatches);

router.post(
  '/batches',
  validateBody(createDonationBatchSchema),
  requirePermission(Permission.DONATION_CREATE),
  donationController.createDonationBatch
);

router.get(
  '/batches/:batchId',
  validateParams(z.object({ batchId: uuidSchema })),
  requirePermission(Permission.DONATION_VIEW),
  donationController.getDonationBatch
);

router.post(
  '/batches/:batchId/:action',
  validateParams(
    z.object({
      batchId: uuidSchema,
      action: z.enum(['close', 'reopen', 'approve', 'post']),
    })
  ),
  requirePermission(Permission.DONATION_EDIT),
  donationController.transitionDonationBatch
);

/**
 * GET /api/donations/:id
 * Get donation by ID
 */
router.get(
  '/:id',
  validateParams(z.object({ id: uuidSchema })),
  requirePermission(Permission.DONATION_VIEW),
  piiFieldAccessControl(services.pii, 'donations'),
  donationController.getDonationById
);

router.post(
  '/:id/tax-receipts',
  validateParams(z.object({ id: uuidSchema })),
  validateBody(issueTaxReceiptSchema),
  requirePermission(Permission.DONATION_EDIT),
  donationController.issueTaxReceipt
);

/**
 * POST /api/donations
 * Create new donation
 */
router.post(
  '/',
  validateBody(createDonationSchema),
  requirePermission(Permission.DONATION_CREATE),
  piiFieldAccessControl(services.pii, 'donations'),
  donationController.createDonation
);

/**
 * PUT /api/donations/:id
 * Update donation
 */
router.put(
  '/:id',
  validateParams(z.object({ id: uuidSchema })),
  validateBody(updateDonationSchema),
  requirePermission(Permission.DONATION_EDIT),
  piiFieldAccessControl(services.pii, 'donations'),
  donationController.updateDonation
);

/**
 * DELETE /api/donations/:id
 * Delete donation
 */
router.delete(
  '/:id',
  validateParams(z.object({ id: uuidSchema })),
  requirePermission(Permission.DONATION_DELETE),
  donationController.deleteDonation
);

/**
 * POST /api/donations/:id/receipt
 * Mark receipt as sent
 */
router.post(
  '/:id/receipt',
  validateParams(z.object({ id: uuidSchema })),
  requirePermission(Permission.DONATION_EDIT),
  donationController.markReceiptSent
);

export default router;

export const createDonationsRoutes = () => router;

export const donationsV2Routes = createDonationsRoutes();
