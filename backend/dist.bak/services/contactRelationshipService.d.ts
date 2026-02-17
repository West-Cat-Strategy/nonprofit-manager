/**
 * Contact Relationship Service
 * Handles CRUD operations for contact relationships
 */
import type { ContactRelationship, CreateContactRelationshipDTO, UpdateContactRelationshipDTO } from '../types/contact';
/**
 * Get all relationships for a contact
 */
export declare function getContactRelationships(contactId: string): Promise<ContactRelationship[]>;
/**
 * Get a single relationship by ID
 */
export declare function getContactRelationshipById(relationshipId: string): Promise<ContactRelationship | null>;
/**
 * Create a new relationship
 */
export declare function createContactRelationship(contactId: string, data: CreateContactRelationshipDTO, userId: string): Promise<ContactRelationship>;
/**
 * Update a relationship
 */
export declare function updateContactRelationship(relationshipId: string, data: UpdateContactRelationshipDTO, userId: string): Promise<ContactRelationship | null>;
/**
 * Delete a relationship (soft delete by setting is_active = false)
 */
export declare function deleteContactRelationship(relationshipId: string): Promise<boolean>;
/**
 * Hard delete a relationship
 */
export declare function hardDeleteContactRelationship(relationshipId: string): Promise<boolean>;
/**
 * Get inverse relationships (relationships where this contact is the related contact)
 */
export declare function getInverseRelationships(contactId: string): Promise<ContactRelationship[]>;
//# sourceMappingURL=contactRelationshipService.d.ts.map