"use strict";
/**
 * Payment Reconciliation Routes
 * API endpoints for payment reconciliation system
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
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const reconciliationController = __importStar(require("../controllers/reconciliationController"));
const router = express_1.default.Router();
/**
 * @route   GET /api/reconciliation/dashboard
 * @desc    Get reconciliation dashboard statistics
 * @access  Private
 */
router.get('/dashboard', auth_1.authenticate, reconciliationController.getReconciliationDashboard);
/**
 * @route   POST /api/reconciliation
 * @desc    Create a new payment reconciliation
 * @access  Private
 */
router.post('/', auth_1.authenticate, reconciliationController.createReconciliation);
/**
 * @route   GET /api/reconciliation
 * @desc    Get all reconciliations with filtering
 * @access  Private
 */
router.get('/', auth_1.authenticate, reconciliationController.getReconciliations);
/**
 * @route   GET /api/reconciliation/:id
 * @desc    Get reconciliation by ID
 * @access  Private
 */
router.get('/:id', auth_1.authenticate, reconciliationController.getReconciliationById);
/**
 * @route   GET /api/reconciliation/:id/items
 * @desc    Get reconciliation items
 * @access  Private
 */
router.get('/:id/items', auth_1.authenticate, reconciliationController.getReconciliationItems);
/**
 * @route   GET /api/reconciliation/:id/discrepancies
 * @desc    Get discrepancies for a reconciliation
 * @access  Private
 */
router.get('/:id/discrepancies', auth_1.authenticate, reconciliationController.getReconciliationDiscrepancies);
/**
 * @route   GET /api/reconciliation/discrepancies/all
 * @desc    Get all discrepancies with filtering
 * @access  Private
 */
router.get('/discrepancies/all', auth_1.authenticate, reconciliationController.getAllDiscrepancies);
/**
 * @route   POST /api/reconciliation/match
 * @desc    Manually match a donation to a Stripe transaction
 * @access  Private
 */
router.post('/match', auth_1.authenticate, reconciliationController.manualMatch);
/**
 * @route   PUT /api/reconciliation/discrepancies/:id/resolve
 * @desc    Resolve a discrepancy
 * @access  Private
 */
router.put('/discrepancies/:id/resolve', auth_1.authenticate, reconciliationController.resolveDiscrepancy);
/**
 * @route   PUT /api/reconciliation/discrepancies/:id/assign
 * @desc    Assign a discrepancy to a user
 * @access  Private
 */
router.put('/discrepancies/:id/assign', auth_1.authenticate, reconciliationController.assignDiscrepancy);
exports.default = router;
//# sourceMappingURL=reconciliation.js.map