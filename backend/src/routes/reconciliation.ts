/**
 * Payment Reconciliation Routes
 * API endpoints for payment reconciliation system
 */

import express from 'express';
import { z } from 'zod';
import { authenticate } from '@middleware/domains/auth';
import { requireActiveOrganizationContext } from '@middleware/requireActiveOrganizationContext';
import * as reconciliationController from '@controllers/domains/operations';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import { uuidSchema } from '@validations/shared';

const router = express.Router();
router.use(authenticate);
router.use(requireActiveOrganizationContext);
const reconciliationTypeSchema = z.enum(['manual', 'automatic', 'scheduled']);
const reconciliationStatusSchema = z.enum(['in_progress', 'completed', 'failed']);
const discrepancySeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);
const discrepancyStatusSchema = z.enum(['open', 'investigating', 'resolved', 'closed', 'ignored']);
const discrepancyTypeSchema = z.enum([
  'amount_mismatch',
  'missing_donation',
  'missing_stripe_transaction',
  'duplicate',
  'timing',
  'fee_mismatch',
]);
const matchStatusSchema = z.enum([
  'matched',
  'unmatched_stripe',
  'unmatched_donation',
  'amount_mismatch',
  'date_mismatch',
]);
const resolutionStatusSchema = z.enum(['resolved', 'closed', 'ignored']);
const isoDateTimeSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid ISO8601 date');

const reconciliationIdParamsSchema = z.object({
  id: uuidSchema,
});

const createReconciliationSchema = z.object({
  reconciliation_type: reconciliationTypeSchema,
  start_date: isoDateTimeSchema,
  end_date: isoDateTimeSchema,
  notes: z.string().trim().max(5000).optional(),
});

const reconciliationListQuerySchema = z.object({
  status: reconciliationStatusSchema.optional(),
  reconciliation_type: reconciliationTypeSchema.optional(),
  start_date: isoDateTimeSchema.optional(),
  end_date: isoDateTimeSchema.optional(),
  initiated_by: uuidSchema.optional(),
  page: z.coerce.number().int().min(1).max(10000).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const reconciliationItemsQuerySchema = z.object({
  match_status: matchStatusSchema.optional(),
  page: z.coerce.number().int().min(1).max(10000).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const discrepanciesQuerySchema = z.object({
  status: discrepancyStatusSchema.optional(),
  severity: discrepancySeveritySchema.optional(),
  discrepancy_type: discrepancyTypeSchema.optional(),
  assigned_to: uuidSchema.optional(),
  reconciliation_id: uuidSchema.optional(),
  donation_id: uuidSchema.optional(),
  page: z.coerce.number().int().min(1).max(10000).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const manualMatchSchema = z.object({
  donation_id: uuidSchema,
  stripe_payment_intent_id: z.string().trim().min(1).max(255),
});

const resolveDiscrepancySchema = z.object({
  resolution_notes: z.string().trim().min(1).max(5000),
  status: resolutionStatusSchema,
});

const assignDiscrepancySchema = z.object({
  assigned_to: uuidSchema,
  due_date: z.union([isoDateTimeSchema, z.null()]).optional(),
});

/**
 * @route   GET /api/reconciliation/dashboard
 * @desc    Get reconciliation dashboard statistics
 * @access  Private
 */
router.get('/dashboard', reconciliationController.getReconciliationDashboard);

/**
 * @route   POST /api/reconciliation
 * @desc    Create a new payment reconciliation
 * @access  Private
 */
router.post('/', validateBody(createReconciliationSchema), reconciliationController.createReconciliation);

/**
 * @route   GET /api/reconciliation
 * @desc    Get all reconciliations with filtering
 * @access  Private
 */
router.get('/', validateQuery(reconciliationListQuerySchema), reconciliationController.getReconciliations);

/**
 * @route   GET /api/reconciliation/:id
 * @desc    Get reconciliation by ID
 * @access  Private
 */
router.get('/:id', validateParams(reconciliationIdParamsSchema), reconciliationController.getReconciliationById);

/**
 * @route   GET /api/reconciliation/:id/items
 * @desc    Get reconciliation items
 * @access  Private
 */
router.get(
  '/:id/items',
  validateParams(reconciliationIdParamsSchema),
  validateQuery(reconciliationItemsQuerySchema),
  reconciliationController.getReconciliationItems
);

/**
 * @route   GET /api/reconciliation/:id/discrepancies
 * @desc    Get discrepancies for a reconciliation
 * @access  Private
 */
router.get(
  '/:id/discrepancies',
  validateParams(reconciliationIdParamsSchema),
  reconciliationController.getReconciliationDiscrepancies
);

/**
 * @route   GET /api/reconciliation/discrepancies/all
 * @desc    Get all discrepancies with filtering
 * @access  Private
 */
router.get('/discrepancies/all', validateQuery(discrepanciesQuerySchema), reconciliationController.getAllDiscrepancies);

/**
 * @route   POST /api/reconciliation/match
 * @desc    Manually match a donation to a Stripe transaction
 * @access  Private
 */
router.post('/match', validateBody(manualMatchSchema), reconciliationController.manualMatch);

/**
 * @route   PUT /api/reconciliation/discrepancies/:id/resolve
 * @desc    Resolve a discrepancy
 * @access  Private
 */
router.put(
  '/discrepancies/:id/resolve',
  validateParams(reconciliationIdParamsSchema),
  validateBody(resolveDiscrepancySchema),
  reconciliationController.resolveDiscrepancy
);

/**
 * @route   PUT /api/reconciliation/discrepancies/:id/assign
 * @desc    Assign a discrepancy to a user
 * @access  Private
 */
router.put(
  '/discrepancies/:id/assign',
  validateParams(reconciliationIdParamsSchema),
  validateBody(assignDiscrepancySchema),
  reconciliationController.assignDiscrepancy
);

export default router;
