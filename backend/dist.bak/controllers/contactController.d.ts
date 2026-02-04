/**
 * Contact Controller
 * Handles HTTP requests for contact management
 */
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getContacts: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/contacts/:id
 * Get contact by ID
 */
export declare const getContactById: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * POST /api/contacts
 * Create new contact
 */
export declare const createContact: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * PUT /api/contacts/:id
 * Update contact
 */
export declare const updateContact: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/contacts/roles
 * Get available contact roles
 */
export declare const getContactRoles: (_req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * DELETE /api/contacts/:id
 * Soft delete contact
 */
export declare const deleteContact: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=contactController.d.ts.map