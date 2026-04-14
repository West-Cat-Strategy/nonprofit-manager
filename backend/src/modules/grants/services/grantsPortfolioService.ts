import type { Pool } from 'pg';
import { resolveSort } from '@utils/queryHelpers';
import type {
  CreateGrantActivityLogDTO,
  CreateGrantFunderDTO,
  CreateGrantProgramDTO,
  CreateFundedProgramDTO,
  CreateRecipientOrganizationDTO,
  FundedProgram,
  GrantFunder,
  GrantListFilters,
  GrantProgram,
  PaginatedGrantResult,
  RecipientOrganization,
  UpdateGrantFunderDTO,
  UpdateGrantProgramDTO,
  UpdateFundedProgramDTO,
  UpdateRecipientOrganizationDTO,
} from '@app-types/grant';
import { addSearchCondition, type GrantPaginateOptions, type GrantQueryClient, type GrantRow } from './grantsShared';

interface GrantsPortfolioDependencies {
  db: Pool;
  paginate: <T>(options: GrantPaginateOptions<T>) => Promise<PaginatedGrantResult<T>>;
  fetchById: <T>(
    query: GrantQueryClient,
    sql: string,
    values: unknown[],
    mapper: (row: GrantRow) => T
  ) => Promise<T | null>;
  deleteById: (table: string, organizationId: string, id: string) => Promise<boolean>;
  recordActivity: (
    client: GrantQueryClient,
    organizationId: string,
    userId: string | null,
    data: CreateGrantActivityLogDTO
  ) => Promise<void>;
  mapFunder: (row: GrantRow) => GrantFunder;
  mapProgram: (row: GrantRow) => GrantProgram;
  mapRecipient: (row: GrantRow) => RecipientOrganization;
  mapFundedProgram: (row: GrantRow) => FundedProgram;
}

export class GrantsPortfolioService {
  constructor(private readonly deps: GrantsPortfolioDependencies) {}

  async listFunders(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<GrantFunder>> {
    const values: unknown[] = [organizationId];
    const conditions = ['f.organization_id = $1'];
    addSearchCondition(conditions, values, ['f.name', 'f.funder_type', 'f.contact_name'], filters.search);

    if (filters.jurisdiction) {
      values.push(filters.jurisdiction);
      conditions.push(`f.jurisdiction = $${values.length}`);
    }

    if (filters.status === 'active') {
      conditions.push('f.active = true');
    } else if (filters.status === 'inactive' || filters.status === 'archived') {
      conditions.push('f.active = false');
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const sort = resolveSort(
      filters.sort_by,
      filters.sort_order,
      {
        name: 'f.name',
        jurisdiction: 'f.jurisdiction',
        active: 'f.active',
        created_at: 'f.created_at',
        updated_at: 'f.updated_at',
      },
      'name'
    );

    return this.deps.paginate({
      baseFrom: 'grant_funders f',
      selectColumns: `
        f.*,
        COALESCE((SELECT COUNT(*) FROM grants g WHERE g.organization_id = f.organization_id AND g.funder_id = f.id), 0)::text AS grant_count,
        COALESCE((SELECT SUM(amount) FROM grants g WHERE g.organization_id = f.organization_id AND g.funder_id = f.id), 0)::text AS total_amount
      `,
      conditions,
      values,
      orderBy: `${sort.sortColumn} ${sort.sortOrder}, f.name ASC`,
      page,
      limit,
      mapper: this.deps.mapFunder,
    });
  }

  async getFunderById(organizationId: string, id: string): Promise<GrantFunder | null> {
    return this.deps.fetchById(
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
  }

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

  async deleteFunder(organizationId: string, id: string, userId: string | null): Promise<boolean> {
    const existing = await this.getFunderById(organizationId, id);
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

  async listPrograms(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<GrantProgram>> {
    const values: unknown[] = [organizationId];
    const conditions = ['gp.organization_id = $1'];
    addSearchCondition(conditions, values, ['gp.name', 'gp.program_code'], filters.search);

    if (filters.funder_id) {
      values.push(filters.funder_id);
      conditions.push(`gp.funder_id = $${values.length}`);
    }

    if (filters.jurisdiction) {
      values.push(filters.jurisdiction);
      conditions.push(`gp.jurisdiction = $${values.length}`);
    }

    if (filters.status) {
      values.push(filters.status);
      conditions.push(`gp.status = $${values.length}`);
    }

    if (filters.fiscal_year) {
      values.push(filters.fiscal_year);
      conditions.push(`COALESCE(gp.fiscal_year, '') = $${values.length}`);
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const sort = resolveSort(
      filters.sort_by,
      filters.sort_order,
      {
        name: 'gp.name',
        fiscal_year: 'gp.fiscal_year',
        status: 'gp.status',
        application_due_at: 'gp.application_due_at',
        award_date: 'gp.award_date',
        updated_at: 'gp.updated_at',
      },
      'updated_at'
    );

    return this.deps.paginate({
      baseFrom: 'grant_programs gp LEFT JOIN grant_funders f ON f.id = gp.funder_id',
      selectColumns: `
        gp.*,
        f.name AS funder_name,
        COALESCE((SELECT COUNT(*) FROM grants g WHERE g.organization_id = gp.organization_id AND g.program_id = gp.id), 0)::text AS grant_count,
        COALESCE((SELECT SUM(amount) FROM grants g WHERE g.organization_id = gp.organization_id AND g.program_id = gp.id), 0)::text AS total_amount
      `,
      conditions,
      values,
      orderBy: `${sort.sortColumn} ${sort.sortOrder}, gp.name ASC`,
      page,
      limit,
      mapper: this.deps.mapProgram,
    });
  }

  async getProgramById(organizationId: string, id: string): Promise<GrantProgram | null> {
    return this.deps.fetchById(
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
  }

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

  async deleteProgram(organizationId: string, id: string, userId: string | null): Promise<boolean> {
    const existing = await this.getProgramById(organizationId, id);
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

  async listRecipients(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<RecipientOrganization>> {
    const values: unknown[] = [organizationId];
    const conditions = ['r.organization_id = $1'];
    addSearchCondition(conditions, values, ['r.name', 'r.legal_name', 'r.contact_name'], filters.search);

    if (filters.jurisdiction) {
      values.push(filters.jurisdiction);
      conditions.push(`r.jurisdiction = $${values.length}`);
    }

    if (filters.status) {
      if (filters.status === 'active') {
        conditions.push('r.active = true');
      } else if (filters.status === 'inactive' || filters.status === 'archived') {
        conditions.push('r.active = false');
      } else {
        values.push(filters.status);
        conditions.push(`r.status = $${values.length}`);
      }
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const sort = resolveSort(
      filters.sort_by,
      filters.sort_order,
      {
        name: 'r.name',
        status: 'r.status',
        active: 'r.active',
        updated_at: 'r.updated_at',
      },
      'updated_at'
    );

    return this.deps.paginate({
      baseFrom: 'recipient_organizations r',
      selectColumns: `
        r.*,
        COALESCE((SELECT COUNT(*) FROM funded_programs fp WHERE fp.organization_id = r.organization_id AND fp.recipient_organization_id = r.id), 0)::text AS funded_program_count,
        COALESCE((SELECT COUNT(*) FROM grants g WHERE g.organization_id = r.organization_id AND g.recipient_organization_id = r.id), 0)::text AS grant_count,
        COALESCE((SELECT SUM(amount) FROM grants g WHERE g.organization_id = r.organization_id AND g.recipient_organization_id = r.id), 0)::text AS total_amount
      `,
      conditions,
      values,
      orderBy: `${sort.sortColumn} ${sort.sortOrder}, r.name ASC`,
      page,
      limit,
      mapper: this.deps.mapRecipient,
    });
  }

  async getRecipientById(
    organizationId: string,
    id: string
  ): Promise<RecipientOrganization | null> {
    return this.deps.fetchById(
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
  }

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
    const existing = await this.getRecipientById(organizationId, id);
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

  async listFundedPrograms(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<FundedProgram>> {
    const values: unknown[] = [organizationId];
    const conditions = ['fp.organization_id = $1'];
    addSearchCondition(conditions, values, ['fp.name', 'fp.description', 'r.name'], filters.search);

    if (filters.recipient_organization_id) {
      values.push(filters.recipient_organization_id);
      conditions.push(`fp.recipient_organization_id = $${values.length}`);
    }

    if (filters.status) {
      values.push(filters.status);
      conditions.push(`fp.status = $${values.length}`);
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const sort = resolveSort(
      filters.sort_by,
      filters.sort_order,
      {
        name: 'fp.name',
        status: 'fp.status',
        start_date: 'fp.start_date',
        end_date: 'fp.end_date',
        updated_at: 'fp.updated_at',
      },
      'updated_at'
    );

    return this.deps.paginate({
      baseFrom: 'funded_programs fp LEFT JOIN recipient_organizations r ON r.id = fp.recipient_organization_id LEFT JOIN users u ON u.id = fp.owner_user_id',
      selectColumns: `
        fp.*,
        r.name AS recipient_name,
        u.first_name || ' ' || u.last_name AS owner_name,
        COALESCE((SELECT COUNT(*) FROM grants g WHERE g.organization_id = fp.organization_id AND g.funded_program_id = fp.id), 0)::text AS grant_count,
        COALESCE((SELECT SUM(amount) FROM grants g WHERE g.organization_id = fp.organization_id AND g.funded_program_id = fp.id), 0)::text AS total_amount
      `,
      conditions,
      values,
      orderBy: `${sort.sortColumn} ${sort.sortOrder}, fp.name ASC`,
      page,
      limit,
      mapper: this.deps.mapFundedProgram,
    });
  }

  async getFundedProgramById(
    organizationId: string,
    id: string
  ): Promise<FundedProgram | null> {
    return this.deps.fetchById(
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
  }

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
    const existing = await this.getFundedProgramById(organizationId, id);
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
