/**
 * Payment Reconciliation Routes
 * API endpoints for payment reconciliation system
 */

import express from 'express';
import { authenticate } from '@middleware/domains/auth';
import * as reconciliationController from '@controllers/domains/operations';

const router = express.Router();

/**
 * @route   GET /api/reconciliation/dashboard
 * @desc    Get reconciliation dashboard statistics
 * @access  Private
 */
router.get('/dashboard', authenticate, reconciliationController.getReconciliationDashboard);

/**
 * @route   POST /api/reconciliation
 * @desc    Create a new payment reconciliation
 * @access  Private
 */
router.post('/', authenticate, reconciliationController.createReconciliation);

/**
 * @route   GET /api/reconciliation
 * @desc    Get all reconciliations with filtering
 * @access  Private
 */
router.get('/', authenticate, reconciliationController.getReconciliations);

/**
 * @route   GET /api/reconciliation/:id
 * @desc    Get reconciliation by ID
 * @access  Private
 */
router.get('/:id', authenticate, reconciliationController.getReconciliationById);

/**
 * @route   GET /api/reconciliation/:id/items
 * @desc    Get reconciliation items
 * @access  Private
 */
router.get('/:id/items', authenticate, reconciliationController.getReconciliationItems);

/**
 * @route   GET /api/reconciliation/:id/discrepancies
 * @desc    Get discrepancies for a reconciliation
 * @access  Private
 */
router.get('/:id/discrepancies', authenticate, reconciliationController.getReconciliationDiscrepancies);

/**
 * @route   GET /api/reconciliation/discrepancies/all
 * @desc    Get all discrepancies with filtering
 * @access  Private
 */
router.get('/discrepancies/all', authenticate, reconciliationController.getAllDiscrepancies);

/**
 * @route   POST /api/reconciliation/match
 * @desc    Manually match a donation to a Stripe transaction
 * @access  Private
 */
router.post('/match', authenticate, reconciliationController.manualMatch);

/**
 * @route   PUT /api/reconciliation/discrepancies/:id/resolve
 * @desc    Resolve a discrepancy
 * @access  Private
 */
router.put('/discrepancies/:id/resolve', authenticate, reconciliationController.resolveDiscrepancy);

/**
 * @route   PUT /api/reconciliation/discrepancies/:id/assign
 * @desc    Assign a discrepancy to a user
 * @access  Private
 */
router.put('/discrepancies/:id/assign', authenticate, reconciliationController.assignDiscrepancy);

export default router;
