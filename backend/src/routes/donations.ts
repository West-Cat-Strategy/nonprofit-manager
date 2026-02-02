/**
 * Donation Routes
 * API endpoints for donation management
 */

import { Router } from 'express';
import { body, query } from 'express-validator';
import donationController from '../controllers/donationController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Validation rules
const createDonationValidation = [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
  body('donation_date').isISO8601().withMessage('Invalid donation date'),
  body('payment_method')
    .optional()
    .isIn(['cash', 'check', 'credit_card', 'debit_card', 'bank_transfer', 'paypal', 'stock', 'in_kind', 'other'])
    .withMessage('Invalid payment method'),
  body('payment_status')
    .optional()
    .isIn(['pending', 'completed', 'failed', 'refunded', 'cancelled'])
    .withMessage('Invalid payment status'),
  body('account_id').optional().isUUID().withMessage('Invalid account ID'),
  body('contact_id').optional().isUUID().withMessage('Invalid contact ID'),
  body('is_recurring').optional().isBoolean().withMessage('is_recurring must be boolean'),
  body('recurring_frequency')
    .optional()
    .isIn(['weekly', 'monthly', 'quarterly', 'annually', 'one_time'])
    .withMessage('Invalid recurring frequency'),
];

const updateDonationValidation = [
  body('amount').optional().isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
  body('donation_date').optional().isISO8601().withMessage('Invalid donation date'),
  body('payment_method')
    .optional()
    .isIn(['cash', 'check', 'credit_card', 'debit_card', 'bank_transfer', 'paypal', 'stock', 'in_kind', 'other'])
    .withMessage('Invalid payment method'),
  body('payment_status')
    .optional()
    .isIn(['pending', 'completed', 'failed', 'refunded', 'cancelled'])
    .withMessage('Invalid payment status'),
  body('account_id').optional().isUUID().withMessage('Invalid account ID'),
  body('contact_id').optional().isUUID().withMessage('Invalid contact ID'),
  body('is_recurring').optional().isBoolean().withMessage('is_recurring must be boolean'),
  body('recurring_frequency')
    .optional()
    .isIn(['weekly', 'monthly', 'quarterly', 'annually', 'one_time'])
    .withMessage('Invalid recurring frequency'),
  body('receipt_sent').optional().isBoolean().withMessage('receipt_sent must be boolean'),
];

const donationQueryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('payment_method')
    .optional()
    .isIn(['cash', 'check', 'credit_card', 'debit_card', 'bank_transfer', 'paypal', 'stock', 'in_kind', 'other'])
    .withMessage('Invalid payment method'),
  query('payment_status')
    .optional()
    .isIn(['pending', 'completed', 'failed', 'refunded', 'cancelled'])
    .withMessage('Invalid payment status'),
  query('is_recurring').optional().isBoolean().withMessage('is_recurring must be boolean'),
  query('min_amount').optional().isFloat({ min: 0 }).withMessage('min_amount must be non-negative'),
  query('max_amount').optional().isFloat({ min: 0 }).withMessage('max_amount must be non-negative'),
];

// Donation routes
router.get('/', authenticate, donationQueryValidation, donationController.getDonations);
router.get('/summary', authenticate, donationController.getDonationSummary);
router.get('/:id', authenticate, donationController.getDonationById);
router.post('/', authenticate, createDonationValidation, donationController.createDonation);
router.put('/:id', authenticate, updateDonationValidation, donationController.updateDonation);
router.delete('/:id', authenticate, donationController.deleteDonation);
router.post('/:id/receipt', authenticate, donationController.markReceiptSent);

export default router;
