"use strict";
/**
 * Donation Routes
 * API endpoints for donation management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const donationController_1 = __importDefault(require("../controllers/donationController"));
const auth_1 = require("../middleware/auth");
const dataScope_1 = require("../middleware/dataScope");
const router = (0, express_1.Router)();
// Validation rules
const createDonationValidation = [
    (0, express_validator_1.body)('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    (0, express_validator_1.body)('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
    (0, express_validator_1.body)('donation_date').isISO8601().withMessage('Invalid donation date'),
    (0, express_validator_1.body)('payment_method')
        .optional()
        .isIn(['cash', 'check', 'credit_card', 'debit_card', 'bank_transfer', 'paypal', 'stock', 'in_kind', 'other'])
        .withMessage('Invalid payment method'),
    (0, express_validator_1.body)('payment_status')
        .optional()
        .isIn(['pending', 'completed', 'failed', 'refunded', 'cancelled'])
        .withMessage('Invalid payment status'),
    (0, express_validator_1.body)('account_id').optional().isUUID().withMessage('Invalid account ID'),
    (0, express_validator_1.body)('contact_id').optional().isUUID().withMessage('Invalid contact ID'),
    (0, express_validator_1.body)('is_recurring').optional().isBoolean().withMessage('is_recurring must be boolean'),
    (0, express_validator_1.body)('recurring_frequency')
        .optional()
        .isIn(['weekly', 'monthly', 'quarterly', 'annually', 'one_time'])
        .withMessage('Invalid recurring frequency'),
];
const updateDonationValidation = [
    (0, express_validator_1.body)('amount').optional().isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    (0, express_validator_1.body)('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
    (0, express_validator_1.body)('donation_date').optional().isISO8601().withMessage('Invalid donation date'),
    (0, express_validator_1.body)('payment_method')
        .optional()
        .isIn(['cash', 'check', 'credit_card', 'debit_card', 'bank_transfer', 'paypal', 'stock', 'in_kind', 'other'])
        .withMessage('Invalid payment method'),
    (0, express_validator_1.body)('payment_status')
        .optional()
        .isIn(['pending', 'completed', 'failed', 'refunded', 'cancelled'])
        .withMessage('Invalid payment status'),
    (0, express_validator_1.body)('account_id').optional().isUUID().withMessage('Invalid account ID'),
    (0, express_validator_1.body)('contact_id').optional().isUUID().withMessage('Invalid contact ID'),
    (0, express_validator_1.body)('is_recurring').optional().isBoolean().withMessage('is_recurring must be boolean'),
    (0, express_validator_1.body)('recurring_frequency')
        .optional()
        .isIn(['weekly', 'monthly', 'quarterly', 'annually', 'one_time'])
        .withMessage('Invalid recurring frequency'),
    (0, express_validator_1.body)('receipt_sent').optional().isBoolean().withMessage('receipt_sent must be boolean'),
];
const donationQueryValidation = [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('payment_method')
        .optional()
        .isIn(['cash', 'check', 'credit_card', 'debit_card', 'bank_transfer', 'paypal', 'stock', 'in_kind', 'other'])
        .withMessage('Invalid payment method'),
    (0, express_validator_1.query)('payment_status')
        .optional()
        .isIn(['pending', 'completed', 'failed', 'refunded', 'cancelled'])
        .withMessage('Invalid payment status'),
    (0, express_validator_1.query)('is_recurring').optional().isBoolean().withMessage('is_recurring must be boolean'),
    (0, express_validator_1.query)('min_amount').optional().isFloat({ min: 0 }).withMessage('min_amount must be non-negative'),
    (0, express_validator_1.query)('max_amount').optional().isFloat({ min: 0 }).withMessage('max_amount must be non-negative'),
];
// Donation routes
router.use(auth_1.authenticate);
router.use((0, dataScope_1.loadDataScope)('donations'));
router.get('/', donationQueryValidation, donationController_1.default.getDonations);
router.get('/summary', donationController_1.default.getDonationSummary);
router.get('/:id', donationController_1.default.getDonationById);
router.post('/', createDonationValidation, donationController_1.default.createDonation);
router.put('/:id', updateDonationValidation, donationController_1.default.updateDonation);
router.delete('/:id', donationController_1.default.deleteDonation);
router.post('/:id/receipt', donationController_1.default.markReceiptSent);
exports.default = router;
//# sourceMappingURL=donations.js.map