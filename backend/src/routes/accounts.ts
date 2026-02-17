/**
 * Account Routes
 * API routes for account management
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  getAccounts,
  getAccountById,
  getAccountContacts,
  createAccount,
  updateAccount,
  deleteAccount,
} from '@controllers/domains/engagement';
import { authenticate } from '@middleware/domains/auth';
import { loadDataScope } from '@middleware/domains/data';
import { validateRequest } from '@middleware/domains/security';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(loadDataScope('accounts'));

/**
 * GET /api/accounts
 * Get all accounts with filtering and pagination
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('sort_by').optional().isString(),
    query('sort_order').optional().isIn(['asc', 'desc']),
    query('search').optional().isString(),
    query('account_type').optional().isIn(['organization', 'individual']),
    query('category')
      .optional()
      .isIn(['donor', 'volunteer', 'partner', 'vendor', 'beneficiary', 'other']),
    query('is_active').optional().isBoolean(),
  ],
  validateRequest,
  getAccounts
);

/**
 * GET /api/accounts/:id
 * Get account by ID
 */
router.get('/:id', [param('id').isUUID()], validateRequest, getAccountById);

/**
 * GET /api/accounts/:id/contacts
 * Get contacts for an account
 */
router.get('/:id/contacts', [param('id').isUUID()], validateRequest, getAccountContacts);

/**
 * POST /api/accounts
 * Create new account
 */
router.post(
  '/',
  [
    body('account_name').notEmpty().trim().isLength({ min: 1, max: 255 }),
    body('account_type').isIn(['organization', 'individual']),
    body('category').optional().isIn(['donor', 'volunteer', 'partner', 'vendor', 'beneficiary', 'other']),
    // Keep validation light; frontend already validates.
    body('email').optional().isString().trim(),
    body('phone').optional().isString().trim(),
    body('website').optional().isString().trim(),
    body('description').optional().isString().trim(),
    body('address_line1').optional().isString().trim(),
    body('address_line2').optional().isString().trim(),
    body('city').optional().isString().trim(),
    body('state_province').optional().isString().trim(),
    body('postal_code').optional().isString().trim(),
    body('country').optional().isString().trim(),
    body('tax_id').optional().isString().trim(),
  ],
  validateRequest,
  createAccount
);

/**
 * PUT /api/accounts/:id
 * Update account
 */
router.put(
  '/:id',
  [
    param('id').isUUID(),
    body('account_name').optional().notEmpty().trim().isLength({ min: 1, max: 255 }),
    body('account_type').optional().isIn(['organization', 'individual']),
    body('category')
      .optional()
      .isIn(['donor', 'volunteer', 'partner', 'vendor', 'beneficiary', 'other']),
    body('email').optional().isString().trim(),
    body('phone').optional().isString().trim(),
    body('website').optional().isString().trim(),
    body('description').optional().isString().trim(),
    body('address_line1').optional().isString().trim(),
    body('address_line2').optional().isString().trim(),
    body('city').optional().isString().trim(),
    body('state_province').optional().isString().trim(),
    body('postal_code').optional().isString().trim(),
    body('country').optional().isString().trim(),
    body('tax_id').optional().isString().trim(),
    body('is_active').optional().isBoolean(),
  ],
  validateRequest,
  updateAccount
);

/**
 * DELETE /api/accounts/:id
 * Soft delete account
 */
router.delete('/:id', [param('id').isUUID()], validateRequest, deleteAccount);

export default router;
