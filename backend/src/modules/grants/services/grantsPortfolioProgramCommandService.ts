import {
  CreateGrantProgramDTO,
  GrantProgram,
  UpdateGrantProgramDTO,
} from '@app-types/grant';
import type { GrantsPortfolioDependencies } from './grantsPortfolioTypes';
import { type GrantRow } from './grantsShared';

export class GrantsPortfolioProgramCommandService {
  constructor(private readonly deps: GrantsPortfolioDependencies) {}

  async createProgram(
    organizationId: string,
    userId: string,
    data: CreateGrantProgramDTO
  ): Promise<GrantProgram> {
    const result = await this.deps.db.query<GrantRow>(
      `INSERT INTO grant_programs (
         organization_id,
         funder_id,
         name,
         program_code,
         fiscal_year,
         jurisdiction,
         status,
         application_open_at,
         application_due_at,
         award_date,
         expiry_date,
         total_budget,
         notes,
         created_by,
         modified_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'draft'), $8, $9, $10, $11, $12, $13, $14, $14)
       RETURNING *`,
      [
        organizationId,
        data.funder_id,
        data.name,
        data.program_code ?? null,
        data.fiscal_year ?? null,
        data.jurisdiction,
        data.status ?? 'draft',
        data.application_open_at ?? null,
        data.application_due_at ?? null,
        data.award_date ?? null,
        data.expiry_date ?? null,
        data.total_budget ?? null,
        data.notes ?? null,
        userId,
      ]
    );

    const program = this.deps.mapProgram(result.rows[0]);
    await this.deps.recordActivity(this.deps.db, organizationId, userId, {
      entity_type: 'program',
      entity_id: program.id,
      action: 'created',
      notes: `Created grant program ${program.name}`,
      metadata: { funder_id: program.funder_id, jurisdiction: program.jurisdiction },
    });
    return program;
  }

  async updateProgram(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateGrantProgramDTO
  ): Promise<GrantProgram | null> {
    const result = await this.deps.db.query<GrantRow>(
      `UPDATE grant_programs
       SET
         funder_id = COALESCE($3, funder_id),
         name = COALESCE($4, name),
         program_code = COALESCE($5, program_code),
         fiscal_year = COALESCE($6, fiscal_year),
         jurisdiction = COALESCE($7, jurisdiction),
         status = COALESCE($8, status),
         application_open_at = COALESCE($9, application_open_at),
         application_due_at = COALESCE($10, application_due_at),
         award_date = COALESCE($11, award_date),
         expiry_date = COALESCE($12, expiry_date),
         total_budget = COALESCE($13, total_budget),
         notes = COALESCE($14, notes),
         modified_by = $15,
         updated_at = NOW()
       WHERE organization_id = $1
         AND id = $2
       RETURNING *`,
      [
        organizationId,
        id,
        data.funder_id ?? null,
        data.name ?? null,
        data.program_code ?? null,
        data.fiscal_year ?? null,
        data.jurisdiction ?? null,
        data.status ?? null,
        data.application_open_at ?? null,
        data.application_due_at ?? null,
        data.award_date ?? null,
        data.expiry_date ?? null,
        data.total_budget ?? null,
        data.notes ?? null,
        userId,
      ]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const program = this.deps.mapProgram(result.rows[0]);
    await this.deps.recordActivity(this.deps.db, organizationId, userId, {
      entity_type: 'program',
      entity_id: id,
      action: 'updated',
      notes: `Updated grant program ${program.name}`,
      metadata: { program_id: id },
    });
    return program;
  }

  async deleteProgram(
    organizationId: string,
    id: string,
    userId: string | null
  ): Promise<boolean> {
    const existing = await this.deps.fetchById(
      this.deps.db,
      `SELECT
         gp.*,
         f.name AS funder_name,
         COALESCE((SELECT COUNT(*) FROM grants g WHERE g.organization_id = gp.organization_id AND g.program_id = gp.id), 0)::text AS grant_count,
         COALESCE((SELECT SUM(amount) FROM grants g WHERE g.organization_id = gp.organization_id AND g.program_id = gp.id), 0)::text AS total_amount
       FROM grant_programs gp
       LEFT JOIN grant_funders f ON f.id = gp.funder_id
       WHERE gp.organization_id = $1
         AND gp.id = $2`,
      [organizationId, id],
      this.deps.mapProgram
    );
    const deleted = await this.deps.deleteById('grant_programs', organizationId, id);
    if (deleted) {
      await this.deps.recordActivity(this.deps.db, organizationId, userId, {
        entity_type: 'program',
        entity_id: id,
        action: 'deleted',
        notes: existing ? `Deleted grant program ${existing.name}` : 'Deleted grant program',
        metadata: { program_id: id },
      });
    }
    return deleted;
  }
}
