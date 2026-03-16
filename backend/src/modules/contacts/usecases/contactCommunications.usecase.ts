import type {
  ContactCommunicationFilters,
  ContactCommunicationsResult,
} from '@app-types/contact';
import type { ContactCommunicationsPort } from '../types/ports';

export class ContactCommunicationsUseCase {
  constructor(private readonly repository: ContactCommunicationsPort) {}

  list(
    contactId: string,
    filters: ContactCommunicationFilters = {}
  ): Promise<ContactCommunicationsResult> {
    return this.repository.list(contactId, filters);
  }
}
