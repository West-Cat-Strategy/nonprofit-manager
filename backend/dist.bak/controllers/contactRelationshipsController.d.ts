/**
 * Contact Relationships Controller
 * Handles HTTP requests for contact relationships
 */
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
/**
 * GET /api/contacts/:contactId/relationships
 * Get all relationships for a contact
 */
export declare const getContactRelationships: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/contacts/relationships/:relationshipId
 * Get a single relationship by ID
 */
export declare const getContactRelationshipById: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * POST /api/contacts/:contactId/relationships
 * Create a new relationship
 */
export declare const createContactRelationship: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * PUT /api/contacts/relationships/:relationshipId
 * Update a relationship
 */
export declare const updateContactRelationship: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * DELETE /api/contacts/relationships/:relationshipId
 * Soft delete a relationship
 */
export declare const deleteContactRelationship: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=contactRelationshipsController.d.ts.map