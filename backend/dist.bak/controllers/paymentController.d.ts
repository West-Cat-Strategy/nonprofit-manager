/**
 * Payment Controller
 * HTTP handlers for payment operations
 */
import { Request, Response } from 'express';
import { Pool } from 'pg';
import type { AuthRequest } from '../middleware/auth';
export declare const setPaymentPool: (dbPool: Pool) => void;
/**
 * Check if payments are configured
 */
export declare const getPaymentConfig: (_req: Request, res: Response) => Promise<void>;
/**
 * Create a payment intent
 */
export declare const createPaymentIntent: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Get payment intent status
 */
export declare const getPaymentIntent: (req: Request<{
    id: string;
}>, res: Response) => Promise<void>;
/**
 * Cancel payment intent
 */
export declare const cancelPaymentIntent: (req: Request<{
    id: string;
}>, res: Response) => Promise<void>;
/**
 * Create a refund
 */
export declare const createRefund: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Create a customer
 */
export declare const createCustomer: (req: Request, res: Response) => Promise<void>;
/**
 * Get customer
 */
export declare const getCustomer: (req: Request<{
    id: string;
}>, res: Response) => Promise<void>;
/**
 * List customer payment methods
 */
export declare const listPaymentMethods: (req: Request<{
    customerId: string;
}>, res: Response) => Promise<void>;
/**
 * Handle Stripe webhook
 */
export declare const handleWebhook: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=paymentController.d.ts.map