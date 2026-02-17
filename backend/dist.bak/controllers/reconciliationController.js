"use strict";
/**
 * Reconciliation Controller
 * HTTP handlers for payment reconciliation operations
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignDiscrepancy = exports.getReconciliationDashboard = exports.resolveDiscrepancy = exports.manualMatch = exports.getAllDiscrepancies = exports.getReconciliationDiscrepancies = exports.getReconciliationItems = exports.getReconciliationById = exports.getReconciliations = exports.createReconciliation = void 0;
const logger_1 = require("../config/logger");
const reconciliationService = __importStar(require("../services/reconciliationService"));
const database_1 = __importDefault(require("../config/database"));
/**
 * Create a new payment reconciliation
 */
const createReconciliation = async (req, res) => {
    try {
        const request = req.body;
        const userId = req.user?.id;
        // Validate date range
        const startDate = new Date(request.start_date);
        const endDate = new Date(request.end_date);
        if (startDate >= endDate) {
            res.status(400).json({ error: 'Start date must be before end date' });
            return;
        }
        if (endDate > new Date()) {
            res.status(400).json({ error: 'End date cannot be in the future' });
            return;
        }
        // Check if Stripe is configured
        if (!reconciliationService.isStripeConfigured()) {
            res.status(503).json({ error: 'Stripe is not configured' });
            return;
        }
        logger_1.logger.info('Creating payment reconciliation', {
            userId,
            startDate,
            endDate,
            type: request.reconciliation_type,
        });
        const reconciliation = await reconciliationService.createReconciliation(request, userId);
        res.status(201).json(reconciliation);
    }
    catch (error) {
        logger_1.logger.error('Error creating reconciliation:', error);
        res.status(500).json({ error: 'Failed to create reconciliation' });
    }
};
exports.createReconciliation = createReconciliation;
/**
 * Get all reconciliations with filtering
 */
const getReconciliations = async (req, res) => {
    try {
        const { status, reconciliation_type, start_date, end_date, initiated_by, page = 1, limit = 20, } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        // Build query
        let query = 'SELECT * FROM payment_reconciliations WHERE 1=1';
        const params = [];
        let paramIndex = 1;
        if (status) {
            query += ` AND status = $${paramIndex++}`;
            params.push(status);
        }
        if (reconciliation_type) {
            query += ` AND reconciliation_type = $${paramIndex++}`;
            params.push(reconciliation_type);
        }
        if (start_date) {
            query += ` AND start_date >= $${paramIndex++}`;
            params.push(start_date);
        }
        if (end_date) {
            query += ` AND end_date <= $${paramIndex++}`;
            params.push(end_date);
        }
        if (initiated_by) {
            query += ` AND initiated_by = $${paramIndex++}`;
            params.push(initiated_by);
        }
        // Get total count
        const countResult = await database_1.default.query(`SELECT COUNT(*) FROM (${query}) AS count_query`, params);
        const total = parseInt(countResult.rows[0].count);
        // Add pagination
        query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
        params.push(limit, offset);
        const result = await database_1.default.query(query, params);
        res.json({
            reconciliations: result.rows,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                total_pages: Math.ceil(total / parseInt(limit)),
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching reconciliations:', error);
        res.status(500).json({ error: 'Failed to fetch reconciliations' });
    }
};
exports.getReconciliations = getReconciliations;
/**
 * Get reconciliation by ID
 */
const getReconciliationById = async (req, res) => {
    try {
        const { id } = req.params;
        const reconciliation = await reconciliationService.getReconciliationById(id);
        const summary = await reconciliationService.getReconciliationSummary(id);
        res.json({
            reconciliation,
            summary,
        });
    }
    catch (error) {
        if (error instanceof Error && error.message === 'Reconciliation not found') {
            res.status(404).json({ error: 'Reconciliation not found' });
            return;
        }
        logger_1.logger.error('Error fetching reconciliation:', error);
        res.status(500).json({ error: 'Failed to fetch reconciliation' });
    }
};
exports.getReconciliationById = getReconciliationById;
/**
 * Get reconciliation items
 */
const getReconciliationItems = async (req, res) => {
    try {
        const { id } = req.params;
        const { match_status, page = 1, limit = 50 } = req.query;
        const items = await reconciliationService.getReconciliationItems(id, match_status);
        // Apply pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const paginatedItems = items.slice(offset, offset + parseInt(limit));
        res.json({
            items: paginatedItems,
            pagination: {
                total: items.length,
                page: parseInt(page),
                limit: parseInt(limit),
                total_pages: Math.ceil(items.length / parseInt(limit)),
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching reconciliation items:', error);
        res.status(500).json({ error: 'Failed to fetch reconciliation items' });
    }
};
exports.getReconciliationItems = getReconciliationItems;
/**
 * Get discrepancies for a reconciliation
 */
const getReconciliationDiscrepancies = async (req, res) => {
    try {
        const { id } = req.params;
        const discrepancies = await reconciliationService.getDiscrepancies(id);
        res.json({ discrepancies });
    }
    catch (error) {
        logger_1.logger.error('Error fetching discrepancies:', error);
        res.status(500).json({ error: 'Failed to fetch discrepancies' });
    }
};
exports.getReconciliationDiscrepancies = getReconciliationDiscrepancies;
/**
 * Get all discrepancies with filtering
 */
const getAllDiscrepancies = async (req, res) => {
    try {
        const { status, severity, discrepancy_type, assigned_to, reconciliation_id, donation_id, page = 1, limit = 20, } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        // Build query
        let query = 'SELECT * FROM payment_discrepancies WHERE 1=1';
        const params = [];
        let paramIndex = 1;
        if (status) {
            query += ` AND status = $${paramIndex++}`;
            params.push(status);
        }
        if (severity) {
            query += ` AND severity = $${paramIndex++}`;
            params.push(severity);
        }
        if (discrepancy_type) {
            query += ` AND discrepancy_type = $${paramIndex++}`;
            params.push(discrepancy_type);
        }
        if (assigned_to) {
            query += ` AND assigned_to = $${paramIndex++}`;
            params.push(assigned_to);
        }
        if (reconciliation_id) {
            query += ` AND reconciliation_id = $${paramIndex++}`;
            params.push(reconciliation_id);
        }
        if (donation_id) {
            query += ` AND donation_id = $${paramIndex++}`;
            params.push(donation_id);
        }
        // Get total count
        const countResult = await database_1.default.query(`SELECT COUNT(*) FROM (${query}) AS count_query`, params);
        const total = parseInt(countResult.rows[0].count);
        // Add pagination and ordering
        query += ` ORDER BY severity DESC, created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
        params.push(limit, offset);
        const result = await database_1.default.query(query, params);
        res.json({
            discrepancies: result.rows,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                total_pages: Math.ceil(total / parseInt(limit)),
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching all discrepancies:', error);
        res.status(500).json({ error: 'Failed to fetch discrepancies' });
    }
};
exports.getAllDiscrepancies = getAllDiscrepancies;
/**
 * Manually match a donation to a Stripe transaction
 */
const manualMatch = async (req, res) => {
    try {
        const { donation_id, stripe_payment_intent_id } = req.body;
        const userId = req.user?.id;
        if (!donation_id || !stripe_payment_intent_id) {
            res.status(400).json({ error: 'donation_id and stripe_payment_intent_id are required' });
            return;
        }
        await reconciliationService.manualMatch(donation_id, stripe_payment_intent_id, userId);
        logger_1.logger.info('Manually matched donation to Stripe transaction', {
            userId,
            donationId: donation_id,
            stripePaymentIntentId: stripe_payment_intent_id,
        });
        res.json({ success: true, message: 'Transaction matched successfully' });
    }
    catch (error) {
        logger_1.logger.error('Error matching transaction:', error);
        res.status(500).json({ error: 'Failed to match transaction' });
    }
};
exports.manualMatch = manualMatch;
/**
 * Resolve a discrepancy
 */
const resolveDiscrepancy = async (req, res) => {
    try {
        const { id } = req.params;
        const { resolution_notes, status } = req.body;
        const userId = req.user?.id;
        if (!resolution_notes || !status) {
            res.status(400).json({ error: 'resolution_notes and status are required' });
            return;
        }
        if (!['resolved', 'closed', 'ignored'].includes(status)) {
            res.status(400).json({ error: 'Invalid status. Must be resolved, closed, or ignored' });
            return;
        }
        await reconciliationService.resolveDiscrepancy(id, status, resolution_notes, userId);
        logger_1.logger.info('Resolved discrepancy', {
            userId,
            discrepancyId: id,
            status,
        });
        res.json({ success: true, message: 'Discrepancy resolved successfully' });
    }
    catch (error) {
        logger_1.logger.error('Error resolving discrepancy:', error);
        res.status(500).json({ error: 'Failed to resolve discrepancy' });
    }
};
exports.resolveDiscrepancy = resolveDiscrepancy;
/**
 * Get reconciliation dashboard statistics
 */
const getReconciliationDashboard = async (_req, res) => {
    try {
        // Get latest reconciliation
        const latestResult = await database_1.default.query(`
      SELECT * FROM payment_reconciliations
      ORDER BY created_at DESC
      LIMIT 1
    `);
        // Get all-time stats
        const statsResult = await database_1.default.query(`
      SELECT
        COUNT(*) as total_reconciliations,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_reconciliations,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_reconciliations,
        SUM(matched_count) as total_matched,
        SUM(discrepancy_count) as total_discrepancies
      FROM payment_reconciliations
    `);
        // Get open discrepancies count
        const discrepanciesResult = await database_1.default.query(`
      SELECT
        COUNT(*) as total_open_discrepancies,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical_discrepancies,
        COUNT(*) FILTER (WHERE severity = 'high') as high_discrepancies
      FROM payment_discrepancies
      WHERE status = 'open'
    `);
        // Get unreconciled donations count
        const unreconciledResult = await database_1.default.query(`
      SELECT COUNT(*) as unreconciled_donations
      FROM donations
      WHERE payment_status = 'completed'
      AND reconciliation_status = 'unreconciled'
    `);
        res.json({
            latest_reconciliation: latestResult.rows[0] || null,
            stats: {
                ...statsResult.rows[0],
                ...discrepanciesResult.rows[0],
                ...unreconciledResult.rows[0],
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching reconciliation dashboard:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
};
exports.getReconciliationDashboard = getReconciliationDashboard;
/**
 * Assign a discrepancy to a user
 */
const assignDiscrepancy = async (req, res) => {
    try {
        const { id } = req.params;
        const { assigned_to, due_date } = req.body;
        if (!assigned_to) {
            res.status(400).json({ error: 'assigned_to is required' });
            return;
        }
        await database_1.default.query(`
      UPDATE payment_discrepancies
      SET assigned_to = $1, due_date = $2, updated_at = NOW()
      WHERE id = $3
    `, [assigned_to, due_date || null, id]);
        logger_1.logger.info('Assigned discrepancy', {
            discrepancyId: id,
            assignedTo: assigned_to,
        });
        res.json({ success: true, message: 'Discrepancy assigned successfully' });
    }
    catch (error) {
        logger_1.logger.error('Error assigning discrepancy:', error);
        res.status(500).json({ error: 'Failed to assign discrepancy' });
    }
};
exports.assignDiscrepancy = assignDiscrepancy;
//# sourceMappingURL=reconciliationController.js.map