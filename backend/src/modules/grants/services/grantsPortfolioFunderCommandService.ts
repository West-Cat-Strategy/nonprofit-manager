import {
  CreateGrantFunderDTO,
  GrantFunder,
  UpdateGrantFunderDTO,
} from '@app-types/grant';
import type { GrantsPortfolioDependencies } from './grantsPortfolioTypes';
import { type GrantRow } from './grantsShared';

export class GrantsPortfolioFunderCommandService {
  constructor(private readonly deps: GrantsPortfolioDependencies) {}

  async createFunder(
    organizationId: string,
    userId: string,
    data: CreateGrantFunderDTO
  ): Promise<GrantFunder> {
    const result = await this.deps.db.query<GrantRow>(
      `INSERT INTO grant_funders (
         organization_id,
         name,
         jurisdiction,
         funder_type,
         contact_name,
         contact_email,
         contact_phone,
         website,
         notes,
         active,
         created_by,
         modified_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, true), $11, $11)
       RETURNING *`,
      [
        organizationId,
        data.name,
        data.jurisdiction,
        data.funder_type ?? null,
        data.contact_name ?? null,
        data.contact_email ?? null,
        data.contact_phone ?? null,
        data.website ?? null,
        data.notes ?? null,
        data.active ?? true,
        userId,
      ]
    );

    const row = result.rows[0];
    await this.deps.recordActivity(this.deps.db, organizationId, userId, {
      entity_type: 'funder',
      entity_id: row.id,
      action: 'created',
      notes: `Created funder ${data.name}`,
      metadata: { name: data.name, jurisdiction: data.jurisdiction },
    });
    return this.deps.mapFunder(row);
  }

  async updateFunder(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateGrantFunderDTO
  ): Promise<GrantFunder | null> {
    const result = await this.deps.db.query<GrantRow>(
      `UPDATE grant_funders
       SET
         name = COALESCE($3, name),
         jurisdiction = COALESCE($4, jurisdiction),
         funder_type = COALESCE($5, funder_type),
         contact_name = COALESCE($6, contact_name),
         contact_email = COALESCE($7, contact_email),
         contact_phone = COALESCE($8, contact_phone),
         website = COALESCE($9, website),
         notes = COALESCE($10, notes),
         active = COALESCE($11, active),
         modified_by = $12,
         updated_at = NOW()
       WHERE organization_id = $1
         AND id = $2
       RETURNING *`,
      [
        organizationId,
        id,
        data.name ?? null,
        data.jurisdiction ?? null,
        data.funder_type ?? null,
        data.contact_name ?? null,
        data.contact_email ?? null,
        data.contact_phone ?? null,
        data.website ?? null,
        data.notes ?? null,
        data.active ?? null,
        userId,
      ]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const funder = this.deps.mapFunder(result.rows[0]);
    await this.deps.recordActivity(this.deps.db, organizationId, userId, {
      entity_type: 'funder',
      entity_id: id,
      action: 'updated',
      notes: `Updated funder ${funder.name}`,
      metadata: { funder_id: id },
    });
    return funder;
  }

  async deleteFunder(
    organizationId: string,
    id: string,
    userId: string | null
  ): Promise<boolean> {
    const existing = await this.deps.fetchById(
      this.deps.db,
      `SELECT
         f.*,
         COALESCE((SELECT COUNT(*) FROM grants g WHERE g.organization_id = f.organization_id AND g.funder_id = f.id), 0)::text AS grant_count,
         COALESCE((SELECT SUM(amount) FROM grants g WHERE g.organization_id = f.organization_id AND g.funder_id = f.id), 0)::text AS total_amount
       FROM grant_funders f
       WHERE f.organization_id = $1
         AND f.id = $2`,
      [organizationId, id],
      this.deps.mapFunder
    );
    const deleted = await this.deps.deleteById('grant_funders', organizationId, id);
    if (deleted) {
      await this.deps.recordActivity(this.deps.db, organizationId, userId, {
        entity_type: 'funder',
        entity_id: id,
        action: 'deleted',
        notes: existing ? `Deleted funder ${existing.name}` : 'Deleted funder',
        metadata: { funder_id: id },
      });
    }
    return deleted;
  }
}
