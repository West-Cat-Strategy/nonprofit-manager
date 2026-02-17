/**
 * Account Controller
 * Handles HTTP requests for account management
 */
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
/**
 * GET /api/accounts
 * Get all accounts with filtering and pagination
 */
export declare const getAccounts: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/accounts/:id
 * Get account by ID
 */
export declare const getAccountById: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/accounts/:id/contacts
 * Get contacts for an account
 */
export declare const getAccountContacts: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * POST /api/accounts
 * Create new account
 */
export declare const createAccount: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * PUT /api/accounts/:id
 * Update account
 */
export declare const updateAccount: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * DELETE /api/accounts/:id
 * Soft delete account
 */
export declare const deleteAccount: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=accountController.d.ts.map