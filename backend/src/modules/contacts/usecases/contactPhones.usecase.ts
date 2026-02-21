import type {
  ContactPhoneNumber,
  CreateContactPhoneDTO,
  UpdateContactPhoneDTO,
} from '@app-types/contact';
import type { ContactPhonesPort } from '../types/ports';

export class ContactPhonesUseCase {
  constructor(private readonly repository: ContactPhonesPort) {}

  list(contactId: string): Promise<ContactPhoneNumber[]> {
    return this.repository.list(contactId);
  }

  getById(phoneId: string): Promise<ContactPhoneNumber | null> {
    return this.repository.getById(phoneId);
  }

  create(contactId: string, payload: CreateContactPhoneDTO, userId: string): Promise<ContactPhoneNumber> {
    return this.repository.create(contactId, payload, userId);
  }

  update(phoneId: string, payload: UpdateContactPhoneDTO, userId: string): Promise<ContactPhoneNumber | null> {
    return this.repository.update(phoneId, payload, userId);
  }

  delete(phoneId: string): Promise<boolean> {
    return this.repository.delete(phoneId);
  }
}
