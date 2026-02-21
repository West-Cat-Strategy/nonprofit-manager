import * as contactNoteService from '@services/contactNoteService';
import type {
  ContactNote,
  CreateContactNoteDTO,
  UpdateContactNoteDTO,
} from '@app-types/contact';
import type { ContactNotesPort } from '../types/ports';

export class ContactNotesRepository implements ContactNotesPort {
  async list(contactId: string, limit?: number, offset?: number): Promise<{ notes: ContactNote[]; total: number }> {
    return contactNoteService.getContactNotes(contactId, limit, offset);
  }

  async getById(noteId: string): Promise<ContactNote | null> {
    return contactNoteService.getContactNoteById(noteId);
  }

  async create(contactId: string, payload: CreateContactNoteDTO, userId: string): Promise<ContactNote> {
    return contactNoteService.createContactNote(contactId, payload, userId);
  }

  async update(noteId: string, payload: UpdateContactNoteDTO, userId?: string): Promise<ContactNote | null> {
    return contactNoteService.updateContactNote(noteId, payload, userId);
  }

  async delete(noteId: string): Promise<boolean> {
    return contactNoteService.deleteContactNote(noteId);
  }
}
