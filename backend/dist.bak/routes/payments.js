"use strict";
/**
 * Payment Routes
 * API endpoints for payment processing
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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const paymentController = __importStar(require("../controllers/paymentController"));
const router = (0, express_1.Router)();
/**
 * GET /api/payments/config
 * Get payment configuration (public endpoint)
 */
router.get('/config', paymentController.getPaymentConfig);
/**
 * POST /api/payments/intents
 * Create a payment intent
 */
router.post('/intents', auth_1.authenticate, [
    (0, express_validator_1.body)('amount')
        .isInt({ min: 50 })
        .withMessage('Amount must be at least 50 cents'),
    (0, express_validator_1.body)('currency')
        .optional()
        .isIn(['usd', 'eur', 'gbp', 'cad', 'aud'])
        .withMessage('Invalid currency'),
    (0, express_validator_1.body)('description')
        .optional()
        .isString()
        .isLength({ max: 500 })
        .withMessage('Description too long'),
    (0, express_validator_1.body)('donationId')
        .optional()
        .isUUID()
        .withMessage('Invalid donation ID'),
    (0, express_validator_1.body)('receiptEmail')
        .optional()
        .isEmail()
        .withMessage('Invalid email'),
], paymentController.createPaymentIntent);
/**
 * GET /api/payments/intents/:id
 * Get payment intent status
 */
router.get('/intents/:id', auth_1.authenticate, [
    (0, express_validator_1.param)('id')
        .isString()
        .matches(/^pi_/)
        .withMessage('Invalid payment intent ID'),
], paymentController.getPaymentIntent);
/**
 * POST /api/payments/intents/:id/cancel
 * Cancel a payment intent
 */
router.post('/intents/:id/cancel', auth_1.authenticate, [
    (0, express_validator_1.param)('id')
        .isString()
        .matches(/^pi_/)
        .withMessage('Invalid payment intent ID'),
], paymentController.cancelPaymentIntent);
/**
 * POST /api/payments/refunds
 * Create a refund
 */
router.post('/refunds', auth_1.authenticate, [
    (0, express_validator_1.body)('paymentIntentId')
        .isString()
        .matches(/^pi_/)
        .withMessage('Invalid payment intent ID'),
    (0, express_validator_1.body)('amount')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Refund amount must be positive'),
    (0, express_validator_1.body)('reason')
        .optional()
        .isIn(['duplicate', 'fraudulent', 'requested_by_customer'])
        .withMessage('Invalid refund reason'),
], paymentController.createRefund);
/**
 * POST /api/payments/customers
 * Create a Stripe customer
 */
router.post('/customers', auth_1.authenticate, [
    (0, express_validator_1.body)('email')
        .isEmail()
        .withMessage('Valid email is required'),
    (0, express_validator_1.body)('name')
        .optional()
        .isString()
        .isLength({ max: 200 })
        .withMessage('Name too long'),
    (0, express_validator_1.body)('phone')
        .optional()
        .isString()
        .isLength({ max: 20 })
        .withMessage('Phone too long'),
    (0, express_validator_1.body)('contactId')
        .optional()
        .isUUID()
        .withMessage('Invalid contact ID'),
], paymentController.createCustomer);
/**
 * GET /api/payments/customers/:id
 * Get Stripe customer
 */
router.get('/customers/:id', auth_1.authenticate, [
    (0, express_validator_1.param)('id')
        .isString()
        .matches(/^cus_/)
        .withMessage('Invalid customer ID'),
], paymentController.getCustomer);
/**
 * GET /api/payments/customers/:customerId/payment-methods
 * List customer payment methods
 */
router.get('/customers/:customerId/payment-methods', auth_1.authenticate, [
    (0, express_validator_1.param)('customerId')
        .isString()
        .matches(/^cus_/)
        .withMessage('Invalid customer ID'),
], paymentController.listPaymentMethods);
/**
 * POST /api/payments/webhook
 * Stripe webhook handler (no auth - verified by signature)
 */
router.post('/webhook', 
// Note: Raw body is needed for webhook signature verification
// This is configured in the main app
paymentController.handleWebhook);
exports.default = router;
//# sourceMappingURL=payments.js.map