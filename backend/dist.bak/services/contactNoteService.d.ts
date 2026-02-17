/**
 * Contact Note Service
 * Handles CRUD operations for contact notes
 */
import type { ContactNote, CreateContactNoteDTO, UpdateContactNoteDTO } from '../types/contact';
/**
 * Get all notes for a contact
 */
export declare function getContactNotes(contactId: string): Promise<ContactNote[]>;
/**
 * Get a single note by ID
 */
export declare function getContactNoteById(noteId: string): Promise<ContactNote | null>;
/**
 * Create a new contact note
 */
export declare function createContactNote(contactId: string, data: CreateContactNoteDTO, userId: string): Promise<ContactNote>;
/**
 * Update a contact note
 */
export declare function updateContactNote(noteId: string, data: UpdateContactNoteDTO): Promise<ContactNote | null>;
/**
 * Delete a contact note
 */
export declare function deleteContactNote(noteId: string): Promise<boolean>;
/**
 * Get notes by case ID (for showing contact notes related to a specific case)
 */
export declare function getNotesByCaseId(caseId: string): Promise<ContactNote[]>;
//# sourceMappingURL=contactNoteService.d.ts.map