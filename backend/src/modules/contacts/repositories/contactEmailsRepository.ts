import * as contactEmailService from '@services/contactEmailService';
import type {
  ContactEmailAddress,
  CreateContactEmailDTO,
  UpdateContactEmailDTO,
} from '@app-types/contact';
import type { ContactEmailsPort } from '../types/ports';

export class ContactEmailsRepository implements ContactEmailsPort {
  async list(contactId: string): Promise<ContactEmailAddress[]> {
    return contactEmailService.getContactEmails(contactId);
  }

  async getById(emailId: string): Promise<ContactEmailAddress | null> {
    return contactEmailService.getContactEmailById(emailId);
  }

  async create(contactId: string, payload: CreateContactEmailDTO, userId: string): Promise<ContactEmailAddress> {
    return contactEmailService.createContactEmail(contactId, payload, userId);
  }

  async update(
    emailId: string,
    payload: UpdateContactEmailDTO,
    userId: string
  ): Promise<ContactEmailAddress | null> {
    return contactEmailService.updateContactEmail(emailId, payload, userId);
  }

  async delete(emailId: string): Promise<boolean> {
    return contactEmailService.deleteContactEmail(emailId);
  }
}
