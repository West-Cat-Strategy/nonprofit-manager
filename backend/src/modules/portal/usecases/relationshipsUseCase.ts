import { logPortalActivity } from '@services/domains/integration';
import {
  getPortalPointpersonContext as getPortalPointpersonContextService,
  resolvePortalCaseSelection,
} from '@services/portalPointpersonService';
import { PortalRepository } from '../repositories/portalRepository';

const normalizeUserAgent = (userAgent?: string | string[]): string | null =>
  typeof userAgent === 'string' ? userAgent : null;

export class PortalRelationshipsUseCase {
  constructor(private readonly repository: PortalRepository) {}

  list(contactId: string): Promise<unknown[]> {
    return this.repository.getPortalRelationships(contactId);
  }

  async create(input: {
    contactId: string;
    portalUserId: string;
    relatedContactId?: string;
    relatedContact?: {
      first_name: string;
      last_name: string;
      email?: string;
      phone?: string;
    };
    relationshipType: string;
    relationshipLabel?: string;
    notes?: string;
    ipAddress?: string;
    userAgent?: string | string[];
  }): Promise<Record<string, unknown> | null> {
    let relatedContactId = input.relatedContactId;

    if (!relatedContactId && input.relatedContact) {
      relatedContactId = await this.repository.createRelatedContact({
        firstName: input.relatedContact.first_name,
        lastName: input.relatedContact.last_name,
        email: input.relatedContact.email,
        phone: input.relatedContact.phone,
      });
    }

    if (!relatedContactId) {
      return null;
    }

    const row = await this.repository.createPortalRelationship({
      contactId: input.contactId,
      relatedContactId,
      relationshipType: input.relationshipType,
      relationshipLabel: input.relationshipLabel,
      notes: input.notes,
    });

    await logPortalActivity({
      portalUserId: input.portalUserId,
      action: 'relationship.add',
      details: `Added relationship ${row.id as string}`,
      ipAddress: input.ipAddress,
      userAgent: normalizeUserAgent(input.userAgent),
    });

    return row;
  }

  async update(input: {
    contactId: string;
    relationshipId: string;
    portalUserId: string;
    relationshipType?: string;
    relationshipLabel?: string | null;
    notes?: string | null;
    ipAddress?: string;
    userAgent?: string | string[];
  }): Promise<Record<string, unknown> | null | 'no_updates'> {
    if (
      input.relationshipType === undefined &&
      input.relationshipLabel === undefined &&
      input.notes === undefined
    ) {
      return 'no_updates';
    }

    const updated = await this.repository.updatePortalRelationship({
      contactId: input.contactId,
      relationshipId: input.relationshipId,
      relationshipType: input.relationshipType,
      relationshipLabel: input.relationshipLabel,
      notes: input.notes,
    });

    if (!updated) {
      return null;
    }

    await logPortalActivity({
      portalUserId: input.portalUserId,
      action: 'relationship.update',
      details: `Updated relationship ${input.relationshipId}`,
      ipAddress: input.ipAddress,
      userAgent: normalizeUserAgent(input.userAgent),
    });

    return updated;
  }

  async remove(input: {
    contactId: string;
    relationshipId: string;
    portalUserId: string;
    ipAddress?: string;
    userAgent?: string | string[];
  }): Promise<boolean> {
    const deleted = await this.repository.deletePortalRelationship(input.contactId, input.relationshipId);
    if (!deleted) {
      return false;
    }

    await logPortalActivity({
      portalUserId: input.portalUserId,
      action: 'relationship.remove',
      details: `Removed relationship ${input.relationshipId}`,
      ipAddress: input.ipAddress,
      userAgent: normalizeUserAgent(input.userAgent),
    });

    return true;
  }

  async getPointpersonContext(contactId: string, requestedCaseId?: string): Promise<Record<string, unknown>> {
    const context = await getPortalPointpersonContextService(contactId);
    const selection = await resolvePortalCaseSelection(contactId, requestedCaseId);

    return {
      ...context,
      selected_case_id: selection.selected_case_id,
      selected_pointperson_user_id: selection.selected_pointperson_user_id,
    } as Record<string, unknown>;
  }
}
