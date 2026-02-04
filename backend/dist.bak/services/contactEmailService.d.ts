/**
 * Contact Email Service
 * Handles CRUD operations for contact email addresses
 */
import type { ContactEmailAddress, CreateContactEmailDTO, UpdateContactEmailDTO } from '../types/contact';
/**
 * Get all email addresses for a contact
 */
export declare function getContactEmails(contactId: string): Promise<ContactEmailAddress[]>;
/**
 * Get a single email address by ID
 */
export declare function getContactEmailById(emailId: string): Promise<ContactEmailAddress | null>;
/**
 * Create a new email address for a contact
 */
export declare function createContactEmail(contactId: string, data: CreateContactEmailDTO, userId: string): Promise<ContactEmailAddress>;
/**
 * Update an email address
 */
export declare function updateContactEmail(emailId: string, data: UpdateContactEmailDTO, userId: string): Promise<ContactEmailAddress | null>;
/**
 * Delete an email address
 */
export declare function deleteContactEmail(emailId: string): Promise<boolean>;
/**
 * Get primary email for a contact
 */
export declare function getPrimaryEmail(contactId: string): Promise<ContactEmailAddress | null>;
//# sourceMappingURL=contactEmailService.d.ts.map