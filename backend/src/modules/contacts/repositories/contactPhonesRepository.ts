import * as contactPhoneService from '@services/contactPhoneService';
import type {
  ContactPhoneNumber,
  CreateContactPhoneDTO,
  UpdateContactPhoneDTO,
} from '@app-types/contact';
import type { ContactPhonesPort } from '../types/ports';

export class ContactPhonesRepository implements ContactPhonesPort {
  async list(contactId: string): Promise<ContactPhoneNumber[]> {
    return contactPhoneService.getContactPhones(contactId);
  }

  async getById(phoneId: string): Promise<ContactPhoneNumber | null> {
    return contactPhoneService.getContactPhoneById(phoneId);
  }

  async create(contactId: string, payload: CreateContactPhoneDTO, userId: string): Promise<ContactPhoneNumber> {
    return contactPhoneService.createContactPhone(contactId, payload, userId);
  }

  async update(
    phoneId: string,
    payload: UpdateContactPhoneDTO,
    userId: string
  ): Promise<ContactPhoneNumber | null> {
    return contactPhoneService.updateContactPhone(phoneId, payload, userId);
  }

  async delete(phoneId: string): Promise<boolean> {
    return contactPhoneService.deleteContactPhone(phoneId);
  }
}
