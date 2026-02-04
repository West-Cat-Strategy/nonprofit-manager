/**
 * Contact Phone Service
 * Handles CRUD operations for contact phone numbers
 */
import type { ContactPhoneNumber, CreateContactPhoneDTO, UpdateContactPhoneDTO } from '../types/contact';
/**
 * Get all phone numbers for a contact
 */
export declare function getContactPhones(contactId: string): Promise<ContactPhoneNumber[]>;
/**
 * Get a single phone number by ID
 */
export declare function getContactPhoneById(phoneId: string): Promise<ContactPhoneNumber | null>;
/**
 * Create a new phone number for a contact
 */
export declare function createContactPhone(contactId: string, data: CreateContactPhoneDTO, userId: string): Promise<ContactPhoneNumber>;
/**
 * Update a phone number
 */
export declare function updateContactPhone(phoneId: string, data: UpdateContactPhoneDTO, userId: string): Promise<ContactPhoneNumber | null>;
/**
 * Delete a phone number
 */
export declare function deleteContactPhone(phoneId: string): Promise<boolean>;
/**
 * Get primary phone for a contact
 */
export declare function getPrimaryPhone(contactId: string): Promise<ContactPhoneNumber | null>;
//# sourceMappingURL=contactPhoneService.d.ts.map