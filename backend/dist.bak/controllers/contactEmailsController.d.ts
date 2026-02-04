/**
 * Contact Emails Controller
 * Handles HTTP requests for contact email addresses
 */
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
/**
 * GET /api/contacts/:contactId/emails
 * Get all email addresses for a contact
 */
export declare const getContactEmails: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/contacts/emails/:emailId
 * Get a single email address by ID
 */
export declare const getContactEmailById: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * POST /api/contacts/:contactId/emails
 * Create a new email address for a contact
 */
export declare const createContactEmail: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * PUT /api/contacts/emails/:emailId
 * Update an email address
 */
export declare const updateContactEmail: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * DELETE /api/contacts/emails/:emailId
 * Delete an email address
 */
export declare const deleteContactEmail: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=contactEmailsController.d.ts.map