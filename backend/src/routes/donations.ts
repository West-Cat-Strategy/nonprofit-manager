/**
 * Donation Routes
 * API endpoints for donation management
 */

import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '@middleware/zodValidation';
import { donationController } from '@controllers/domains/engagement';
import { authenticate } from '@middleware/domains/auth';
import { loadDataScope } from '@middleware/domains/data';
import {
  createDonationSchema,
  updateDonationSchema,
  uuidSchema,
} from '@validations/donation';
import { z } from 'zod';

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
    is_recurring: z.boolean().optional(),
    min_amount: z.coerce.number().nonnegative().optional(),
    max_amount: z.coerce.number().nonnegative().optional(),
  })),
  donationController.getDonations
);

/**
 * GET /api/donations/summary
 * Get donation summary
 */
router.get('/summary', donationController.getDonationSummary);

/**
 * GET /api/donations/:id
 * Get donation by ID
 */
router.get(
  '/:id',
  validateParams(z.object({ id: uuidSchema })),
  donationController.getDonationById
);

/**
 * POST /api/donations
 * Create new donation
 */
router.post(
  '/',
  validateBody(createDonationSchema),
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
  donationController.updateDonation
);

/**
 * DELETE /api/donations/:id
 * Delete donation
 */
router.delete(
  '/:id',
  validateParams(z.object({ id: uuidSchema })),
  donationController.deleteDonation
);

/**
 * POST /api/donations/:id/receipt
 * Mark receipt as sent
 */
router.post(
  '/:id/receipt',
  validateParams(z.object({ id: uuidSchema })),
  donationController.markReceiptSent
);

export default router;
