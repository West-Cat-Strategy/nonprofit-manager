import type {
  ContactNote,
  CreateContactNoteDTO,
  UpdateContactNoteDTO,
} from '@app-types/contact';
import type { ContactNotesPort } from '../types/ports';

export class ContactNotesUseCase {
  constructor(private readonly repository: ContactNotesPort) {}

  list(contactId: string, limit?: number, offset?: number): Promise<{ notes: ContactNote[]; total: number }> {
    return this.repository.list(contactId, limit, offset);
  }

  getById(noteId: string): Promise<ContactNote | null> {
    return this.repository.getById(noteId);
  }

  create(contactId: string, payload: CreateContactNoteDTO, userId: string): Promise<ContactNote> {
    return this.repository.create(contactId, payload, userId);
  }

  update(noteId: string, payload: UpdateContactNoteDTO, userId?: string): Promise<ContactNote | null> {
    return this.repository.update(noteId, payload, userId);
  }

  delete(noteId: string): Promise<boolean> {
    return this.repository.delete(noteId);
  }
}
