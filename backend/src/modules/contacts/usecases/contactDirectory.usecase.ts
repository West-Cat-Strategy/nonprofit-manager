import type {
  Contact,
  ContactFilters,
  ContactLookupItem,
  ContactMergePreview,
  ContactMergeRequest,
  ContactMergeResult,
  ContactRole,
  CreateContactDTO,
  PaginationParams,
  PaginatedContacts,
  UpdateContactDTO,
} from '@app-types/contact';
import type { DataScopeFilter } from '@app-types/dataScope';
import { invitationService, syncUserRole } from '@services/domains/integration';
import { services } from '@container/services';
import type { PoolClient } from 'pg';
import type { ContactDirectoryPort } from '../types/ports';
import { buildContactMergePreview } from '../shared/contactMerge';

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

const normalizeVolunteerMergePreviewRow = (
  row: Record<string, unknown> | null | undefined
): Record<string, unknown> | null => {
  if (!row) {
    return null;
  }

  return {
    ...row,
    availability_notes:
      row.availability_notes ?? row.availability ?? null,
  };
};

export class ContactDirectoryUseCase {
  constructor(private readonly repository: ContactDirectoryPort) {}

  private async ensureStaffUserAccount(
    contactId: string,
    roles: string[],
    createdBy: string,
    client: PoolClient
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
        await this.repository.updateUserRole(existingUser.id, targetRole, client);
      }
      await syncUserRole(existingUser.id, targetRole, client);
      return { role: targetRole };
    }

    try {
      const invitation = await invitationService.createInvitation(
        {
          email: contact.email,
          role: targetRole,
          message: `Auto-invite created from contact role assignment for ${contact.firstName} ${contact.lastName}`,
        },
        createdBy,
        client
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
    scope?: DataScopeFilter,
    viewerRole?: string
  ): Promise<PaginatedContacts> {
    return this.repository.getContacts(filters, pagination, scope, viewerRole);
  }

  async lookup(
    query: { q: string; limit?: number; is_active?: boolean },
    scope?: DataScopeFilter
  ): Promise<ContactLookupItem[]> {
    return this.repository.lookupContacts(query, scope);
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

  async getById(
    contactId: string,
    scope?: DataScopeFilter,
    viewerRole?: string
  ): Promise<(Contact & { roles: string[] }) | null> {
    const contact = scope
      ? await this.repository.getContactByIdWithScope(contactId, scope, viewerRole)
      : await this.repository.getContactById(contactId, viewerRole);

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
    userId: string,
    viewerRole?: string
  ): Promise<Contact & { roles: string[]; staffInvitation: { inviteUrl?: string; role?: string } | null }> {
    const rolesInput = Array.isArray(payload.roles) ? payload.roles : [];
    const createPayload: CreateContactDTO = {
      ...payload,
      roles: undefined,
    };

    const client = await services.pool.connect();
    try {
      await client.query('BEGIN');

      const created = await this.repository.createContact(createPayload, userId, viewerRole, client);
      let assignedRoles: string[] = [];
      let staffInvitation: { inviteUrl?: string; role?: string } | null = null;

      if (rolesInput.length > 0) {
        const roleRecords = await this.repository.setRolesForContact(
          created.contact_id,
          rolesInput,
          userId,
          client
        );
        assignedRoles = roleRecords.map((role) => role.name);
        staffInvitation = await this.ensureStaffUserAccount(
          created.contact_id,
          assignedRoles,
          userId,
          client
        );
      }

      const finalContact = (await this.repository.getContactById(created.contact_id, viewerRole)) || created;

      await client.query('COMMIT');

      return {
        ...finalContact,
        roles: assignedRoles,
        staffInvitation,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async update(
    contactId: string,
    payload: UpdateContactDTO,
    userId: string,
    scope?: DataScopeFilter,
    viewerRole?: string
  ): Promise<(Contact & { roles: string[]; staffInvitation: { inviteUrl?: string; role?: string } | null }) | null> {
    const client = await services.pool.connect();
    try {
      await client.query('BEGIN');

      if (scope) {
        const scopedContact = await this.repository.getContactByIdWithScope(
          contactId,
          scope,
          viewerRole
        );
        if (!scopedContact) {
          await client.query('ROLLBACK');
          return null;
        }
      }

      const rolesInput = Array.isArray(payload.roles) ? payload.roles : undefined;
      const updatePayload: UpdateContactDTO = {
        ...payload,
        roles: undefined,
      };

      const updated = await this.repository.updateContact(
        contactId,
        updatePayload,
        userId,
        viewerRole,
        client
      );
      if (!updated) {
        await client.query('ROLLBACK');
        return null;
      }

      const assignedRoles = rolesInput
        ? (await this.repository.setRolesForContact(contactId, rolesInput, userId, client)).map(
            (role) => role.name
          )
        : (await this.repository.getRolesForContact(contactId, client)).map((role) => role.name);
      let staffInvitation: { inviteUrl?: string; role?: string } | null = null;

      if (rolesInput && assignedRoles.length > 0) {
        staffInvitation = await this.ensureStaffUserAccount(contactId, assignedRoles, userId, client);
      }

      const finalContact = (await this.repository.getContactById(contactId, viewerRole)) || updated;

      await client.query('COMMIT');

      return {
        ...finalContact,
        roles: assignedRoles,
        staffInvitation,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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

  async getMergePreview(
    sourceContactId: string,
    targetContactId: string,
    scope?: DataScopeFilter,
    viewerRole?: string
  ): Promise<ContactMergePreview | null> {
    const [sourceContact, targetContact] = await Promise.all([
      scope
        ? this.repository.getContactByIdWithScope(sourceContactId, scope, viewerRole)
        : this.repository.getContactById(sourceContactId, viewerRole),
      scope
        ? this.repository.getContactByIdWithScope(targetContactId, scope, viewerRole)
        : this.repository.getContactById(targetContactId, viewerRole),
    ]);

    if (!sourceContact || !targetContact) {
      return null;
    }

    const [sourceRoles, targetRoles] = await Promise.all([
      this.repository.getRolesForContact(sourceContactId),
      this.repository.getRolesForContact(targetContactId),
    ]);

    const volunteerRows = await services.pool.query<Record<string, unknown>>(
      `
        SELECT *
        FROM volunteers
        WHERE contact_id = ANY($1::uuid[])
        ORDER BY is_active DESC NULLS LAST, updated_at DESC, created_at ASC, id ASC
      `,
      [[sourceContactId, targetContactId]]
    );

    const sourceVolunteer = normalizeVolunteerMergePreviewRow(
      volunteerRows.rows.find((row) => row.contact_id === sourceContactId)
    );
    const targetVolunteer = normalizeVolunteerMergePreviewRow(
      volunteerRows.rows.find((row) => row.contact_id === targetContactId)
    );

    return buildContactMergePreview(
      { ...sourceContact, roles: sourceRoles.map((role) => role.name) },
      { ...targetContact, roles: targetRoles.map((role) => role.name) },
      {
        sourceVolunteer,
        targetVolunteer,
      }
    );
  }

  async merge(
    sourceContactId: string,
    payload: ContactMergeRequest,
    userId: string,
    scope?: DataScopeFilter,
    viewerRole?: string
  ): Promise<ContactMergeResult | null> {
    if (scope) {
      const scopedSource = await this.repository.getContactByIdWithScope(sourceContactId, scope, viewerRole);
      const scopedTarget = await this.repository.getContactByIdWithScope(
        payload.target_contact_id,
        scope,
        viewerRole
      );
      if (!scopedSource || !scopedTarget) {
        return null;
      }
    }

    return this.repository.mergeContacts(sourceContactId, payload, userId, scope, viewerRole);
  }
}
