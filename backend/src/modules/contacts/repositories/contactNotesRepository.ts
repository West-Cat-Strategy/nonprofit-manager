import type {
  ContactNote,
  CreateContactNoteDTO,
  UpdateContactNoteDTO,
} from '@app-types/contact';
import type { ContactNotesPort } from '../types/ports';
import {
  createContactNote,
  deleteContactNote,
  getContactNoteById,
  getContactNotes,
  updateContactNote,
} from './contactNotesQueries';

export class ContactNotesRepository implements ContactNotesPort {
  async list(contactId: string, limit?: number, offset?: number): Promise<{ notes: ContactNote[]; total: number }> {
    return getContactNotes(contactId, limit, offset);
  }

  async getById(noteId: string): Promise<ContactNote | null> {
    return getContactNoteById(noteId);
  }

  async create(contactId: string, payload: CreateContactNoteDTO, userId: string): Promise<ContactNote> {
    return createContactNote(contactId, payload, userId);
  }

  async update(noteId: string, payload: UpdateContactNoteDTO, userId?: string): Promise<ContactNote | null> {
    return updateContactNote(noteId, payload, userId);
  }

  async delete(noteId: string): Promise<boolean> {
    return deleteContactNote(noteId);
  }
}
