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
import { invitationService, syncUserRole } from '@services/domains/integration';
import { services } from '@container/services';
import type { ContactDirectoryPort } from '../types/ports';

const STAFF_ROLE_MAP: Record<string, string> = {
  'Executive Director': 'admin',
  Staff: 'staff',
};

const getStaffRoleForContact = (roles: string[]): string | null => {
  if (roles.includes('Executive Director')) {
    return STAFF_ROLE_MAP['Executive Director'];
  }
  if (roles.includes('Staff')) {
    return STAFF_ROLE_MAP.Staff;
  }
  return null;
};

export class ContactDirectoryUseCase {
  constructor(private readonly repository: ContactDirectoryPort) {}

  private async ensureStaffUserAccount(
    contactId: string,
    roles: string[],
    createdBy: string
  ): Promise<{ inviteUrl?: string; role?: string } | null> {
    const targetRole = getStaffRoleForContact(roles);
    if (!targetRole) {
      return null;
    }

    const contact = await this.repository.findContactIdentity(contactId);
    if (!contact?.email) {
      throw new Error('Staff roles require a contact email to create an account');
    }

    const existingUser = await this.repository.findUserByEmail(contact.email);
    if (existingUser) {
      if (existingUser.role !== targetRole) {
        await this.repository.updateUserRole(existingUser.id, targetRole);
      }
      await syncUserRole(existingUser.id, targetRole, services.pool);
      return { role: targetRole };
    }

    try {
      const invitation = await invitationService.createInvitation(
        {
          email: contact.email,
          role: targetRole,
          message: `Auto-invite created from contact role assignment for ${contact.firstName} ${contact.lastName}`,
        },
        createdBy
      );

      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const inviteUrl = `${baseUrl}/accept-invitation/${invitation.token}`;
      return { inviteUrl, role: targetRole };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('pending invitation')) {
        return { role: targetRole };
      }
      throw error;
    }
  }

  async list(
    filters: ContactFilters,
    pagination: PaginationParams,
    scope?: DataScopeFilter
  ): Promise<PaginatedContacts> {
    return this.repository.getContacts(filters, pagination, scope);
  }

  async listTags(scope?: DataScopeFilter): Promise<string[]> {
    return this.repository.getContactTags(scope);
  }

  async listRoles(): Promise<ContactRole[]> {
    return this.repository.getContactRoles();
  }

  async bulkUpdate(
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
    return this.repository.bulkUpdateContacts(contactIds, payload, userId);
  }

  async getById(contactId: string, scope?: DataScopeFilter): Promise<(Contact & { roles: string[] }) | null> {
    const contact = scope
      ? await this.repository.getContactByIdWithScope(contactId, scope)
      : await this.repository.getContactById(contactId);

    if (!contact) {
      return null;
    }

    const roles = await this.repository.getRolesForContact(contactId);
    return {
      ...contact,
      roles: roles.map((role) => role.name),
    };
  }

  async create(
    payload: CreateContactDTO,
    userId: string
  ): Promise<Contact & { roles: string[]; staffInvitation: { inviteUrl?: string; role?: string } | null }> {
    const rolesInput = Array.isArray(payload.roles) ? payload.roles : [];
    const createPayload: CreateContactDTO = {
      ...payload,
      roles: undefined,
    };

    const created = await this.repository.createContact(createPayload, userId);
    let assignedRoles: string[] = [];
    let staffInvitation: { inviteUrl?: string; role?: string } | null = null;

    if (rolesInput.length > 0) {
      const roleRecords = await this.repository.setRolesForContact(created.contact_id, rolesInput, userId);
      assignedRoles = roleRecords.map((role) => role.name);
      staffInvitation = await this.ensureStaffUserAccount(created.contact_id, assignedRoles, userId);
    }

    return {
      ...created,
      roles: assignedRoles,
      staffInvitation,
    };
  }

  async update(
    contactId: string,
    payload: UpdateContactDTO,
    userId: string,
    scope?: DataScopeFilter
  ): Promise<(Contact & { roles: string[]; staffInvitation: { inviteUrl?: string; role?: string } | null }) | null> {
    if (scope) {
      const scopedContact = await this.repository.getContactByIdWithScope(contactId, scope);
      if (!scopedContact) {
        return null;
      }
    }

    const rolesInput = Array.isArray(payload.roles) ? payload.roles : undefined;
    const updatePayload: UpdateContactDTO = {
      ...payload,
      roles: undefined,
    };

    const updated = await this.repository.updateContact(contactId, updatePayload, userId);
    if (!updated) {
      return null;
    }

    const assignedRoles = rolesInput
      ? (await this.repository.setRolesForContact(contactId, rolesInput, userId)).map((role) => role.name)
      : (await this.repository.getRolesForContact(contactId)).map((role) => role.name);
    let staffInvitation: { inviteUrl?: string; role?: string } | null = null;

    if (rolesInput && assignedRoles.length > 0) {
      staffInvitation = await this.ensureStaffUserAccount(contactId, assignedRoles, userId);
    }

    return {
      ...updated,
      roles: assignedRoles,
      staffInvitation,
    };
  }

  async delete(contactId: string, userId: string, scope?: DataScopeFilter): Promise<boolean> {
    if (scope) {
      const scopedContact = await this.repository.getContactByIdWithScope(contactId, scope);
      if (!scopedContact) {
        return false;
      }
    }

    return this.repository.deleteContact(contactId, userId);
  }
}
