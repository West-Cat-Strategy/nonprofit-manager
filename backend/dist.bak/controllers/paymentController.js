"use strict";
/**
 * Payment Controller
 * HTTP handlers for payment operations
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
exports.handleWebhook = exports.listPaymentMethods = exports.getCustomer = exports.createCustomer = exports.createRefund = exports.cancelPaymentIntent = exports.getPaymentIntent = exports.createPaymentIntent = exports.getPaymentConfig = exports.setPaymentPool = void 0;
const logger_1 = require("../config/logger");
const stripeService = __importStar(require("../services/stripeService"));
// Database pool
let pool;
const setPaymentPool = (dbPool) => {
    pool = dbPool;
};
exports.setPaymentPool = setPaymentPool;
/**
 * Check if payments are configured
 */
const getPaymentConfig = async (_req, res) => {
    try {
        res.json({
            stripe: {
                configured: stripeService.isStripeConfigured(),
                publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting payment config', { error });
        res.status(500).json({ error: 'Failed to get payment configuration' });
    }
};
exports.getPaymentConfig = getPaymentConfig;
/**
 * Create a payment intent
 */
const createPaymentIntent = async (req, res) => {
    try {
        const { amount, currency, description, metadata, donationId, receiptEmail } = req.body;
        if (!amount || amount <= 0) {
            res.status(400).json({ error: 'Amount must be a positive number' });
            return;
        }
        // Minimum amount is $0.50 (50 cents)
        if (amount < 50) {
            res.status(400).json({ error: 'Minimum amount is $0.50 (50 cents)' });
            return;
        }
        const paymentIntent = await stripeService.createPaymentIntent({
            amount,
            currency: currency || 'usd',
            description,
            metadata,
            donationId,
            receiptEmail,
            statementDescriptor: 'NONPROFIT DONATION',
        });
        // Optionally log to audit table
        if (pool && donationId) {
            await pool.query(`INSERT INTO audit_logs (action, resource_type, resource_id, user_id, details)
         VALUES ($1, $2, $3, $4, $5)`, [
                'payment_intent_created',
                'donation',
                donationId,
                req.user?.id || null,
                JSON.stringify({ paymentIntentId: paymentIntent.id, amount }),
            ]).catch((err) => logger_1.logger.error('Failed to log payment intent creation', { err }));
        }
        res.status(201).json(paymentIntent);
    }
    catch (error) {
        logger_1.logger.error('Error creating payment intent', { error });
        res.status(500).json({ error: 'Failed to create payment intent' });
    }
};
exports.createPaymentIntent = createPaymentIntent;
/**
 * Get payment intent status
 */
const getPaymentIntent = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ error: 'Payment intent ID is required' });
            return;
        }
        const paymentIntent = await stripeService.getPaymentIntent(id);
        res.json(paymentIntent);
    }
    catch (error) {
        logger_1.logger.error('Error getting payment intent', { error });
        res.status(500).json({ error: 'Failed to get payment intent' });
    }
};
exports.getPaymentIntent = getPaymentIntent;
/**
 * Cancel payment intent
 */
const cancelPaymentIntent = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ error: 'Payment intent ID is required' });
            return;
        }
        const paymentIntent = await stripeService.cancelPaymentIntent(id);
        res.json(paymentIntent);
    }
    catch (error) {
        logger_1.logger.error('Error canceling payment intent', { error });
        res.status(500).json({ error: 'Failed to cancel payment intent' });
    }
};
exports.cancelPaymentIntent = cancelPaymentIntent;
/**
 * Create a refund
 */
const createRefund = async (req, res) => {
    try {
        const { paymentIntentId, amount, reason } = req.body;
        if (!paymentIntentId) {
            res.status(400).json({ error: 'Payment intent ID is required' });
            return;
        }
        const refund = await stripeService.createRefund({
            paymentIntentId,
            amount,
            reason,
        });
        // Log refund to audit
        if (pool) {
            await pool.query(`INSERT INTO audit_logs (action, resource_type, resource_id, user_id, details)
         VALUES ($1, $2, $3, $4, $5)`, [
                'refund_created',
                'payment',
                paymentIntentId,
                req.user?.id || null,
                JSON.stringify({ refundId: refund.id, amount: refund.amount, reason }),
            ]).catch((err) => logger_1.logger.error('Failed to log refund creation', { err }));
        }
        res.status(201).json(refund);
    }
    catch (error) {
        logger_1.logger.error('Error creating refund', { error });
        res.status(500).json({ error: 'Failed to create refund' });
    }
};
exports.createRefund = createRefund;
/**
 * Create a customer
 */
const createCustomer = async (req, res) => {
    try {
        const { email, name, phone, contactId } = req.body;
        if (!email) {
            res.status(400).json({ error: 'Email is required' });
            return;
        }
        const customer = await stripeService.createCustomer({
            email,
            name,
            phone,
            contactId,
        });
        // Optionally update contact with Stripe customer ID
        if (pool && contactId) {
            await pool.query(`UPDATE contacts SET stripe_customer_id = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`, [customer.id, contactId]).catch((err) => logger_1.logger.error('Failed to update contact with Stripe customer ID', { err }));
        }
        res.status(201).json(customer);
    }
    catch (error) {
        logger_1.logger.error('Error creating customer', { error });
        res.status(500).json({ error: 'Failed to create customer' });
    }
};
exports.createCustomer = createCustomer;
/**
 * Get customer
 */
const getCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ error: 'Customer ID is required' });
            return;
        }
        const customer = await stripeService.getCustomer(id);
        res.json(customer);
    }
    catch (error) {
        logger_1.logger.error('Error getting customer', { error });
        res.status(500).json({ error: 'Failed to get customer' });
    }
};
exports.getCustomer = getCustomer;
/**
 * List customer payment methods
 */
const listPaymentMethods = async (req, res) => {
    try {
        const { customerId } = req.params;
        if (!customerId) {
            res.status(400).json({ error: 'Customer ID is required' });
            return;
        }
        const paymentMethods = await stripeService.listPaymentMethods(customerId);
        res.json(paymentMethods);
    }
    catch (error) {
        logger_1.logger.error('Error listing payment methods', { error });
        res.status(500).json({ error: 'Failed to list payment methods' });
    }
};
exports.listPaymentMethods = listPaymentMethods;
/**
 * Handle Stripe webhook
 */
const handleWebhook = async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
        res.status(400).json({ error: 'Missing stripe-signature header' });
        return;
    }
    try {
        const event = stripeService.constructWebhookEvent(req.body, signature);
        logger_1.logger.info('Webhook received', { eventType: event.type, eventId: event.id });
        // Handle different event types
        switch (event.type) {
            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object;
                logger_1.logger.info('Payment succeeded', {
                    paymentIntentId: paymentIntent.id,
                    amount: paymentIntent.amount,
                });
                // Update donation status if linked
                if (pool && paymentIntent.metadata?.donationId) {
                    await pool.query(`UPDATE donations
             SET payment_status = 'completed',
                 stripe_payment_intent_id = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`, [paymentIntent.id, paymentIntent.metadata.donationId]).catch((err) => logger_1.logger.error('Failed to update donation status', { err }));
                }
                break;
            }
            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object;
                logger_1.logger.warn('Payment failed', { paymentIntentId: paymentIntent.id });
                // Update donation status if linked
                if (pool && paymentIntent.metadata?.donationId) {
                    await pool.query(`UPDATE donations
             SET payment_status = 'failed',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`, [paymentIntent.metadata.donationId]).catch((err) => logger_1.logger.error('Failed to update donation status', { err }));
                }
                break;
            }
            case 'charge.refunded': {
                const charge = event.data.object;
                logger_1.logger.info('Charge refunded', {
                    paymentIntentId: charge.payment_intent,
                    amountRefunded: charge.amount_refunded,
                });
                break;
            }
            default:
                logger_1.logger.debug('Unhandled webhook event type', { eventType: event.type });
        }
        res.json({ received: true });
    }
    catch (error) {
        logger_1.logger.error('Webhook error', { error });
        res.status(400).json({ error: 'Webhook error' });
    }
};
exports.handleWebhook = handleWebhook;
//# sourceMappingURL=paymentController.js.map