"use strict";
/**
 * Account Routes
 * API routes for account management
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const accountController_1 = require("../controllers/accountController");
const auth_1 = require("../middleware/auth");
const dataScope_1 = require("../middleware/dataScope");
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
router.use((0, dataScope_1.loadDataScope)('accounts'));
/**
 * GET /api/accounts
 * Get all accounts with filtering and pagination
 */
router.get('/', [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).toInt(),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    (0, express_validator_1.query)('sort_by').optional().isString(),
    (0, express_validator_1.query)('sort_order').optional().isIn(['asc', 'desc']),
    (0, express_validator_1.query)('search').optional().isString(),
    (0, express_validator_1.query)('account_type').optional().isIn(['organization', 'individual']),
    (0, express_validator_1.query)('category')
        .optional()
        .isIn(['donor', 'volunteer', 'partner', 'vendor', 'beneficiary', 'other']),
    (0, express_validator_1.query)('is_active').optional().isBoolean(),
], validation_1.handleValidationErrors, accountController_1.getAccounts);
/**
 * GET /api/accounts/:id
 * Get account by ID
 */
router.get('/:id', [(0, express_validator_1.param)('id').isUUID()], validation_1.handleValidationErrors, accountController_1.getAccountById);
/**
 * GET /api/accounts/:id/contacts
 * Get contacts for an account
 */
router.get('/:id/contacts', [(0, express_validator_1.param)('id').isUUID()], validation_1.handleValidationErrors, accountController_1.getAccountContacts);
/**
 * POST /api/accounts
 * Create new account
 */
router.post('/', [
    (0, express_validator_1.body)('account_name').notEmpty().trim().isLength({ min: 1, max: 255 }),
    (0, express_validator_1.body)('account_type').isIn(['organization', 'individual']),
    (0, express_validator_1.body)('category').optional().isIn(['donor', 'volunteer', 'partner', 'vendor', 'beneficiary', 'other']),
    // Keep validation light; frontend already validates.
    (0, express_validator_1.body)('email').optional().isString().trim(),
    (0, express_validator_1.body)('phone').optional().isString().trim(),
    (0, express_validator_1.body)('website').optional().isString().trim(),
    (0, express_validator_1.body)('description').optional().isString().trim(),
    (0, express_validator_1.body)('address_line1').optional().isString().trim(),
    (0, express_validator_1.body)('address_line2').optional().isString().trim(),
    (0, express_validator_1.body)('city').optional().isString().trim(),
    (0, express_validator_1.body)('state_province').optional().isString().trim(),
    (0, express_validator_1.body)('postal_code').optional().isString().trim(),
    (0, express_validator_1.body)('country').optional().isString().trim(),
    (0, express_validator_1.body)('tax_id').optional().isString().trim(),
], validation_1.handleValidationErrors, accountController_1.createAccount);
/**
 * PUT /api/accounts/:id
 * Update account
 */
router.put('/:id', [
    (0, express_validator_1.param)('id').isUUID(),
    (0, express_validator_1.body)('account_name').optional().notEmpty().trim().isLength({ min: 1, max: 255 }),
    (0, express_validator_1.body)('account_type').optional().isIn(['organization', 'individual']),
    (0, express_validator_1.body)('category')
        .optional()
        .isIn(['donor', 'volunteer', 'partner', 'vendor', 'beneficiary', 'other']),
    (0, express_validator_1.body)('email').optional().isString().trim(),
    (0, express_validator_1.body)('phone').optional().isString().trim(),
    (0, express_validator_1.body)('website').optional().isString().trim(),
    (0, express_validator_1.body)('description').optional().isString().trim(),
    (0, express_validator_1.body)('address_line1').optional().isString().trim(),
    (0, express_validator_1.body)('address_line2').optional().isString().trim(),
    (0, express_validator_1.body)('city').optional().isString().trim(),
    (0, express_validator_1.body)('state_province').optional().isString().trim(),
    (0, express_validator_1.body)('postal_code').optional().isString().trim(),
    (0, express_validator_1.body)('country').optional().isString().trim(),
    (0, express_validator_1.body)('tax_id').optional().isString().trim(),
    (0, express_validator_1.body)('is_active').optional().isBoolean(),
], validation_1.handleValidationErrors, accountController_1.updateAccount);
/**
 * DELETE /api/accounts/:id
 * Soft delete account
 */
router.delete('/:id', [(0, express_validator_1.param)('id').isUUID()], validation_1.handleValidationErrors, accountController_1.deleteAccount);
exports.default = router;
//# sourceMappingURL=accounts.js.map