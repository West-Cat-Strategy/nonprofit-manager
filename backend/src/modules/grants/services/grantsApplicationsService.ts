import {
  CreateGrantApplicationDTO,
  CreateGrantAwardDTO,
  GrantApplication,
  GrantApplicationStatus,
  GrantListFilters,
  PaginatedGrantResult,
  UpdateGrantApplicationDTO,
} from '@app-types/grant';
import { resolveSort } from '@utils/queryHelpers';
import { addSearchCondition, normalizeGrantNumber, type GrantRow } from './grantsShared';
import { GrantsServiceCore } from './grantsServiceCore';

type SummaryInvalidationPort = {
  invalidateSummaryCache(organizationId: string): Promise<void>;
};

export class GrantsApplicationsService {
  constructor(
    private readonly core: GrantsServiceCore,
    private readonly summaryService: SummaryInvalidationPort
  ) {}

  async listApplications(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<GrantApplication>> {
    const values: unknown[] = [organizationId];
    const conditions = ['a.organization_id = $1'];
    addSearchCondition(conditions, values, ['a.application_number', 'a.title', 'a.outcome_reason'], filters.search);

    if (filters.funder_id) {
      values.push(filters.funder_id);
      conditions.push(`a.funder_id = $${values.length}`);
    }

    if (filters.program_id) {
      values.push(filters.program_id);
      conditions.push(`a.program_id = $${values.length}`);
    }

    if (filters.recipient_organization_id) {
      values.push(filters.recipient_organization_id);
      conditions.push(`a.recipient_organization_id = $${values.length}`);
    }

    if (filters.funded_program_id) {
      values.push(filters.funded_program_id);
      conditions.push(`a.funded_program_id = $${values.length}`);
    }

    if (filters.status) {
      values.push(filters.status);
      conditions.push(`a.status = $${values.length}`);
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const sort = resolveSort(
      filters.sort_by,
      filters.sort_order,
      {
        application_number: 'a.application_number',
        title: 'a.title',
        status: 'a.status',
        requested_amount: 'a.requested_amount',
        submitted_at: 'a.submitted_at',
        due_at: 'a.due_at',
        updated_at: 'a.updated_at',
      },
      'updated_at'
    );

    return this.core.paginate({
      baseFrom:
        'grant_applications a LEFT JOIN grant_funders f ON f.id = a.funder_id LEFT JOIN grant_programs gp ON gp.id = a.program_id LEFT JOIN recipient_organizations ro ON ro.id = a.recipient_organization_id LEFT JOIN funded_programs fp ON fp.id = a.funded_program_id',
      selectColumns: `
        a.*,
        f.name AS funder_name,
        gp.name AS program_name,
        ro.name AS recipient_name,
        fp.name AS funded_program_name
      `,
      conditions,
      values,
      orderBy: `${sort.sortColumn} ${sort.sortOrder}, a.created_at DESC`,
      page,
      limit,
      mapper: (row) => this.core.mapApplication(row),
    });
  }

  async getApplicationById(
    organizationId: string,
    id: string
  ): Promise<GrantApplication | null> {
    return this.core.fetchById(
      this.core.db,
      `SELECT
         a.*,
         f.name AS funder_name,
         gp.name AS program_name,
         ro.name AS recipient_name,
         fp.name AS funded_program_name
       FROM grant_applications a
       LEFT JOIN grant_funders f ON f.id = a.funder_id
       LEFT JOIN grant_programs gp ON gp.id = a.program_id
       LEFT JOIN recipient_organizations ro ON ro.id = a.recipient_organization_id
       LEFT JOIN funded_programs fp ON fp.id = a.funded_program_id
       WHERE a.organization_id = $1
         AND a.id = $2`,
      [organizationId, id],
      (row) => this.core.mapApplication(row)
    );
  }

  async createApplication(
    organizationId: string,
    userId: string,
    data: CreateGrantApplicationDTO
  ): Promise<GrantApplication> {
    const applicationNumber = data.application_number || normalizeGrantNumber('APP');
    const result = await this.core.db.query<GrantRow>(
      `INSERT INTO grant_applications (
         organization_id,
         application_number,
         title,
         funder_id,
         program_id,
         recipient_organization_id,
         funded_program_id,
         status,
         requested_amount,
         approved_amount,
         currency,
         submitted_at,
         reviewed_at,
         decision_at,
         due_at,
         outcome_reason,
         notes,
         created_by,
         modified_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 'draft'), $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $18)
       RETURNING *`,
      [
        organizationId,
        applicationNumber,
        data.title,
        data.funder_id,
        data.program_id ?? null,
        data.recipient_organization_id ?? null,
        data.funded_program_id ?? null,
        data.status ?? 'draft',
        data.requested_amount,
        data.approved_amount ?? null,
        data.currency ?? 'CAD',
        data.submitted_at ?? null,
        data.reviewed_at ?? null,
        data.decision_at ?? null,
        data.due_at ?? null,
        data.outcome_reason ?? null,
        data.notes ?? null,
        userId,
      ]
    );

    const application = this.core.mapApplication(result.rows[0]);
    await this.core.recordActivity(this.core.db, organizationId, userId, {
      entity_type: 'application',
      entity_id: application.id,
      action: 'created',
      notes: `Created application ${application.application_number}`,
      metadata: {
        application_number: application.application_number,
        funder_id: application.funder_id,
      },
    });
    await this.summaryService.invalidateSummaryCache(organizationId);
    return application;
  }

  async updateApplication(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateGrantApplicationDTO
  ): Promise<GrantApplication | null> {
    const result = await this.core.db.query<GrantRow>(
      `UPDATE grant_applications
       SET
         application_number = COALESCE($3, application_number),
         title = COALESCE($4, title),
         funder_id = COALESCE($5, funder_id),
         program_id = COALESCE($6, program_id),
         recipient_organization_id = COALESCE($7, recipient_organization_id),
         funded_program_id = COALESCE($8, funded_program_id),
         status = COALESCE($9, status),
         requested_amount = COALESCE($10, requested_amount),
         approved_amount = COALESCE($11, approved_amount),
         currency = COALESCE($12, currency),
         submitted_at = COALESCE($13, submitted_at),
         reviewed_at = COALESCE($14, reviewed_at),
         decision_at = COALESCE($15, decision_at),
         due_at = COALESCE($16, due_at),
         outcome_reason = COALESCE($17, outcome_reason),
         notes = COALESCE($18, notes),
         modified_by = $19,
         updated_at = NOW()
       WHERE organization_id = $1
         AND id = $2
       RETURNING *`,
      [
        organizationId,
        id,
        data.application_number ?? null,
        data.title ?? null,
        data.funder_id ?? null,
        data.program_id ?? null,
        data.recipient_organization_id ?? null,
        data.funded_program_id ?? null,
        data.status ?? null,
        data.requested_amount ?? null,
        data.approved_amount ?? null,
        data.currency ?? null,
        data.submitted_at ?? null,
        data.reviewed_at ?? null,
        data.decision_at ?? null,
        data.due_at ?? null,
        data.outcome_reason ?? null,
        data.notes ?? null,
        userId,
      ]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const application = this.core.mapApplication(result.rows[0]);
    await this.core.recordActivity(this.core.db, organizationId, userId, {
      entity_type: 'application',
      entity_id: id,
      action: 'updated',
      notes: `Updated application ${application.application_number}`,
      metadata: { application_id: id },
    });
    await this.summaryService.invalidateSummaryCache(organizationId);
    return application;
  }

  async updateApplicationStatus(
    organizationId: string,
    id: string,
    userId: string,
    status: GrantApplicationStatus,
    data: {
      reviewed_at?: string | null;
      decision_at?: string | null;
      approved_amount?: number | null;
      outcome_reason?: string | null;
      notes?: string | null;
    }
  ): Promise<GrantApplication | null> {
    return this.updateApplication(organizationId, id, userId, {
      status,
      reviewed_at: data.reviewed_at ?? null,
      decision_at: data.decision_at ?? null,
      approved_amount: data.approved_amount ?? null,
      outcome_reason: data.outcome_reason ?? null,
      notes: data.notes ?? null,
    });
  }

  async deleteApplication(
    organizationId: string,
    id: string,
    userId: string | null
  ): Promise<boolean> {
    const existing = await this.getApplicationById(organizationId, id);
    const deleted = await this.core.deleteById('grant_applications', organizationId, id);
    if (deleted) {
      await this.core.recordActivity(this.core.db, organizationId, userId, {
        entity_type: 'application',
        entity_id: id,
        action: 'deleted',
        notes: existing ? `Deleted application ${existing.application_number}` : 'Deleted application',
        metadata: { application_id: id },
      });
      await this.summaryService.invalidateSummaryCache(organizationId);
    }
    return deleted;
  }

  async awardApplication(
    organizationId: string,
    applicationId: string,
    userId: string,
    data: CreateGrantAwardDTO
  ): Promise<{ application: GrantApplication; grant: ReturnType<GrantsServiceCore['mapGrant']> } | null> {
    const awardResult = await this.core.withTransaction(async (client) => {
      const applicationResult = await client.query<GrantRow>(
        `SELECT *
         FROM grant_applications
         WHERE organization_id = $1
           AND id = $2
         FOR UPDATE`,
        [organizationId, applicationId]
      );

      if (applicationResult.rows.length === 0) {
        return null;
      }

      const application = this.core.mapApplication(applicationResult.rows[0]);
      const grantNumber = data.grant_number || normalizeGrantNumber('GRT');
      const grantResult = await client.query<GrantRow>(
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
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, 'active'), $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $23)
         RETURNING *`,
        [
          organizationId,
          grantNumber,
          data.title || application.title,
          applicationId,
          data.funder_id || application.funder_id,
          data.program_id ?? application.program_id,
          data.recipient_organization_id ?? application.recipient_organization_id,
          data.funded_program_id ?? application.funded_program_id,
          data.status ?? 'active',
          data.amount,
          data.committed_amount ?? data.amount,
          data.currency ?? application.currency ?? 'CAD',
          data.fiscal_year ?? null,
          data.jurisdiction,
          data.award_date ?? new Date().toISOString().slice(0, 10),
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

      const grant = this.core.mapGrant(grantResult.rows[0]);
      const updatedApplication = await client.query<GrantRow>(
        `UPDATE grant_applications
         SET
           grant_id = $3,
           status = 'approved',
           approved_amount = COALESCE($4, approved_amount),
           decision_at = COALESCE($5, NOW()),
           reviewed_at = COALESCE($6, reviewed_at),
           modified_by = $7,
           updated_at = NOW()
         WHERE organization_id = $1
           AND id = $2
         RETURNING *`,
        [
          organizationId,
          applicationId,
          grant.id,
          grant.amount,
          data.decision_at ?? null,
          data.reviewed_at ?? null,
          userId,
        ]
      );

      await this.core.recordActivity(client, organizationId, userId, {
        grant_id: grant.id,
        entity_type: 'award',
        entity_id: grant.id,
        action: 'created_from_application',
        notes: `Award created from application ${application.application_number}`,
        metadata: {
          application_id: applicationId,
          grant_number: grant.grant_number,
        },
      });

      return {
        application: this.core.mapApplication(updatedApplication.rows[0]),
        grant,
      };
    });
    if (awardResult) {
      await this.summaryService.invalidateSummaryCache(organizationId);
    }
    return awardResult;
  }
}
