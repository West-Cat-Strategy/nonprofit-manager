import {
  CreateRecipientOrganizationDTO,
  RecipientOrganization,
  UpdateRecipientOrganizationDTO,
} from '@app-types/grant';
import type { GrantsPortfolioDependencies } from './grantsPortfolioTypes';
import { type GrantRow } from './grantsShared';

export class GrantsPortfolioRecipientCommandService {
  constructor(private readonly deps: GrantsPortfolioDependencies) {}

  async createRecipient(
    organizationId: string,
    userId: string,
    data: CreateRecipientOrganizationDTO
  ): Promise<RecipientOrganization> {
    const result = await this.deps.db.query<GrantRow>(
      `INSERT INTO recipient_organizations (
         organization_id,
         name,
         legal_name,
         jurisdiction,
         province,
         city,
         contact_name,
         contact_email,
         contact_phone,
       website,
       status,
       notes,
       active,
       created_by,
       modified_by
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11, 'active'), $12, COALESCE($13, true), $14, $14)
       RETURNING *`,
      [
        organizationId,
        data.name,
        data.legal_name ?? null,
        data.jurisdiction ?? null,
        data.province ?? null,
        data.city ?? null,
        data.contact_name ?? null,
        data.contact_email ?? null,
        data.contact_phone ?? null,
        data.website ?? null,
        data.status ?? 'active',
        data.notes ?? null,
        data.active ?? true,
        userId,
      ]
    );

    const recipient = this.deps.mapRecipient(result.rows[0]);
    await this.deps.recordActivity(this.deps.db, organizationId, userId, {
      entity_type: 'recipient',
      entity_id: recipient.id,
      action: 'created',
      notes: `Created recipient ${recipient.name}`,
      metadata: { recipient_id: recipient.id },
    });
    return recipient;
  }

  async updateRecipient(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateRecipientOrganizationDTO
  ): Promise<RecipientOrganization | null> {
    const result = await this.deps.db.query<GrantRow>(
      `UPDATE recipient_organizations
       SET
         name = COALESCE($3, name),
         legal_name = COALESCE($4, legal_name),
         jurisdiction = COALESCE($5, jurisdiction),
         province = COALESCE($6, province),
         city = COALESCE($7, city),
         contact_name = COALESCE($8, contact_name),
         contact_email = COALESCE($9, contact_email),
         contact_phone = COALESCE($10, contact_phone),
         website = COALESCE($11, website),
         status = COALESCE($12, status),
         notes = COALESCE($13, notes),
         active = COALESCE($14, active),
         modified_by = $15,
         updated_at = NOW()
       WHERE organization_id = $1
         AND id = $2
       RETURNING *`,
      [
        organizationId,
        id,
        data.name ?? null,
        data.legal_name ?? null,
        data.jurisdiction ?? null,
        data.province ?? null,
        data.city ?? null,
        data.contact_name ?? null,
        data.contact_email ?? null,
        data.contact_phone ?? null,
        data.website ?? null,
        data.status ?? null,
        data.notes ?? null,
        data.active ?? null,
        userId,
      ]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const recipient = this.deps.mapRecipient(result.rows[0]);
    await this.deps.recordActivity(this.deps.db, organizationId, userId, {
      entity_type: 'recipient',
      entity_id: id,
      action: 'updated',
      notes: `Updated recipient ${recipient.name}`,
      metadata: { recipient_id: id },
    });
    return recipient;
  }

  async deleteRecipient(
    organizationId: string,
    id: string,
    userId: string | null
  ): Promise<boolean> {
    const existing = await this.deps.fetchById(
      this.deps.db,
      `SELECT
         r.*,
         COALESCE((SELECT COUNT(*) FROM funded_programs fp WHERE fp.organization_id = r.organization_id AND fp.recipient_organization_id = r.id), 0)::text AS funded_program_count,
         COALESCE((SELECT COUNT(*) FROM grants g WHERE g.organization_id = r.organization_id AND g.recipient_organization_id = r.id), 0)::text AS grant_count,
         COALESCE((SELECT SUM(amount) FROM grants g WHERE g.organization_id = r.organization_id AND g.recipient_organization_id = r.id), 0)::text AS total_amount
       FROM recipient_organizations r
       WHERE r.organization_id = $1
         AND r.id = $2`,
      [organizationId, id],
      this.deps.mapRecipient
    );
    const deleted = await this.deps.deleteById('recipient_organizations', organizationId, id);
    if (deleted) {
      await this.deps.recordActivity(this.deps.db, organizationId, userId, {
        entity_type: 'recipient',
        entity_id: id,
        action: 'deleted',
        notes: existing ? `Deleted recipient ${existing.name}` : 'Deleted recipient',
        metadata: { recipient_id: id },
      });
    }
    return deleted;
  }
}
