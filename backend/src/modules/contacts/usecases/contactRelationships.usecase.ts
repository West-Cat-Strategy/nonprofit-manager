import type {
  ContactRelationship,
  CreateContactRelationshipDTO,
  UpdateContactRelationshipDTO,
} from '@app-types/contact';
import type { ContactRelationshipsPort } from '../types/ports';

export class ContactRelationshipsUseCase {
  constructor(private readonly repository: ContactRelationshipsPort) {}

  list(contactId: string): Promise<ContactRelationship[]> {
    return this.repository.list(contactId);
  }

  getById(relationshipId: string): Promise<ContactRelationship | null> {
    return this.repository.getById(relationshipId);
  }

  create(
    contactId: string,
    payload: CreateContactRelationshipDTO,
    userId: string
  ): Promise<ContactRelationship> {
    return this.repository.create(contactId, payload, userId);
  }

  update(
    relationshipId: string,
    payload: UpdateContactRelationshipDTO,
    userId: string
  ): Promise<ContactRelationship | null> {
    return this.repository.update(relationshipId, payload, userId);
  }

  delete(relationshipId: string): Promise<boolean> {
    return this.repository.delete(relationshipId);
  }
}
