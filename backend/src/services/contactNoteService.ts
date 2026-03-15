/**
 * Compatibility wrapper for legacy contact note service imports.
 * Canonical ownership lives in `@modules/contacts/repositories/contactNotesQueries`.
 */

export {
  createContactNote,
  deleteContactNote,
  getContactNoteById,
  getContactNotes,
  getNotesByCaseId,
  updateContactNote,
} from '@modules/contacts/repositories/contactNotesQueries';
