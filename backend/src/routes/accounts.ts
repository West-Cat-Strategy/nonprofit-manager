/**
 * Account Routes
 * API routes for account management
 */

import { Router } from 'express';
import { z } from 'zod';
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
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import { uuidSchema } from '@validations/shared';

const router = Router();

const accountTypeSchema = z.enum(['organization', 'individual']);
const accountCategorySchema = z.enum(['donor', 'volunteer', 'partner', 'vendor', 'beneficiary', 'other']);
const sortOrderSchema = z.enum(['asc', 'desc']);

const accountIdParamsSchema = z.object({
  id: uuidSchema,
});

const accountQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sort_by: z.string().optional(),
  sort_order: sortOrderSchema.optional(),
  search: z.string().optional(),
  account_type: accountTypeSchema.optional(),
  category: accountCategorySchema.optional(),
  is_active: z.coerce.boolean().optional(),
});

const createAccountSchema = z.object({
  account_name: z.string().trim().min(1).max(255),
  account_type: accountTypeSchema,
  category: accountCategorySchema.optional(),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  website: z.string().trim().optional(),
  description: z.string().trim().optional(),
  address_line1: z.string().trim().optional(),
  address_line2: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state_province: z.string().trim().optional(),
  postal_code: z.string().trim().optional(),
  country: z.string().trim().optional(),
  tax_id: z.string().trim().optional(),
});

const updateAccountSchema = z.object({
  account_name: z.string().trim().min(1).max(255).optional(),
  account_type: accountTypeSchema.optional(),
  category: accountCategorySchema.optional(),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  website: z.string().trim().optional(),
  description: z.string().trim().optional(),
  address_line1: z.string().trim().optional(),
  address_line2: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state_province: z.string().trim().optional(),
  postal_code: z.string().trim().optional(),
  country: z.string().trim().optional(),
  tax_id: z.string().trim().optional(),
  is_active: z.coerce.boolean().optional(),
});

// All routes require authentication
router.use(authenticate);
router.use(loadDataScope('accounts'));

/**
 * GET /api/accounts
 * Get all accounts with filtering and pagination
 */
router.get('/', validateQuery(accountQuerySchema), getAccounts);

/**
 * GET /api/accounts/:id
 * Get account by ID
 */
router.get('/:id', validateParams(accountIdParamsSchema), getAccountById);

/**
 * GET /api/accounts/:id/contacts
 * Get contacts for an account
 */
router.get('/:id/contacts', validateParams(accountIdParamsSchema), getAccountContacts);

/**
 * POST /api/accounts
 * Create new account
 */
router.post('/', validateBody(createAccountSchema), createAccount);

/**
 * PUT /api/accounts/:id
 * Update account
 */
router.put('/:id', validateParams(accountIdParamsSchema), validateBody(updateAccountSchema), updateAccount);

/**
 * DELETE /api/accounts/:id
 * Soft delete account
 */
router.delete('/:id', validateParams(accountIdParamsSchema), deleteAccount);

export default router;
