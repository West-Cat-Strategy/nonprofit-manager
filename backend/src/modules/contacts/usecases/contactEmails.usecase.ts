import type {
  ContactEmailAddress,
  CreateContactEmailDTO,
  UpdateContactEmailDTO,
} from '@app-types/contact';
import type { ContactEmailsPort } from '../types/ports';

export class ContactEmailsUseCase {
  constructor(private readonly repository: ContactEmailsPort) {}

  list(contactId: string): Promise<ContactEmailAddress[]> {
    return this.repository.list(contactId);
  }

  getById(emailId: string): Promise<ContactEmailAddress | null> {
    return this.repository.getById(emailId);
  }

  create(contactId: string, payload: CreateContactEmailDTO, userId: string): Promise<ContactEmailAddress> {
    return this.repository.create(contactId, payload, userId);
  }

  update(emailId: string, payload: UpdateContactEmailDTO, userId: string): Promise<ContactEmailAddress | null> {
    return this.repository.update(emailId, payload, userId);
  }

  delete(emailId: string): Promise<boolean> {
    return this.repository.delete(emailId);
  }
}
