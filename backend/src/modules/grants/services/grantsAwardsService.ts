import type {
  CreateGrantAwardDTO,
  CreateGrantDisbursementDTO,
  GrantAward,
  GrantDisbursement,
  GrantListFilters,
  PaginatedGrantResult,
  UpdateGrantAwardDTO,
  UpdateGrantDisbursementDTO,
} from '@app-types/grant';
import { resolveSort } from '@utils/queryHelpers';
import { addSearchCondition, normalizeGrantNumber, type GrantRow } from './grantsShared';
import { GrantsServiceCore } from './grantsServiceCore';

type SummaryInvalidationPort = {
  invalidateSummaryCache(organizationId: string): Promise<void>;
};

export class GrantsAwardsService {
  constructor(
    private readonly core: GrantsServiceCore,
    private readonly summaryService: SummaryInvalidationPort
  ) {}

  async listGrants(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<GrantAward>> {
    const values: unknown[] = [organizationId];
    const conditions = ['g.organization_id = $1'];
    addSearchCondition(
      conditions,
      values,
      ['g.grant_number', 'g.title', 'f.name', 'gp.name', 'ro.name', 'fp.name'],
      filters.search
    );

    if (filters.status) {
      values.push(filters.status);
      conditions.push(`g.status = $${values.length}`);
    }

    if (filters.funder_id) {
      values.push(filters.funder_id);
      conditions.push(`g.funder_id = $${values.length}`);
    }

    if (filters.program_id) {
      values.push(filters.program_id);
      conditions.push(`g.program_id = $${values.length}`);
    }

    if (filters.recipient_organization_id) {
      values.push(filters.recipient_organization_id);
      conditions.push(`g.recipient_organization_id = $${values.length}`);
    }

    if (filters.funded_program_id) {
      values.push(filters.funded_program_id);
      conditions.push(`g.funded_program_id = $${values.length}`);
    }

    if (filters.jurisdiction) {
      values.push(filters.jurisdiction);
      conditions.push(`g.jurisdiction = $${values.length}`);
    }

    if (filters.fiscal_year) {
      values.push(filters.fiscal_year);
      conditions.push(`COALESCE(g.fiscal_year, '') = $${values.length}`);
    }

    if (filters.due_before) {
      values.push(filters.due_before);
      conditions.push(
        `COALESCE(g.expiry_date, g.closeout_due_at, g.next_report_due_at) <= $${values.length}`
      );
    }

    if (filters.due_after) {
      values.push(filters.due_after);
      conditions.push(
        `COALESCE(g.expiry_date, g.closeout_due_at, g.next_report_due_at) >= $${values.length}`
      );
    }

    if (filters.min_amount !== undefined) {
      values.push(filters.min_amount);
      conditions.push(`g.amount >= $${values.length}`);
    }

    if (filters.max_amount !== undefined) {
      values.push(filters.max_amount);
      conditions.push(`g.amount <= $${values.length}`);
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const sort = resolveSort(
      filters.sort_by,
      filters.sort_order,
      {
        grant_number: 'g.grant_number',
        title: 'g.title',
        status: 'g.status',
        amount: 'g.amount',
        award_date: 'g.award_date',
        expiry_date: 'g.expiry_date',
        next_report_due_at: 'g.next_report_due_at',
        updated_at: 'g.updated_at',
      },
      'updated_at'
    );

    return this.core.paginate({
      baseFrom:
        'grants g LEFT JOIN grant_funders f ON f.id = g.funder_id LEFT JOIN grant_programs gp ON gp.id = g.program_id LEFT JOIN recipient_organizations ro ON ro.id = g.recipient_organization_id LEFT JOIN funded_programs fp ON fp.id = g.funded_program_id',
      selectColumns: `
        g.*,
        f.name AS funder_name,
        gp.name AS program_name,
        ro.name AS recipient_name,
        fp.name AS funded_program_name,
        COALESCE((SELECT COUNT(*) FROM grant_disbursements d WHERE d.organization_id = g.organization_id AND d.grant_id = g.id), 0)::text AS disbursement_count,
        COALESCE((SELECT COUNT(*) FROM grant_reports r WHERE r.organization_id = g.organization_id AND r.grant_id = g.id), 0)::text AS report_count,
        GREATEST(g.amount - g.disbursed_amount, 0)::text AS outstanding_amount
      `,
      conditions,
      values,
      orderBy: `${sort.sortColumn} ${sort.sortOrder}, g.updated_at DESC`,
      page,
      limit,
      mapper: (row) => this.core.mapGrant(row),
    });
  }

  async getGrantById(organizationId: string, id: string): Promise<GrantAward | null> {
    return this.core.fetchById(
      this.core.db,
      `SELECT
         g.*,
         f.name AS funder_name,
         gp.name AS program_name,
         ro.name AS recipient_name,
         fp.name AS funded_program_name,
         COALESCE((SELECT COUNT(*) FROM grant_disbursements d WHERE d.organization_id = g.organization_id AND d.grant_id = g.id), 0)::text AS disbursement_count,
         COALESCE((SELECT COUNT(*) FROM grant_reports r WHERE r.organization_id = g.organization_id AND r.grant_id = g.id), 0)::text AS report_count,
         GREATEST(g.amount - g.disbursed_amount, 0)::text AS outstanding_amount
       FROM grants g
       LEFT JOIN grant_funders f ON f.id = g.funder_id
       LEFT JOIN grant_programs gp ON gp.id = g.program_id
       LEFT JOIN recipient_organizations ro ON ro.id = g.recipient_organization_id
       LEFT JOIN funded_programs fp ON fp.id = g.funded_program_id
       WHERE g.organization_id = $1
         AND g.id = $2`,
      [organizationId, id],
      (row) => this.core.mapGrant(row)
    );
  }

  async createGrant(
    organizationId: string,
    userId: string,
    data: CreateGrantAwardDTO
  ): Promise<GrantAward> {
    const grant = await this.core.withTransaction(async (client) => {
      const grantNumber = data.grant_number || normalizeGrantNumber('GRT');
      const result = await client.query<GrantRow>(
        `INSERT INTO grants (
           organization_id,
           grant_number,
           title,
           application_id,
           funder_id,
           program_id,
           recipient_organization_id,
           funded_program_id,
           status,
           amount,
           committed_amount,
           disbursed_amount,
           currency,
           fiscal_year,
           jurisdiction,
           award_date,
           start_date,
           end_date,
           expiry_date,
           reporting_frequency,
           next_report_due_at,
           closeout_due_at,
           notes,
           created_by,
           modified_by
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, 'active'), $10, $11, 0, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $23)
         RETURNING *`,
        [
          organizationId,
          grantNumber,
          data.title,
          data.application_id ?? null,
          data.funder_id,
          data.program_id ?? null,
          data.recipient_organization_id ?? null,
          data.funded_program_id ?? null,
          data.status ?? 'active',
          data.amount,
          data.committed_amount ?? data.amount,
          data.currency ?? 'CAD',
          data.fiscal_year ?? null,
          data.jurisdiction,
          data.award_date ?? null,
          data.start_date ?? null,
          data.end_date ?? null,
          data.expiry_date ?? null,
          data.reporting_frequency ?? null,
          data.next_report_due_at ?? null,
          data.closeout_due_at ?? null,
          data.notes ?? null,
          userId,
        ]
      );

      const grant = this.core.mapGrant(result.rows[0]);
      if (data.application_id) {
        await client.query(
          `UPDATE grant_applications
           SET grant_id = $3,
               status = 'approved',
               approved_amount = COALESCE($4, approved_amount),
               decision_at = COALESCE(decision_at, NOW()),
               modified_by = $5,
               updated_at = NOW()
           WHERE organization_id = $1
             AND id = $2`,
          [organizationId, data.application_id, grant.id, grant.amount, userId]
        );
      }

      await this.core.recordActivity(client, organizationId, userId, {
        grant_id: grant.id,
        entity_type: 'award',
        entity_id: grant.id,
        action: 'created',
        notes: `Created grant ${grant.grant_number}`,
        metadata: {
          grant_number: grant.grant_number,
          application_id: data.application_id ?? null,
          funder_id: data.funder_id,
        },
      });

      return grant;
    });
    await this.summaryService.invalidateSummaryCache(organizationId);
    return grant;
  }

  async updateGrant(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateGrantAwardDTO
  ): Promise<GrantAward | null> {
    const result = await this.core.db.query<GrantRow>(
      `UPDATE grants
       SET
         grant_number = COALESCE($3, grant_number),
         title = COALESCE($4, title),
         application_id = COALESCE($5, application_id),
         funder_id = COALESCE($6, funder_id),
         program_id = COALESCE($7, program_id),
         recipient_organization_id = COALESCE($8, recipient_organization_id),
         funded_program_id = COALESCE($9, funded_program_id),
         status = COALESCE($10, status),
         amount = COALESCE($11, amount),
         committed_amount = COALESCE($12, committed_amount),
         disbursed_amount = COALESCE($13, disbursed_amount),
         currency = COALESCE($14, currency),
         fiscal_year = COALESCE($15, fiscal_year),
         jurisdiction = COALESCE($16, jurisdiction),
         award_date = COALESCE($17, award_date),
         start_date = COALESCE($18, start_date),
         end_date = COALESCE($19, end_date),
         expiry_date = COALESCE($20, expiry_date),
         reporting_frequency = COALESCE($21, reporting_frequency),
         next_report_due_at = COALESCE($22, next_report_due_at),
         closeout_due_at = COALESCE($23, closeout_due_at),
         notes = COALESCE($24, notes),
         modified_by = $25,
         updated_at = NOW()
       WHERE organization_id = $1
         AND id = $2
       RETURNING *`,
      [
        organizationId,
        id,
        data.grant_number ?? null,
        data.title ?? null,
        data.application_id ?? null,
        data.funder_id ?? null,
        data.program_id ?? null,
        data.recipient_organization_id ?? null,
        data.funded_program_id ?? null,
        data.status ?? null,
        data.amount ?? null,
        data.committed_amount ?? null,
        data.disbursed_amount ?? null,
        data.currency ?? null,
        data.fiscal_year ?? null,
        data.jurisdiction ?? null,
        data.award_date ?? null,
        data.start_date ?? null,
        data.end_date ?? null,
        data.expiry_date ?? null,
        data.reporting_frequency ?? null,
        data.next_report_due_at ?? null,
        data.closeout_due_at ?? null,
        data.notes ?? null,
        userId,
      ]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const grant = this.core.mapGrant(result.rows[0]);
    await this.core.recordActivity(this.core.db, organizationId, userId, {
      grant_id: id,
      entity_type: 'award',
      entity_id: id,
      action: 'updated',
      notes: `Updated grant ${grant.grant_number}`,
      metadata: { grant_id: id },
    });
    await this.summaryService.invalidateSummaryCache(organizationId);
    return grant;
  }

  async deleteGrant(
    organizationId: string,
    id: string,
    userId: string | null
  ): Promise<boolean> {
    const existing = await this.getGrantById(organizationId, id);
    const deleted = await this.core.deleteById('grants', organizationId, id);
    if (deleted) {
      await this.core.recordActivity(this.core.db, organizationId, userId, {
        grant_id: id,
        entity_type: 'award',
        entity_id: id,
        action: 'deleted',
        notes: existing ? `Deleted grant ${existing.grant_number}` : 'Deleted grant',
        metadata: { grant_id: id },
      });
      await this.summaryService.invalidateSummaryCache(organizationId);
    }
    return deleted;
  }

  async listDisbursements(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<GrantDisbursement>> {
    const values: unknown[] = [organizationId];
    const conditions = ['d.organization_id = $1'];
    addSearchCondition(
      conditions,
      values,
      ['g.grant_number', 'g.title', 'd.tranche_label', 'd.method'],
      filters.search
    );

    if (filters.status) {
      values.push(filters.status);
      conditions.push(`d.status = $${values.length}`);
    }

    if (filters.funder_id) {
      values.push(filters.funder_id);
      conditions.push(`g.funder_id = $${values.length}`);
    }

    if (filters.program_id) {
      values.push(filters.program_id);
      conditions.push(`g.program_id = $${values.length}`);
    }

    if (filters.recipient_organization_id) {
      values.push(filters.recipient_organization_id);
      conditions.push(`g.recipient_organization_id = $${values.length}`);
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const sort = resolveSort(
      filters.sort_by,
      filters.sort_order,
      {
        scheduled_date: 'd.scheduled_date',
        paid_at: 'd.paid_at',
        amount: 'd.amount',
        status: 'd.status',
        updated_at: 'd.updated_at',
      },
      'scheduled_date'
    );

    return this.core.paginate({
      baseFrom:
        'grant_disbursements d INNER JOIN grants g ON g.id = d.grant_id LEFT JOIN grant_funders f ON f.id = g.funder_id LEFT JOIN grant_programs gp ON gp.id = g.program_id LEFT JOIN recipient_organizations ro ON ro.id = g.recipient_organization_id',
      selectColumns: `
        d.*,
        g.grant_number,
        g.title AS grant_title
      `,
      conditions,
      values,
      orderBy: `${sort.sortColumn} ${sort.sortOrder}, d.scheduled_date ASC`,
      page,
      limit,
      mapper: (row) => this.core.mapDisbursement(row),
    });
  }

  async getDisbursementById(
    organizationId: string,
    id: string
  ): Promise<GrantDisbursement | null> {
    return this.core.fetchById(
      this.core.db,
      `SELECT
         d.*,
         g.grant_number,
         g.title AS grant_title
       FROM grant_disbursements d
       INNER JOIN grants g ON g.id = d.grant_id
       WHERE d.organization_id = $1
         AND d.id = $2`,
      [organizationId, id],
      (row) => this.core.mapDisbursement(row)
    );
  }

  async createDisbursement(
    organizationId: string,
    userId: string,
    data: CreateGrantDisbursementDTO
  ): Promise<GrantDisbursement> {
    const disbursement = await this.core.withTransaction(async (client) => {
      const result = await client.query<GrantRow>(
        `INSERT INTO grant_disbursements (
          organization_id,
           grant_id,
           tranche_label,
           scheduled_date,
           paid_at,
           amount,
           currency,
           status,
           method,
           notes,
           created_by,
           modified_by
         )
         VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'CAD'), COALESCE($8, 'scheduled'), $9, $10, $11, $11)
         RETURNING *`,
        [
          organizationId,
          data.grant_id,
          data.tranche_label ?? null,
          data.scheduled_date ?? null,
          data.paid_at ?? null,
          data.amount,
          data.currency ?? 'CAD',
          data.status ?? 'scheduled',
          data.method ?? null,
          data.notes ?? null,
          userId,
        ]
      );

      const disbursement = this.core.mapDisbursement(result.rows[0]);
      await this.core.refreshGrantRollup(client, organizationId, data.grant_id, userId);
      await this.core.recordActivity(client, organizationId, userId, {
        grant_id: data.grant_id,
        entity_type: 'disbursement',
        entity_id: disbursement.id,
        action: 'created',
        notes: `Created disbursement for ${disbursement.amount.toFixed(2)}`,
        metadata: {
          grant_id: data.grant_id,
          amount: disbursement.amount,
        },
      });
      return disbursement;
    });
    await this.summaryService.invalidateSummaryCache(organizationId);
    return disbursement;
  }

  async updateDisbursement(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateGrantDisbursementDTO
  ): Promise<GrantDisbursement | null> {
    const disbursement = await this.core.withTransaction(async (client) => {
      const result = await client.query<GrantRow>(
        `UPDATE grant_disbursements
         SET
           grant_id = COALESCE($3, grant_id),
           tranche_label = COALESCE($4, tranche_label),
           scheduled_date = COALESCE($5, scheduled_date),
           paid_at = COALESCE($6, paid_at),
           amount = COALESCE($7, amount),
           currency = COALESCE($8, currency),
           status = COALESCE($9, status),
           method = COALESCE($10, method),
           notes = COALESCE($11, notes),
           modified_by = $12,
           updated_at = NOW()
         WHERE organization_id = $1
           AND id = $2
         RETURNING *`,
        [
          organizationId,
          id,
          data.grant_id ?? null,
          data.tranche_label ?? null,
          data.scheduled_date ?? null,
          data.paid_at ?? null,
          data.amount ?? null,
          data.currency ?? null,
          data.status ?? null,
          data.method ?? null,
          data.notes ?? null,
          userId,
        ]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const disbursement = this.core.mapDisbursement(result.rows[0]);
      await this.core.refreshGrantRollup(client, organizationId, disbursement.grant_id, userId);
      await this.core.recordActivity(client, organizationId, userId, {
        grant_id: disbursement.grant_id,
        entity_type: 'disbursement',
        entity_id: disbursement.id,
        action: 'updated',
        notes: `Updated disbursement for ${disbursement.grant_number}`,
        metadata: { disbursement_id: disbursement.id },
      });
      return disbursement;
    });
    if (disbursement) {
      await this.summaryService.invalidateSummaryCache(organizationId);
    }
    return disbursement;
  }

  async deleteDisbursement(
    organizationId: string,
    id: string,
    userId: string | null
  ): Promise<boolean> {
    const deleted = await this.core.withTransaction(async (client) => {
      const current = await this.getDisbursementById(organizationId, id);
      if (!current) {
        return false;
      }

      const deleteResult = await client.query(
        `DELETE FROM grant_disbursements
         WHERE organization_id = $1
           AND id = $2`,
        [organizationId, id]
      );

      if (deleteResult.rowCount && deleteResult.rowCount > 0) {
        await this.core.refreshGrantRollup(client, organizationId, current.grant_id, userId);
        await this.core.recordActivity(client, organizationId, userId, {
          grant_id: current.grant_id,
          entity_type: 'disbursement',
          entity_id: id,
          action: 'deleted',
          notes: `Deleted disbursement ${current.id}`,
          metadata: { disbursement_id: id },
        });
        return true;
      }

      return false;
    });
    if (deleted) {
      await this.summaryService.invalidateSummaryCache(organizationId);
    }
    return deleted;
  }
}
