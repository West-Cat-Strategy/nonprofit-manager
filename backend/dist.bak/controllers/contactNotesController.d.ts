/**
 * Contact Notes Controller
 * Handles HTTP requests for contact notes
 */
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
/**
 * GET /api/contacts/:contactId/notes
 * Get all notes for a contact
 */
export declare const getContactNotes: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/contacts/notes/:noteId
 * Get a single note by ID
 */
export declare const getContactNoteById: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * POST /api/contacts/:contactId/notes
 * Create a new note for a contact
 */
export declare const createContactNote: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * PUT /api/contacts/notes/:noteId
 * Update a note
 */
export declare const updateContactNote: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * DELETE /api/contacts/notes/:noteId
 * Delete a note
 */
export declare const deleteContactNote: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=contactNotesController.d.ts.map