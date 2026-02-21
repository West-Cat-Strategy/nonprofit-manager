import { services } from '@container/services';
import type {
  Contact,
  ContactFilters,
  ContactRole,
  CreateContactDTO,
  PaginationParams,
  PaginatedContacts,
  UpdateContactDTO,
} from '@app-types/contact';
import type { DataScopeFilter } from '@app-types/dataScope';
import type { ContactDirectoryPort } from '../types/ports';

export class ContactRepository implements ContactDirectoryPort {
  async getContacts(
    filters: ContactFilters = {},
    pagination: PaginationParams = {},
    scope?: DataScopeFilter
  ): Promise<PaginatedContacts> {
    return services.contact.getContacts(filters, pagination, scope);
  }

  async getContactTags(scope?: DataScopeFilter): Promise<string[]> {
    return services.contact.getContactTags(scope);
  }

  async getContactRoles(): Promise<ContactRole[]> {
    return services.contactRole.getAllRoles();
  }

  async getRolesForContact(contactId: string): Promise<ContactRole[]> {
    return services.contactRole.getRolesForContact(contactId);
  }

  async setRolesForContact(contactId: string, roles: string[], assignedBy?: string): Promise<ContactRole[]> {
    return services.contactRole.setRolesForContact(contactId, roles, assignedBy);
  }

  async getContactById(contactId: string): Promise<Contact | null> {
    return services.contact.getContactById(contactId);
  }

  async getContactByIdWithScope(contactId: string, scope: DataScopeFilter): Promise<Contact | null> {
    return services.contact.getContactByIdWithScope(contactId, scope);
  }

  async createContact(payload: CreateContactDTO, userId: string): Promise<Contact> {
    return services.contact.createContact(payload, userId);
  }

  async updateContact(contactId: string, payload: UpdateContactDTO, userId: string): Promise<Contact | null> {
    return services.contact.updateContact(contactId, payload, userId);
  }

  async bulkUpdateContacts(
    contactIds: string[],
    payload: {
      is_active?: boolean;
      tags?: {
        add?: string[];
        remove?: string[];
        replace?: string[];
      };
    },
    userId: string
  ): Promise<number> {
    return services.contact.bulkUpdateContacts(contactIds, payload, userId);
  }

  async deleteContact(contactId: string, userId: string): Promise<boolean> {
    return services.contact.deleteContact(contactId, userId);
  }

  async findContactIdentity(contactId: string): Promise<{
    email: string | null;
    firstName: string;
    lastName: string;
  } | null> {
    const result = await services.pool.query(
      'SELECT email, first_name, last_name FROM contacts WHERE id = $1',
      [contactId]
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
    };
  }

  async findUserByEmail(email: string): Promise<{ id: string; role: string } | null> {
    const result = await services.pool.query('SELECT id, role FROM users WHERE email = $1', [
      email.toLowerCase(),
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return {
      id: result.rows[0].id,
      role: result.rows[0].role,
    };
  }

  async updateUserRole(userId: string, role: string): Promise<void> {
    await services.pool.query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2', [
      role,
      userId,
    ]);
  }
}
