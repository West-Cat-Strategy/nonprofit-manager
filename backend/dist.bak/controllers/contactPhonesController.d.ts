/**
 * Contact Phones Controller
 * Handles HTTP requests for contact phone numbers
 */
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
/**
 * GET /api/contacts/:contactId/phones
 * Get all phone numbers for a contact
 */
export declare const getContactPhones: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/contacts/phones/:phoneId
 * Get a single phone number by ID
 */
export declare const getContactPhoneById: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * POST /api/contacts/:contactId/phones
 * Create a new phone number for a contact
 */
export declare const createContactPhone: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * PUT /api/contacts/phones/:phoneId
 * Update a phone number
 */
export declare const updateContactPhone: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * DELETE /api/contacts/phones/:phoneId
 * Delete a phone number
 */
export declare const deleteContactPhone: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=contactPhonesController.d.ts.map