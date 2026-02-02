/**
 * Contact Routes
 * API routes for contact management
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  getContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
} from '../controllers/contactController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/contacts
 * Get all contacts with filtering and pagination
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('sort_by').optional().isString(),
    query('sort_order').optional().isIn(['asc', 'desc']),
    query('search').optional().isString(),
    query('account_id').optional().isUUID(),
    query('contact_role').optional().isIn(['primary', 'billing', 'technical', 'general']),
    query('is_active').optional().isBoolean(),
  ],
  getContacts
);

/**
 * GET /api/contacts/:id
 * Get contact by ID
 */
router.get('/:id', [param('id').isUUID()], getContactById);

/**
 * POST /api/contacts
 * Create new contact
 */
router.post(
  '/',
  [
    body('account_id').optional().isUUID(),
    body('contact_role').optional().isIn(['primary', 'billing', 'technical', 'general']),
    body('first_name').notEmpty().trim().isLength({ min: 1, max: 100 }),
    body('last_name').notEmpty().trim().isLength({ min: 1, max: 100 }),
    body('middle_name').optional().isString().trim(),
    body('salutation').optional().isString().trim(),
    body('suffix').optional().isString().trim(),
    body('email').optional().isEmail().normalizeEmail(),
    body('phone').optional().isString().trim(),
    body('mobile_phone').optional().isString().trim(),
    body('address_line1').optional().isString().trim(),
    body('address_line2').optional().isString().trim(),
    body('city').optional().isString().trim(),
    body('state_province').optional().isString().trim(),
    body('postal_code').optional().isString().trim(),
    body('country').optional().isString().trim(),
    body('job_title').optional().isString().trim(),
    body('department').optional().isString().trim(),
    body('preferred_contact_method').optional().isString().trim(),
    body('do_not_email').optional().isBoolean(),
    body('do_not_phone').optional().isBoolean(),
    body('notes').optional().isString().trim(),
  ],
  createContact
);

/**
 * PUT /api/contacts/:id
 * Update contact
 */
router.put(
  '/:id',
  [
    param('id').isUUID(),
    body('account_id').optional().isUUID(),
    body('contact_role').optional().isIn(['primary', 'billing', 'technical', 'general']),
    body('first_name').optional().notEmpty().trim().isLength({ min: 1, max: 100 }),
    body('last_name').optional().notEmpty().trim().isLength({ min: 1, max: 100 }),
    body('middle_name').optional().isString().trim(),
    body('salutation').optional().isString().trim(),
    body('suffix').optional().isString().trim(),
    body('email').optional().isEmail().normalizeEmail(),
    body('phone').optional().isString().trim(),
    body('mobile_phone').optional().isString().trim(),
    body('address_line1').optional().isString().trim(),
    body('address_line2').optional().isString().trim(),
    body('city').optional().isString().trim(),
    body('state_province').optional().isString().trim(),
    body('postal_code').optional().isString().trim(),
    body('country').optional().isString().trim(),
    body('job_title').optional().isString().trim(),
    body('department').optional().isString().trim(),
    body('preferred_contact_method').optional().isString().trim(),
    body('do_not_email').optional().isBoolean(),
    body('do_not_phone').optional().isBoolean(),
    body('notes').optional().isString().trim(),
    body('is_active').optional().isBoolean(),
  ],
  updateContact
);

/**
 * DELETE /api/contacts/:id
 * Soft delete contact
 */
router.delete('/:id', [param('id').isUUID()], deleteContact);

export default router;
