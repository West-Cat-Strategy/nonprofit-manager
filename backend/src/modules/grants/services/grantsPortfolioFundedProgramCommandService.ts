import type {
  CreateFundedProgramDTO,
  FundedProgram,
  UpdateFundedProgramDTO,
} from '@app-types/grant';
import type { GrantsPortfolioDependencies } from './grantsPortfolioTypes';
import { type GrantRow } from './grantsShared';

export class GrantsPortfolioFundedProgramCommandService {
  constructor(private readonly deps: GrantsPortfolioDependencies) {}

  async createFundedProgram(
    organizationId: string,
    userId: string,
    data: CreateFundedProgramDTO
  ): Promise<FundedProgram> {
    const result = await this.deps.db.query<GrantRow>(
      `INSERT INTO funded_programs (
         organization_id,
         recipient_organization_id,
         name,
         description,
         owner_user_id,
         status,
         start_date,
         end_date,
         budget,
         notes,
         created_by,
         modified_by
       )
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'planned'), $7, $8, $9, $10, $11, $11)
       RETURNING *`,
      [
        organizationId,
        data.recipient_organization_id,
        data.name,
        data.description ?? null,
        data.owner_user_id ?? null,
        data.status ?? 'planned',
        data.start_date ?? null,
        data.end_date ?? null,
        data.budget ?? null,
        data.notes ?? null,
        userId,
      ]
    );

    const program = this.deps.mapFundedProgram(result.rows[0]);
    await this.deps.recordActivity(this.deps.db, organizationId, userId, {
      entity_type: 'funded_program',
      entity_id: program.id,
      action: 'created',
      notes: `Created funded program ${program.name}`,
      metadata: { recipient_organization_id: program.recipient_organization_id },
    });
    return program;
  }

  async updateFundedProgram(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateFundedProgramDTO
  ): Promise<FundedProgram | null> {
    const result = await this.deps.db.query<GrantRow>(
      `UPDATE funded_programs
       SET
         recipient_organization_id = COALESCE($3, recipient_organization_id),
         name = COALESCE($4, name),
         description = COALESCE($5, description),
         owner_user_id = COALESCE($6, owner_user_id),
         status = COALESCE($7, status),
         start_date = COALESCE($8, start_date),
         end_date = COALESCE($9, end_date),
         budget = COALESCE($10, budget),
         notes = COALESCE($11, notes),
         modified_by = $12,
         updated_at = NOW()
       WHERE organization_id = $1
         AND id = $2
       RETURNING *`,
      [
        organizationId,
        id,
        data.recipient_organization_id ?? null,
        data.name ?? null,
        data.description ?? null,
        data.owner_user_id ?? null,
        data.status ?? null,
        data.start_date ?? null,
        data.end_date ?? null,
        data.budget ?? null,
        data.notes ?? null,
        userId,
      ]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const fundedProgram = this.deps.mapFundedProgram(result.rows[0]);
    await this.deps.recordActivity(this.deps.db, organizationId, userId, {
      entity_type: 'funded_program',
      entity_id: id,
      action: 'updated',
      notes: `Updated funded program ${fundedProgram.name}`,
      metadata: { funded_program_id: id },
    });
    return fundedProgram;
  }

  async deleteFundedProgram(
    organizationId: string,
    id: string,
    userId: string | null
  ): Promise<boolean> {
    const existing = await this.deps.fetchById(
      this.deps.db,
      `SELECT
         fp.*,
         r.name AS recipient_name,
         u.first_name || ' ' || u.last_name AS owner_name,
         COALESCE((SELECT COUNT(*) FROM grants g WHERE g.organization_id = fp.organization_id AND g.funded_program_id = fp.id), 0)::text AS grant_count,
         COALESCE((SELECT SUM(amount) FROM grants g WHERE g.organization_id = fp.organization_id AND g.funded_program_id = fp.id), 0)::text AS total_amount
       FROM funded_programs fp
       LEFT JOIN recipient_organizations r ON r.id = fp.recipient_organization_id
       LEFT JOIN users u ON u.id = fp.owner_user_id
       WHERE fp.organization_id = $1
         AND fp.id = $2`,
      [organizationId, id],
      this.deps.mapFundedProgram
    );
    const deleted = await this.deps.deleteById('funded_programs', organizationId, id);
    if (deleted) {
      await this.deps.recordActivity(this.deps.db, organizationId, userId, {
        entity_type: 'funded_program',
        entity_id: id,
        action: 'deleted',
        notes: existing ? `Deleted funded program ${existing.name}` : 'Deleted funded program',
        metadata: { funded_program_id: id },
      });
    }
    return deleted;
  }
}

