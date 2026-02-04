/**
 * Contact Service
 * Handles business logic and database operations for contacts
 */
import { Pool } from 'pg';
import { Contact, CreateContactDTO, UpdateContactDTO, ContactFilters, PaginationParams, PaginatedContacts } from '../types/contact';
import type { DataScopeFilter } from '../types/dataScope';
export declare class ContactService {
    private pool;
    constructor(pool: Pool);
    /**
     * Get all contacts with filtering and pagination
     */
    getContacts(filters?: ContactFilters, pagination?: PaginationParams, scope?: DataScopeFilter): Promise<PaginatedContacts>;
    /**
     * Get contact by ID
     */
    getContactById(contactId: string): Promise<Contact | null>;
    getContactByIdWithScope(contactId: string, scope?: DataScopeFilter): Promise<Contact | null>;
    /**
     * Create new contact
     */
    createContact(data: CreateContactDTO, userId: string): Promise<Contact>;
    /**
     * Update contact
     */
    updateContact(contactId: string, data: UpdateContactDTO, userId: string): Promise<Contact | null>;
    /**
     * Soft delete contact
     */
    deleteContact(contactId: string, userId: string): Promise<boolean>;
}
//# sourceMappingURL=contactService.d.ts.map