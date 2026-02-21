import * as contactRelationshipService from '@services/contactRelationshipService';
import type {
  ContactRelationship,
  CreateContactRelationshipDTO,
  UpdateContactRelationshipDTO,
} from '@app-types/contact';
import type { ContactRelationshipsPort } from '../types/ports';

export class ContactRelationshipsRepository implements ContactRelationshipsPort {
  async list(contactId: string): Promise<ContactRelationship[]> {
    return contactRelationshipService.getContactRelationships(contactId);
  }

  async getById(relationshipId: string): Promise<ContactRelationship | null> {
    return contactRelationshipService.getContactRelationshipById(relationshipId);
  }

  async create(
    contactId: string,
    payload: CreateContactRelationshipDTO,
    userId: string
  ): Promise<ContactRelationship> {
    return contactRelationshipService.createContactRelationship(contactId, payload, userId);
  }

  async update(
    relationshipId: string,
    payload: UpdateContactRelationshipDTO,
    userId: string
  ): Promise<ContactRelationship | null> {
    return contactRelationshipService.updateContactRelationship(relationshipId, payload, userId);
  }

  async delete(relationshipId: string): Promise<boolean> {
    return contactRelationshipService.deleteContactRelationship(relationshipId);
  }
}
