import { randomInt } from 'crypto';
import { Pool } from 'pg';
import pool from '@config/database';
import { buildTabularExport, type GeneratedTabularFile } from '@modules/shared/export/tabularExport';
import { getOffset, resolveSort } from '@utils/queryHelpers';
import type {
  CreateGrantActivityLogDTO,
  CreateGrantApplicationDTO,
  CreateGrantAwardDTO,
  CreateGrantDisbursementDTO,
  CreateGrantDocumentDTO,
  CreateGrantFunderDTO,
  CreateGrantProgramDTO,
  CreateGrantReportDTO,
  CreateFundedProgramDTO,
  CreateRecipientOrganizationDTO,
  FundedProgram,
  GrantActivityLog,
  GrantApplication,
  GrantApplicationStatus,
  GrantAward,
  GrantCalendarItem,
  GrantDisbursement,
  GrantDocument,
  GrantFunder,
  GrantJurisdiction,
  GrantListFilters,
  GrantPagination,
  GrantProgram,
  GrantProgramStatus,
  GrantRecipientStatus,
  GrantReport,
  GrantStatusBreakdownItem,
  GrantSummary,
  PaginatedGrantResult,
  RecipientOrganization,
  UpdateGrantApplicationDTO,
  UpdateGrantAwardDTO,
  UpdateGrantDisbursementDTO,
  UpdateGrantDocumentDTO,
  UpdateGrantFunderDTO,
  UpdateGrantProgramDTO,
  UpdateGrantReportDTO,
  UpdateFundedProgramDTO,
  UpdateRecipientOrganizationDTO,
} from '@app-types/grant';

type QueryClient = Pick<Pool, 'query'>;
type Row = Record<string, any>;

const toNumber = (value: unknown, fallback = 0): number => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toNullableString = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
};

const toIsoString = (value: unknown): string => {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
};

const toNullableIsoString = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return toIsoString(value);
};

const toJsonObject = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Fall through to the empty object.
    }
  }

  return {};
};

const normalizeGrantNumber = (prefix: string): string => {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}`;
  const sequence = String(randomInt(0, 100000)).padStart(5, '0');
  return `${prefix}-${stamp}-${sequence}`;
};

const buildPagination = (
  page: number,
  limit: number,
  total: number
): GrantPagination => ({
  page,
  limit,
  total,
  total_pages: limit > 0 ? Math.ceil(total / limit) : 0,
});

const addSearchCondition = (
  conditions: string[],
  values: unknown[],
  columns: string[],
  search?: string
): void => {
  if (!search || search.trim().length === 0) {
    return;
  }

  values.push(`%${search.trim()}%`);
  const placeholder = `$${values.length}`;
  conditions.push(`(${columns.map((column) => `${column} ILIKE ${placeholder}`).join(' OR ')})`);
};

export class GrantsService {
  constructor(private readonly db: Pool) {}

  private async withTransaction<T>(callback: (client: QueryClient) => Promise<T>): Promise<T> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async fetchById<T>(
    query: QueryClient,
    sql: string,
    values: unknown[],
    mapper: (row: Row) => T
  ): Promise<T | null> {
    const result = await query.query<Row>(sql, values);
    if (result.rows.length === 0) {
      return null;
    }

    return mapper(result.rows[0]);
  }

  private async paginate<T>(options: {
    client?: QueryClient;
    baseFrom: string;
    selectColumns: string;
    conditions: string[];
    values: unknown[];
    orderBy: string;
    page: number;
    limit: number;
    mapper: (row: Row) => T;
  }): Promise<PaginatedGrantResult<T>> {
    const query = options.client ?? this.db;
    const whereSql = options.conditions.length > 0 ? `WHERE ${options.conditions.join(' AND ')}` : '';

    const countResult = await query.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM ${options.baseFrom} ${whereSql}`,
      options.values
    );
    const total = Number(countResult.rows[0]?.count ?? 0);

    const offset = getOffset(options.page, options.limit);
    const rows = await query.query<Row>(
      `SELECT ${options.selectColumns}
       FROM ${options.baseFrom}
       ${whereSql}
       ORDER BY ${options.orderBy}
       LIMIT $${options.values.length + 1}
       OFFSET $${options.values.length + 2}`,
      [...options.values, options.limit, offset]
    );

    return {
      data: rows.rows.map(options.mapper),
      pagination: buildPagination(options.page, options.limit, total),
    };
  }

  private async deleteById(table: string, organizationId: string, id: string): Promise<boolean> {
    const result = await this.db.query(
      `DELETE FROM ${table}
       WHERE organization_id = $1
         AND id = $2`,
      [organizationId, id]
    );

    return result.rowCount !== null && result.rowCount > 0;
  }

  private async recordActivity(
    client: QueryClient,
    organizationId: string,
    userId: string | null,
    data: CreateGrantActivityLogDTO
  ): Promise<void> {
    await client.query(
      `INSERT INTO grant_activity_logs (
         organization_id,
         grant_id,
         entity_type,
         entity_id,
         action,
         notes,
         metadata,
         created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)`,
      [
        organizationId,
        data.grant_id ?? null,
        data.entity_type,
        data.entity_id ?? null,
        data.action,
        data.notes ?? null,
        JSON.stringify(data.metadata ?? {}),
        userId,
      ]
    );
  }

  private async refreshGrantRollup(
    client: QueryClient,
    organizationId: string,
    grantId: string,
    userId: string | null
  ): Promise<void> {
    const grantResult = await client.query<{ amount: string | number | null }>(
      `SELECT amount
       FROM grants
       WHERE organization_id = $1
         AND id = $2`,
      [organizationId, grantId]
    );

    if (grantResult.rows.length === 0) {
      return;
    }

    const totalsResult = await client.query<{ total_disbursed: string | number | null }>(
      `SELECT COALESCE(SUM(amount), 0) AS total_disbursed
       FROM grant_disbursements
       WHERE organization_id = $1
         AND grant_id = $2
         AND status = 'paid'`,
      [organizationId, grantId]
    );

    const nextReportResult = await client.query<{ due_at: string | null }>(
      `SELECT due_at
       FROM grant_reports
       WHERE organization_id = $1
         AND grant_id = $2
         AND status IN ('draft', 'due', 'overdue')
       ORDER BY due_at ASC
       LIMIT 1`,
      [organizationId, grantId]
    );

    const disbursedAmount = toNumber(totalsResult.rows[0]?.total_disbursed ?? 0);
    const awardAmount = toNumber(grantResult.rows[0]?.amount ?? 0);
    const nextReportDue = nextReportResult.rows[0]?.due_at ? nextReportResult.rows[0].due_at : null;

    await client.query(
      `UPDATE grants
       SET disbursed_amount = $3,
           next_report_due_at = $4,
           modified_by = $5,
           updated_at = NOW()
       WHERE organization_id = $1
         AND id = $2`,
      [organizationId, grantId, disbursedAmount, nextReportDue, userId]
    );

    await this.recordActivity(client, organizationId, userId, {
      grant_id: grantId,
      entity_type: 'award',
      entity_id: grantId,
      action: 'rollup_refreshed',
      notes: `Rollup refreshed to ${disbursedAmount.toFixed(2)} of ${awardAmount.toFixed(2)} disbursed`,
      metadata: {
        disbursed_amount: disbursedAmount,
        award_amount: awardAmount,
        next_report_due_at: nextReportDue,
      },
    });
  }

  private mapFunder(row: Row): GrantFunder {
    return {
      id: row.id,
      organization_id: row.organization_id,
      name: row.name,
      jurisdiction: row.jurisdiction,
      funder_type: toNullableString(row.funder_type),
      contact_name: toNullableString(row.contact_name),
      contact_email: toNullableString(row.contact_email),
      contact_phone: toNullableString(row.contact_phone),
      website: toNullableString(row.website),
      notes: toNullableString(row.notes),
      active: Boolean(row.active),
      created_by: toNullableString(row.created_by),
      modified_by: toNullableString(row.modified_by),
      created_at: toIsoString(row.created_at),
      updated_at: toIsoString(row.updated_at),
      grant_count: row.grant_count !== undefined ? toNumber(row.grant_count) : undefined,
      total_amount: row.total_amount !== undefined ? toNumber(row.total_amount) : undefined,
    };
  }

  private mapProgram(row: Row): GrantProgram {
    return {
      id: row.id,
      organization_id: row.organization_id,
      funder_id: row.funder_id,
      funder_name: toNullableString(row.funder_name),
      name: row.name,
      program_code: toNullableString(row.program_code),
      fiscal_year: toNullableString(row.fiscal_year),
      jurisdiction: row.jurisdiction,
      status: row.status as GrantProgramStatus,
      application_open_at: toNullableIsoString(row.application_open_at),
      application_due_at: toNullableIsoString(row.application_due_at),
      award_date: toNullableIsoString(row.award_date),
      expiry_date: toNullableIsoString(row.expiry_date),
      total_budget: toNullableNumber(row.total_budget),
      notes: toNullableString(row.notes),
      created_by: toNullableString(row.created_by),
      modified_by: toNullableString(row.modified_by),
      created_at: toIsoString(row.created_at),
      updated_at: toIsoString(row.updated_at),
      grant_count: row.grant_count !== undefined ? toNumber(row.grant_count) : undefined,
      total_amount: row.total_amount !== undefined ? toNumber(row.total_amount) : undefined,
    };
  }

  private mapRecipient(row: Row): RecipientOrganization {
    return {
      id: row.id,
      organization_id: row.organization_id,
      name: row.name,
      legal_name: toNullableString(row.legal_name),
      jurisdiction: row.jurisdiction ?? null,
      province: toNullableString(row.province),
      city: toNullableString(row.city),
      contact_name: toNullableString(row.contact_name),
      contact_email: toNullableString(row.contact_email),
      contact_phone: toNullableString(row.contact_phone),
      website: toNullableString(row.website),
      status: row.status as GrantRecipientStatus,
      notes: toNullableString(row.notes),
      active: Boolean(row.active),
      created_by: toNullableString(row.created_by),
      modified_by: toNullableString(row.modified_by),
      created_at: toIsoString(row.created_at),
      updated_at: toIsoString(row.updated_at),
      funded_program_count:
        row.funded_program_count !== undefined ? toNumber(row.funded_program_count) : undefined,
      grant_count: row.grant_count !== undefined ? toNumber(row.grant_count) : undefined,
      total_amount: row.total_amount !== undefined ? toNumber(row.total_amount) : undefined,
    };
  }

  private mapFundedProgram(row: Row): FundedProgram {
    return {
      id: row.id,
      organization_id: row.organization_id,
      recipient_organization_id: row.recipient_organization_id,
      recipient_name: toNullableString(row.recipient_name),
      name: row.name,
      description: toNullableString(row.description),
      owner_user_id: toNullableString(row.owner_user_id),
      owner_name: toNullableString(row.owner_name),
      status: row.status,
      start_date: toNullableIsoString(row.start_date),
      end_date: toNullableIsoString(row.end_date),
      budget: toNullableNumber(row.budget),
      notes: toNullableString(row.notes),
      created_by: toNullableString(row.created_by),
      modified_by: toNullableString(row.modified_by),
      created_at: toIsoString(row.created_at),
      updated_at: toIsoString(row.updated_at),
      grant_count: row.grant_count !== undefined ? toNumber(row.grant_count) : undefined,
      total_amount: row.total_amount !== undefined ? toNumber(row.total_amount) : undefined,
    };
  }

  private mapApplication(row: Row): GrantApplication {
    return {
      id: row.id,
      organization_id: row.organization_id,
      application_number: row.application_number,
      title: row.title,
      funder_id: row.funder_id,
      funder_name: toNullableString(row.funder_name),
      program_id: toNullableString(row.program_id),
      program_name: toNullableString(row.program_name),
      recipient_organization_id: toNullableString(row.recipient_organization_id),
      recipient_name: toNullableString(row.recipient_name),
      funded_program_id: toNullableString(row.funded_program_id),
      funded_program_name: toNullableString(row.funded_program_name),
      grant_id: toNullableString(row.grant_id),
      status: row.status,
      requested_amount: toNumber(row.requested_amount),
      approved_amount: toNullableNumber(row.approved_amount),
      currency: row.currency,
      submitted_at: toNullableIsoString(row.submitted_at),
      reviewed_at: toNullableIsoString(row.reviewed_at),
      decision_at: toNullableIsoString(row.decision_at),
      due_at: toNullableIsoString(row.due_at),
      outcome_reason: toNullableString(row.outcome_reason),
      notes: toNullableString(row.notes),
      created_by: toNullableString(row.created_by),
      modified_by: toNullableString(row.modified_by),
      created_at: toIsoString(row.created_at),
      updated_at: toIsoString(row.updated_at),
    };
  }

  private mapGrant(row: Row): GrantAward {
    return {
      id: row.id,
      organization_id: row.organization_id,
      grant_number: row.grant_number,
      title: row.title,
      application_id: toNullableString(row.application_id),
      funder_id: row.funder_id,
      funder_name: toNullableString(row.funder_name),
      program_id: toNullableString(row.program_id),
      program_name: toNullableString(row.program_name),
      recipient_organization_id: toNullableString(row.recipient_organization_id),
      recipient_name: toNullableString(row.recipient_name),
      funded_program_id: toNullableString(row.funded_program_id),
      funded_program_name: toNullableString(row.funded_program_name),
      status: row.status,
      amount: toNumber(row.amount),
      committed_amount: toNumber(row.committed_amount),
      disbursed_amount: toNumber(row.disbursed_amount),
      currency: row.currency,
      fiscal_year: toNullableString(row.fiscal_year),
      jurisdiction: row.jurisdiction,
      award_date: toNullableIsoString(row.award_date),
      start_date: toNullableIsoString(row.start_date),
      end_date: toNullableIsoString(row.end_date),
      expiry_date: toNullableIsoString(row.expiry_date),
      reporting_frequency: toNullableString(row.reporting_frequency) as GrantAward['reporting_frequency'],
      next_report_due_at: toNullableIsoString(row.next_report_due_at),
      closeout_due_at: toNullableIsoString(row.closeout_due_at),
      notes: toNullableString(row.notes),
      created_by: toNullableString(row.created_by),
      modified_by: toNullableString(row.modified_by),
      created_at: toIsoString(row.created_at),
      updated_at: toIsoString(row.updated_at),
      outstanding_amount:
        row.outstanding_amount !== undefined ? toNumber(row.outstanding_amount) : undefined,
      report_count: row.report_count !== undefined ? toNumber(row.report_count) : undefined,
      disbursement_count:
        row.disbursement_count !== undefined ? toNumber(row.disbursement_count) : undefined,
    };
  }

  private mapDisbursement(row: Row): GrantDisbursement {
    return {
      id: row.id,
      organization_id: row.organization_id,
      grant_id: row.grant_id,
      grant_number: toNullableString(row.grant_number),
      grant_title: toNullableString(row.grant_title),
      tranche_label: toNullableString(row.tranche_label),
      scheduled_date: toNullableIsoString(row.scheduled_date),
      paid_at: toNullableIsoString(row.paid_at),
      amount: toNumber(row.amount),
      currency: row.currency,
      status: row.status,
      method: toNullableString(row.method),
      notes: toNullableString(row.notes),
      created_by: toNullableString(row.created_by),
      modified_by: toNullableString(row.modified_by),
      created_at: toIsoString(row.created_at),
      updated_at: toIsoString(row.updated_at),
    };
  }

  private mapReport(row: Row): GrantReport {
    return {
      id: row.id,
      organization_id: row.organization_id,
      grant_id: row.grant_id,
      grant_number: toNullableString(row.grant_number),
      grant_title: toNullableString(row.grant_title),
      report_type: row.report_type,
      period_start: toNullableIsoString(row.period_start),
      period_end: toNullableIsoString(row.period_end),
      due_at: toIsoString(row.due_at),
      submitted_at: toNullableIsoString(row.submitted_at),
      status: row.status,
      summary: toNullableString(row.summary),
      outstanding_items: toNullableString(row.outstanding_items),
      notes: toNullableString(row.notes),
      created_by: toNullableString(row.created_by),
      modified_by: toNullableString(row.modified_by),
      created_at: toIsoString(row.created_at),
      updated_at: toIsoString(row.updated_at),
    };
  }

  private mapDocument(row: Row): GrantDocument {
    return {
      id: row.id,
      organization_id: row.organization_id,
      grant_id: toNullableString(row.grant_id),
      application_id: toNullableString(row.application_id),
      report_id: toNullableString(row.report_id),
      document_type: row.document_type,
      file_name: row.file_name,
      file_url: row.file_url,
      mime_type: row.mime_type,
      file_size: toNumber(row.file_size),
      notes: toNullableString(row.notes),
      uploaded_by: toNullableString(row.uploaded_by),
      created_by: toNullableString(row.created_by),
      modified_by: toNullableString(row.modified_by),
      created_at: toIsoString(row.created_at),
      updated_at: toIsoString(row.updated_at),
    };
  }

  private mapActivity(row: Row): GrantActivityLog {
    return {
      id: row.id,
      organization_id: row.organization_id,
      grant_id: toNullableString(row.grant_id),
      entity_type: row.entity_type,
      entity_id: toNullableString(row.entity_id),
      action: row.action,
      notes: toNullableString(row.notes),
      metadata: toJsonObject(row.metadata),
      created_by: toNullableString(row.created_by),
      created_at: toIsoString(row.created_at),
    };
  }

  private mapCalendarItem(row: Row): GrantCalendarItem {
    return {
      id: row.id,
      grant_id: row.grant_id,
      grant_number: row.grant_number,
      grant_title: row.grant_title,
      item_type: row.item_type,
      status: row.status,
      due_at: toIsoString(row.due_at),
      amount: row.amount === null || row.amount === undefined ? null : toNumber(row.amount),
      recipient_name: toNullableString(row.recipient_name),
      program_name: toNullableString(row.program_name),
    };
  }

  async getSummary(
    organizationId: string,
    filters: { jurisdiction?: GrantJurisdiction; fiscal_year?: string } = {}
  ): Promise<GrantSummary> {
    const values: unknown[] = [organizationId];
    const grantConditions = ['g.organization_id = $1'];

    if (filters.jurisdiction) {
      values.push(filters.jurisdiction);
      grantConditions.push(`g.jurisdiction = $${values.length}`);
    }

    if (filters.fiscal_year) {
      values.push(filters.fiscal_year);
      grantConditions.push(`COALESCE(g.fiscal_year, '') = $${values.length}`);
    }

    const grantWhere = `WHERE ${grantConditions.join(' AND ')}`;

    const [
      funderCountResult,
      programCountResult,
      recipientCountResult,
      fundedProgramCountResult,
      applicationCountResult,
      grantCountsResult,
      statusBreakdownResult,
      jurisdictionBreakdownResult,
      recentActivityResult,
      upcomingItemsResult,
    ] = await Promise.all([
      this.db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM grant_funders WHERE organization_id = $1`,
        [organizationId]
      ),
      this.db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM grant_programs WHERE organization_id = $1`,
        [organizationId]
      ),
      this.db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM recipient_organizations WHERE organization_id = $1`,
        [organizationId]
      ),
      this.db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM funded_programs WHERE organization_id = $1`,
        [organizationId]
      ),
      this.db.query<{
        draft_count: string;
        submitted_count: string;
        reviewed_count: string;
        approved_count: string;
        declined_count: string;
        total_count: string;
      }>(
        `SELECT
           COALESCE(SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END), 0)::text AS draft_count,
           COALESCE(SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END), 0)::text AS submitted_count,
           COALESCE(SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END), 0)::text AS reviewed_count,
           COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0)::text AS approved_count,
           COALESCE(SUM(CASE WHEN status = 'declined' THEN 1 ELSE 0 END), 0)::text AS declined_count,
           COUNT(*)::text AS total_count
         FROM grant_applications
         WHERE organization_id = $1`,
        [organizationId]
      ),
      this.db.query<{
        total_awards: string;
        active_awards: string;
        total_awarded_amount: string;
        committed_amount: string;
        total_disbursed_amount: string;
        outstanding_amount: string;
      }>(
        `SELECT
           COUNT(*)::text AS total_awards,
           COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0)::text AS active_awards,
           COALESCE(SUM(amount), 0)::text AS total_awarded_amount,
           COALESCE(SUM(committed_amount), 0)::text AS committed_amount,
           COALESCE(SUM(disbursed_amount), 0)::text AS total_disbursed_amount,
           COALESCE(SUM(GREATEST(amount - disbursed_amount, 0)), 0)::text AS outstanding_amount
         FROM grants g
         ${grantWhere}`,
        values
      ),
      this.db.query<GrantStatusBreakdownItem>(
        `SELECT status, COUNT(*)::text AS count, COALESCE(SUM(amount), 0)::text AS amount
         FROM grants g
         ${grantWhere}
         GROUP BY status
         ORDER BY status ASC`,
        values
      ),
      this.db.query<GrantStatusBreakdownItem>(
        `SELECT jurisdiction AS status, COUNT(*)::text AS count, COALESCE(SUM(amount), 0)::text AS amount
         FROM grants g
         ${grantWhere}
         GROUP BY jurisdiction
         ORDER BY jurisdiction ASC`,
        values
      ),
      this.db.query<Row>(
        `SELECT
           log.*,
           g.grant_number,
           g.title AS grant_title
         FROM grant_activity_logs log
         LEFT JOIN grants g ON g.id = log.grant_id
         WHERE log.organization_id = $1
         ORDER BY log.created_at DESC
         LIMIT 10`,
        [organizationId]
      ),
      this.db.query<Row>(
        `SELECT *
         FROM (
           SELECT
             r.id,
             r.grant_id,
             g.grant_number,
             g.title AS grant_title,
             'report' AS item_type,
             r.status,
             r.due_at AS due_at,
             NULL::numeric AS amount,
             ro.name AS recipient_name,
             gp.name AS program_name
           FROM grant_reports r
           INNER JOIN grants g ON g.id = r.grant_id
           LEFT JOIN recipient_organizations ro ON ro.id = g.recipient_organization_id
           LEFT JOIN grant_programs gp ON gp.id = g.program_id
           WHERE r.organization_id = $1
             AND r.status IN ('draft', 'due', 'overdue')

           UNION ALL

           SELECT
             d.id,
             d.grant_id,
             g.grant_number,
             g.title AS grant_title,
             'disbursement' AS item_type,
             d.status,
             COALESCE(d.scheduled_date, d.paid_at) AS due_at,
             d.amount,
             ro.name AS recipient_name,
             gp.name AS program_name
           FROM grant_disbursements d
           INNER JOIN grants g ON g.id = d.grant_id
           LEFT JOIN recipient_organizations ro ON ro.id = g.recipient_organization_id
           LEFT JOIN grant_programs gp ON gp.id = g.program_id
           WHERE d.organization_id = $1
             AND d.status IN ('scheduled', 'pending')

           UNION ALL

           SELECT
             a.id,
             COALESCE(a.grant_id, '') AS grant_id,
             COALESCE(g.grant_number, a.application_number) AS grant_number,
             COALESCE(g.title, a.title) AS grant_title,
             'application' AS item_type,
             a.status,
             COALESCE(a.due_at, a.created_at::date) AS due_at,
             a.requested_amount AS amount,
             ro.name AS recipient_name,
             gp.name AS program_name
           FROM grant_applications a
           LEFT JOIN grants g ON g.application_id = a.id
           LEFT JOIN recipient_organizations ro ON ro.id = a.recipient_organization_id
           LEFT JOIN grant_programs gp ON gp.id = a.program_id
           WHERE a.organization_id = $1
             AND a.status IN ('draft', 'submitted', 'under_review')
         ) AS items
         ORDER BY due_at ASC, grant_number ASC
         LIMIT 10`,
        [organizationId]
      ),
    ]);

    const applicationCounts = applicationCountResult.rows[0];
    const grantTotals = grantCountsResult.rows[0];

    return {
      total_funders: toNumber(funderCountResult.rows[0]?.count),
      total_programs: toNumber(programCountResult.rows[0]?.count),
      total_recipients: toNumber(recipientCountResult.rows[0]?.count),
      total_funded_programs: toNumber(fundedProgramCountResult.rows[0]?.count),
      total_applications: toNumber(applicationCounts?.total_count),
      draft_applications: toNumber(applicationCounts?.draft_count),
      submitted_applications: toNumber(applicationCounts?.submitted_count),
      approved_applications: toNumber(applicationCounts?.approved_count),
      declined_applications: toNumber(applicationCounts?.declined_count),
      total_awards: toNumber(grantTotals?.total_awards),
      active_awards: toNumber(grantTotals?.active_awards),
      total_awarded_amount: toNumber(grantTotals?.total_awarded_amount),
      committed_amount: toNumber(grantTotals?.committed_amount),
      total_disbursed_amount: toNumber(grantTotals?.total_disbursed_amount),
      outstanding_amount: toNumber(grantTotals?.outstanding_amount),
      overdue_reports: await this.getOverdueReportCount(organizationId),
      upcoming_reports: await this.getUpcomingReportCount(organizationId),
      upcoming_disbursements: await this.getUpcomingDisbursementCount(organizationId),
      by_status: statusBreakdownResult.rows.map((row) => ({
        status: row.status,
        count: toNumber(row.count),
        amount: toNumber(row.amount),
      })),
      by_jurisdiction: jurisdictionBreakdownResult.rows.map((row) => ({
        status: row.status,
        count: toNumber(row.count),
        amount: toNumber(row.amount),
      })),
      recent_activity: recentActivityResult.rows.map((row) => this.mapActivity(row)),
      upcoming_items: upcomingItemsResult.rows.map((row) => this.mapCalendarItem(row)),
    };
  }

  private async getOverdueReportCount(organizationId: string): Promise<number> {
    const result = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM grant_reports
       WHERE organization_id = $1
         AND due_at < CURRENT_DATE
         AND status IN ('draft', 'due', 'overdue')`,
      [organizationId]
    );
    return toNumber(result.rows[0]?.count);
  }

  private async getUpcomingReportCount(organizationId: string): Promise<number> {
    const result = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM grant_reports
       WHERE organization_id = $1
         AND due_at BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')
         AND status IN ('draft', 'due', 'overdue')`,
      [organizationId]
    );
    return toNumber(result.rows[0]?.count);
  }

  private async getUpcomingDisbursementCount(organizationId: string): Promise<number> {
    const result = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM grant_disbursements
       WHERE organization_id = $1
         AND COALESCE(scheduled_date, paid_at) BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')
         AND status IN ('scheduled', 'pending')`,
      [organizationId]
    );
    return toNumber(result.rows[0]?.count);
  }

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

    return this.paginate({
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
      mapper: (row) => this.mapFunder(row),
    });
  }

  async getFunderById(organizationId: string, id: string): Promise<GrantFunder | null> {
    return this.fetchById(
      this.db,
      `SELECT
         f.*,
         COALESCE((SELECT COUNT(*) FROM grants g WHERE g.organization_id = f.organization_id AND g.funder_id = f.id), 0)::text AS grant_count,
         COALESCE((SELECT SUM(amount) FROM grants g WHERE g.organization_id = f.organization_id AND g.funder_id = f.id), 0)::text AS total_amount
       FROM grant_funders f
       WHERE f.organization_id = $1
         AND f.id = $2`,
      [organizationId, id],
      (row) => this.mapFunder(row)
    );
  }

  async createFunder(
    organizationId: string,
    userId: string,
    data: CreateGrantFunderDTO
  ): Promise<GrantFunder> {
    const result = await this.db.query<Row>(
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
    await this.recordActivity(this.db, organizationId, userId, {
      entity_type: 'funder',
      entity_id: row.id,
      action: 'created',
      notes: `Created funder ${data.name}`,
      metadata: { name: data.name, jurisdiction: data.jurisdiction },
    });
    return this.mapFunder(row);
  }

  async updateFunder(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateGrantFunderDTO
  ): Promise<GrantFunder | null> {
    const result = await this.db.query<Row>(
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

    const funder = this.mapFunder(result.rows[0]);
    await this.recordActivity(this.db, organizationId, userId, {
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
    const deleted = await this.deleteById('grant_funders', organizationId, id);
    if (deleted) {
      await this.recordActivity(this.db, organizationId, userId, {
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

    return this.paginate({
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
      mapper: (row) => this.mapProgram(row),
    });
  }

  async getProgramById(organizationId: string, id: string): Promise<GrantProgram | null> {
    return this.fetchById(
      this.db,
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
      (row) => this.mapProgram(row)
    );
  }

  async createProgram(
    organizationId: string,
    userId: string,
    data: CreateGrantProgramDTO
  ): Promise<GrantProgram> {
    const result = await this.db.query<Row>(
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

    const program = this.mapProgram(result.rows[0]);
    await this.recordActivity(this.db, organizationId, userId, {
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
    const result = await this.db.query<Row>(
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

    const program = this.mapProgram(result.rows[0]);
    await this.recordActivity(this.db, organizationId, userId, {
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
    const deleted = await this.deleteById('grant_programs', organizationId, id);
    if (deleted) {
      await this.recordActivity(this.db, organizationId, userId, {
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

    return this.paginate({
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
      mapper: (row) => this.mapRecipient(row),
    });
  }

  async getRecipientById(
    organizationId: string,
    id: string
  ): Promise<RecipientOrganization | null> {
    return this.fetchById(
      this.db,
      `SELECT
         r.*,
         COALESCE((SELECT COUNT(*) FROM funded_programs fp WHERE fp.organization_id = r.organization_id AND fp.recipient_organization_id = r.id), 0)::text AS funded_program_count,
         COALESCE((SELECT COUNT(*) FROM grants g WHERE g.organization_id = r.organization_id AND g.recipient_organization_id = r.id), 0)::text AS grant_count,
         COALESCE((SELECT SUM(amount) FROM grants g WHERE g.organization_id = r.organization_id AND g.recipient_organization_id = r.id), 0)::text AS total_amount
       FROM recipient_organizations r
       WHERE r.organization_id = $1
         AND r.id = $2`,
      [organizationId, id],
      (row) => this.mapRecipient(row)
    );
  }

  async createRecipient(
    organizationId: string,
    userId: string,
    data: CreateRecipientOrganizationDTO
  ): Promise<RecipientOrganization> {
    const result = await this.db.query<Row>(
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

    const recipient = this.mapRecipient(result.rows[0]);
    await this.recordActivity(this.db, organizationId, userId, {
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
    const result = await this.db.query<Row>(
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

    const recipient = this.mapRecipient(result.rows[0]);
    await this.recordActivity(this.db, organizationId, userId, {
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
    const deleted = await this.deleteById('recipient_organizations', organizationId, id);
    if (deleted) {
      await this.recordActivity(this.db, organizationId, userId, {
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

    return this.paginate({
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
      mapper: (row) => this.mapFundedProgram(row),
    });
  }

  async getFundedProgramById(
    organizationId: string,
    id: string
  ): Promise<FundedProgram | null> {
    return this.fetchById(
      this.db,
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
      (row) => this.mapFundedProgram(row)
    );
  }

  async createFundedProgram(
    organizationId: string,
    userId: string,
    data: CreateFundedProgramDTO
  ): Promise<FundedProgram> {
    const result = await this.db.query<Row>(
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

    const program = this.mapFundedProgram(result.rows[0]);
    await this.recordActivity(this.db, organizationId, userId, {
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
    const result = await this.db.query<Row>(
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

    const fundedProgram = this.mapFundedProgram(result.rows[0]);
    await this.recordActivity(this.db, organizationId, userId, {
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
    const deleted = await this.deleteById('funded_programs', organizationId, id);
    if (deleted) {
      await this.recordActivity(this.db, organizationId, userId, {
        entity_type: 'funded_program',
        entity_id: id,
        action: 'deleted',
        notes: existing ? `Deleted funded program ${existing.name}` : 'Deleted funded program',
        metadata: { funded_program_id: id },
      });
    }
    return deleted;
  }

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

    return this.paginate({
      baseFrom: 'grant_applications a LEFT JOIN grant_funders f ON f.id = a.funder_id LEFT JOIN grant_programs gp ON gp.id = a.program_id LEFT JOIN recipient_organizations ro ON ro.id = a.recipient_organization_id LEFT JOIN funded_programs fp ON fp.id = a.funded_program_id',
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
      mapper: (row) => this.mapApplication(row),
    });
  }

  async getApplicationById(
    organizationId: string,
    id: string
  ): Promise<GrantApplication | null> {
    return this.fetchById(
      this.db,
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
      (row) => this.mapApplication(row)
    );
  }

  async createApplication(
    organizationId: string,
    userId: string,
    data: CreateGrantApplicationDTO
  ): Promise<GrantApplication> {
    const applicationNumber = data.application_number || normalizeGrantNumber('APP');
    const result = await this.db.query<Row>(
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

    const application = this.mapApplication(result.rows[0]);
    await this.recordActivity(this.db, organizationId, userId, {
      entity_type: 'application',
      entity_id: application.id,
      action: 'created',
      notes: `Created application ${application.application_number}`,
      metadata: {
        application_number: application.application_number,
        funder_id: application.funder_id,
      },
    });
    return application;
  }

  async updateApplication(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateGrantApplicationDTO
  ): Promise<GrantApplication | null> {
    const result = await this.db.query<Row>(
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

    const application = this.mapApplication(result.rows[0]);
    await this.recordActivity(this.db, organizationId, userId, {
      entity_type: 'application',
      entity_id: id,
      action: 'updated',
      notes: `Updated application ${application.application_number}`,
      metadata: { application_id: id },
    });
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
    const deleted = await this.deleteById('grant_applications', organizationId, id);
    if (deleted) {
      await this.recordActivity(this.db, organizationId, userId, {
        entity_type: 'application',
        entity_id: id,
        action: 'deleted',
        notes: existing ? `Deleted application ${existing.application_number}` : 'Deleted application',
        metadata: { application_id: id },
      });
    }
    return deleted;
  }

  async awardApplication(
    organizationId: string,
    applicationId: string,
    userId: string,
    data: CreateGrantAwardDTO
  ): Promise<{ application: GrantApplication; grant: GrantAward } | null> {
    return this.withTransaction(async (client) => {
      const applicationResult = await client.query<Row>(
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

      const application = this.mapApplication(applicationResult.rows[0]);
      const grantNumber = data.grant_number || normalizeGrantNumber('GRT');
      const grantResult = await client.query<Row>(
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

      const grant = this.mapGrant(grantResult.rows[0]);
      const updatedApplication = await client.query<Row>(
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

      await this.recordActivity(client, organizationId, userId, {
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
        application: this.mapApplication(updatedApplication.rows[0]),
        grant,
      };
    });
  }

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
      conditions.push(`COALESCE(g.expiry_date, g.closeout_due_at, g.next_report_due_at) <= $${values.length}`);
    }

    if (filters.due_after) {
      values.push(filters.due_after);
      conditions.push(`COALESCE(g.expiry_date, g.closeout_due_at, g.next_report_due_at) >= $${values.length}`);
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

    return this.paginate({
      baseFrom: 'grants g LEFT JOIN grant_funders f ON f.id = g.funder_id LEFT JOIN grant_programs gp ON gp.id = g.program_id LEFT JOIN recipient_organizations ro ON ro.id = g.recipient_organization_id LEFT JOIN funded_programs fp ON fp.id = g.funded_program_id',
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
      mapper: (row) => this.mapGrant(row),
    });
  }

  async getGrantById(organizationId: string, id: string): Promise<GrantAward | null> {
    return this.fetchById(
      this.db,
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
      (row) => this.mapGrant(row)
    );
  }

  async createGrant(
    organizationId: string,
    userId: string,
    data: CreateGrantAwardDTO
  ): Promise<GrantAward> {
    return this.withTransaction(async (client) => {
      const grantNumber = data.grant_number || normalizeGrantNumber('GRT');
      const result = await client.query<Row>(
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

      const grant = this.mapGrant(result.rows[0]);
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

      await this.recordActivity(client, organizationId, userId, {
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
  }

  async updateGrant(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateGrantAwardDTO
  ): Promise<GrantAward | null> {
    const result = await this.db.query<Row>(
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

    const grant = this.mapGrant(result.rows[0]);
    await this.recordActivity(this.db, organizationId, userId, {
      grant_id: id,
      entity_type: 'award',
      entity_id: id,
      action: 'updated',
      notes: `Updated grant ${grant.grant_number}`,
      metadata: { grant_id: id },
    });
    return grant;
  }

  async deleteGrant(
    organizationId: string,
    id: string,
    userId: string | null
  ): Promise<boolean> {
    const existing = await this.getGrantById(organizationId, id);
    const deleted = await this.deleteById('grants', organizationId, id);
    if (deleted) {
      await this.recordActivity(this.db, organizationId, userId, {
        grant_id: id,
        entity_type: 'award',
        entity_id: id,
        action: 'deleted',
        notes: existing ? `Deleted grant ${existing.grant_number}` : 'Deleted grant',
        metadata: { grant_id: id },
      });
    }
    return deleted;
  }

  async listDisbursements(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<GrantDisbursement>> {
    const values: unknown[] = [organizationId];
    const conditions = ['d.organization_id = $1'];
    addSearchCondition(conditions, values, ['g.grant_number', 'g.title', 'd.tranche_label', 'd.method'], filters.search);

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

    return this.paginate({
      baseFrom: 'grant_disbursements d INNER JOIN grants g ON g.id = d.grant_id LEFT JOIN grant_funders f ON f.id = g.funder_id LEFT JOIN grant_programs gp ON gp.id = g.program_id LEFT JOIN recipient_organizations ro ON ro.id = g.recipient_organization_id',
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
      mapper: (row) => this.mapDisbursement(row),
    });
  }

  async getDisbursementById(
    organizationId: string,
    id: string
  ): Promise<GrantDisbursement | null> {
    return this.fetchById(
      this.db,
      `SELECT
         d.*,
         g.grant_number,
         g.title AS grant_title
       FROM grant_disbursements d
       INNER JOIN grants g ON g.id = d.grant_id
       WHERE d.organization_id = $1
         AND d.id = $2`,
      [organizationId, id],
      (row) => this.mapDisbursement(row)
    );
  }

  async createDisbursement(
    organizationId: string,
    userId: string,
    data: CreateGrantDisbursementDTO
  ): Promise<GrantDisbursement> {
    return this.withTransaction(async (client) => {
      const result = await client.query<Row>(
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

      const disbursement = this.mapDisbursement(result.rows[0]);
      await this.refreshGrantRollup(client, organizationId, data.grant_id, userId);
      await this.recordActivity(client, organizationId, userId, {
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
  }

  async updateDisbursement(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateGrantDisbursementDTO
  ): Promise<GrantDisbursement | null> {
    return this.withTransaction(async (client) => {
      const result = await client.query<Row>(
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

      const disbursement = this.mapDisbursement(result.rows[0]);
      await this.refreshGrantRollup(client, organizationId, disbursement.grant_id, userId);
      await this.recordActivity(client, organizationId, userId, {
        grant_id: disbursement.grant_id,
        entity_type: 'disbursement',
        entity_id: disbursement.id,
        action: 'updated',
        notes: `Updated disbursement for ${disbursement.grant_number}`,
        metadata: { disbursement_id: disbursement.id },
      });
      return disbursement;
    });
  }

  async deleteDisbursement(
    organizationId: string,
    id: string,
    userId: string | null
  ): Promise<boolean> {
    return this.withTransaction(async (client) => {
      const current = await this.getDisbursementById(organizationId, id);
      if (!current) {
        return false;
      }

      const deleted = await client.query(
        `DELETE FROM grant_disbursements
         WHERE organization_id = $1
           AND id = $2`,
        [organizationId, id]
      );

      if (deleted.rowCount && deleted.rowCount > 0) {
        await this.refreshGrantRollup(client, organizationId, current.grant_id, userId);
        await this.recordActivity(client, organizationId, userId, {
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
  }

  async listReports(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<GrantReport>> {
    const values: unknown[] = [organizationId];
    const conditions = ['r.organization_id = $1'];
    addSearchCondition(conditions, values, ['g.grant_number', 'g.title', 'r.report_type', 'r.summary'], filters.search);

    if (filters.status) {
      values.push(filters.status);
      conditions.push(`r.status = $${values.length}`);
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
        due_at: 'r.due_at',
        submitted_at: 'r.submitted_at',
        status: 'r.status',
        updated_at: 'r.updated_at',
      },
      'due_at'
    );

    return this.paginate({
      baseFrom: 'grant_reports r INNER JOIN grants g ON g.id = r.grant_id LEFT JOIN grant_funders f ON f.id = g.funder_id LEFT JOIN grant_programs gp ON gp.id = g.program_id LEFT JOIN recipient_organizations ro ON ro.id = g.recipient_organization_id',
      selectColumns: `
        r.*,
        g.grant_number,
        g.title AS grant_title
      `,
      conditions,
      values,
      orderBy: `${sort.sortColumn} ${sort.sortOrder}, r.due_at ASC`,
      page,
      limit,
      mapper: (row) => this.mapReport(row),
    });
  }

  async getReportById(organizationId: string, id: string): Promise<GrantReport | null> {
    return this.fetchById(
      this.db,
      `SELECT
         r.*,
         g.grant_number,
         g.title AS grant_title
       FROM grant_reports r
       INNER JOIN grants g ON g.id = r.grant_id
       WHERE r.organization_id = $1
         AND r.id = $2`,
      [organizationId, id],
      (row) => this.mapReport(row)
    );
  }

  async createReport(
    organizationId: string,
    userId: string,
    data: CreateGrantReportDTO
  ): Promise<GrantReport> {
    return this.withTransaction(async (client) => {
      const result = await client.query<Row>(
        `INSERT INTO grant_reports (
           organization_id,
           grant_id,
           report_type,
           period_start,
           period_end,
           due_at,
           submitted_at,
           status,
           summary,
           outstanding_items,
           notes,
           created_by,
           modified_by
         )
         VALUES ($1, $2, COALESCE($3, 'progress'), $4, $5, $6, $7, COALESCE($8, 'due'), $9, $10, $11, $12, $12)
         RETURNING *`,
        [
          organizationId,
          data.grant_id,
          data.report_type ?? 'progress',
          data.period_start ?? null,
          data.period_end ?? null,
          data.due_at,
          data.submitted_at ?? null,
          data.status ?? 'due',
          data.summary ?? null,
          data.outstanding_items ?? null,
          data.notes ?? null,
          userId,
        ]
      );

      const report = this.mapReport(result.rows[0]);
      await this.refreshGrantRollup(client, organizationId, data.grant_id, userId);
      await this.recordActivity(client, organizationId, userId, {
        grant_id: data.grant_id,
        entity_type: 'report',
        entity_id: report.id,
        action: 'created',
        notes: `Created report due ${report.due_at}`,
        metadata: {
          report_id: report.id,
          grant_id: data.grant_id,
        },
      });
      return report;
    });
  }

  async updateReport(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateGrantReportDTO
  ): Promise<GrantReport | null> {
    return this.withTransaction(async (client) => {
      const result = await client.query<Row>(
        `UPDATE grant_reports
         SET
           grant_id = COALESCE($3, grant_id),
           report_type = COALESCE($4, report_type),
           period_start = COALESCE($5, period_start),
           period_end = COALESCE($6, period_end),
           due_at = COALESCE($7, due_at),
           submitted_at = COALESCE($8, submitted_at),
           status = COALESCE($9, status),
           summary = COALESCE($10, summary),
           outstanding_items = COALESCE($11, outstanding_items),
           notes = COALESCE($12, notes),
           modified_by = $13,
           updated_at = NOW()
         WHERE organization_id = $1
           AND id = $2
         RETURNING *`,
        [
          organizationId,
          id,
          data.grant_id ?? null,
          data.report_type ?? null,
          data.period_start ?? null,
          data.period_end ?? null,
          data.due_at ?? null,
          data.submitted_at ?? null,
          data.status ?? null,
          data.summary ?? null,
          data.outstanding_items ?? null,
          data.notes ?? null,
          userId,
        ]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const report = this.mapReport(result.rows[0]);
      await this.refreshGrantRollup(client, organizationId, report.grant_id, userId);
      await this.recordActivity(client, organizationId, userId, {
        grant_id: report.grant_id,
        entity_type: 'report',
        entity_id: report.id,
        action: 'updated',
        notes: `Updated report due ${report.due_at}`,
        metadata: { report_id: report.id },
      });
      return report;
    });
  }

  async deleteReport(
    organizationId: string,
    id: string,
    userId: string | null
  ): Promise<boolean> {
    return this.withTransaction(async (client) => {
      const current = await this.getReportById(organizationId, id);
      if (!current) {
        return false;
      }

      const deleted = await client.query(
        `DELETE FROM grant_reports
         WHERE organization_id = $1
           AND id = $2`,
        [organizationId, id]
      );

      if (deleted.rowCount && deleted.rowCount > 0) {
        await this.refreshGrantRollup(client, organizationId, current.grant_id, userId);
        await this.recordActivity(client, organizationId, userId, {
          grant_id: current.grant_id,
          entity_type: 'report',
          entity_id: id,
          action: 'deleted',
          notes: `Deleted report ${current.id}`,
          metadata: { report_id: id },
        });
        return true;
      }

      return false;
    });
  }

  async listDocuments(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<GrantDocument>> {
    const values: unknown[] = [organizationId];
    const conditions = ['d.organization_id = $1'];
    addSearchCondition(conditions, values, ['d.file_name', 'd.document_type', 'g.grant_number', 'g.title'], filters.search);

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
        file_name: 'd.file_name',
        document_type: 'd.document_type',
        created_at: 'd.created_at',
        updated_at: 'd.updated_at',
      },
      'created_at'
    );

    return this.paginate({
      baseFrom: 'grant_documents d LEFT JOIN grants g ON g.id = d.grant_id',
      selectColumns: `
        d.*,
        g.grant_number,
        g.title AS grant_title
      `,
      conditions,
      values,
      orderBy: `${sort.sortColumn} ${sort.sortOrder}, d.created_at DESC`,
      page,
      limit,
      mapper: (row) => this.mapDocument(row),
    });
  }

  async getDocumentById(organizationId: string, id: string): Promise<GrantDocument | null> {
    return this.fetchById(
      this.db,
      `SELECT
         d.*,
         g.grant_number,
         g.title AS grant_title
       FROM grant_documents d
       LEFT JOIN grants g ON g.id = d.grant_id
       WHERE d.organization_id = $1
         AND d.id = $2`,
      [organizationId, id],
      (row) => this.mapDocument(row)
    );
  }

  async createDocument(
    organizationId: string,
    userId: string,
    data: CreateGrantDocumentDTO
  ): Promise<GrantDocument> {
    const result = await this.db.query<Row>(
      `INSERT INTO grant_documents (
         organization_id,
         grant_id,
         application_id,
         report_id,
         document_type,
         file_name,
         file_url,
         mime_type,
         file_size,
         notes,
         uploaded_by,
         created_by,
         modified_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11, $12), $12, $12)
       RETURNING *`,
      [
        organizationId,
        data.grant_id ?? null,
        data.application_id ?? null,
        data.report_id ?? null,
        data.document_type,
        data.file_name,
        data.file_url,
        data.mime_type,
        data.file_size,
        data.notes ?? null,
        data.uploaded_by ?? userId,
        userId,
      ]
    );

    const document = this.mapDocument(result.rows[0]);
    await this.recordActivity(this.db, organizationId, userId, {
      grant_id: data.grant_id ?? null,
      entity_type: 'document',
      entity_id: document.id,
      action: 'created',
      notes: `Uploaded document ${document.file_name}`,
      metadata: {
        document_type: document.document_type,
      },
    });
    return document;
  }

  async updateDocument(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateGrantDocumentDTO
  ): Promise<GrantDocument | null> {
    const result = await this.db.query<Row>(
      `UPDATE grant_documents
       SET
         grant_id = COALESCE($3, grant_id),
         application_id = COALESCE($4, application_id),
         report_id = COALESCE($5, report_id),
         document_type = COALESCE($6, document_type),
         file_name = COALESCE($7, file_name),
         file_url = COALESCE($8, file_url),
         mime_type = COALESCE($9, mime_type),
         file_size = COALESCE($10, file_size),
         notes = COALESCE($11, notes),
         uploaded_by = COALESCE($12, uploaded_by),
         modified_by = $13,
         updated_at = NOW()
       WHERE organization_id = $1
         AND id = $2
       RETURNING *`,
      [
        organizationId,
        id,
        data.grant_id ?? null,
        data.application_id ?? null,
        data.report_id ?? null,
        data.document_type ?? null,
        data.file_name ?? null,
        data.file_url ?? null,
        data.mime_type ?? null,
        data.file_size ?? null,
        data.notes ?? null,
        data.uploaded_by ?? null,
        userId,
      ]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const document = this.mapDocument(result.rows[0]);
    await this.recordActivity(this.db, organizationId, userId, {
      grant_id: document.grant_id,
      entity_type: 'document',
      entity_id: id,
      action: 'updated',
      notes: `Updated document ${document.file_name}`,
      metadata: { document_id: id },
    });
    return document;
  }

  async deleteDocument(
    organizationId: string,
    id: string,
    userId: string | null
  ): Promise<boolean> {
    const existing = await this.getDocumentById(organizationId, id);
    const deleted = await this.deleteById('grant_documents', organizationId, id);
    if (deleted) {
      await this.recordActivity(this.db, organizationId, userId, {
        grant_id: existing?.grant_id ?? null,
        entity_type: 'document',
        entity_id: id,
        action: 'deleted',
        notes: existing ? `Deleted document ${existing.file_name}` : 'Deleted document',
        metadata: { document_id: id },
      });
    }
    return deleted;
  }

  async listActivities(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<GrantActivityLog>> {
    const values: unknown[] = [organizationId];
    const conditions = ['l.organization_id = $1'];

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
        created_at: 'l.created_at',
        action: 'l.action',
      },
      'created_at'
    );

    return this.paginate({
      baseFrom: 'grant_activity_logs l LEFT JOIN grants g ON g.id = l.grant_id',
      selectColumns: `
        l.*,
        g.grant_number,
        g.title AS grant_title
      `,
      conditions,
      values,
      orderBy: `${sort.sortColumn} ${sort.sortOrder}, l.created_at DESC`,
      page,
      limit,
      mapper: (row) => this.mapActivity(row),
    });
  }

  async getCalendar(
    organizationId: string,
    options: { start_date?: string; end_date?: string; limit?: number } = {}
  ): Promise<GrantCalendarItem[]> {
    const limit = options.limit ?? 30;
    const values: unknown[] = [organizationId];
    const outerConditions: string[] = ['true'];

    if (options.start_date) {
      values.push(options.start_date);
      outerConditions.push(`due_at >= $${values.length}`);
    }

    if (options.end_date) {
      values.push(options.end_date);
      outerConditions.push(`due_at <= $${values.length}`);
    }

    const result = await this.db.query<Row>(
      `SELECT *
       FROM (
         SELECT
           r.id::text AS id,
           r.grant_id::text AS grant_id,
           g.grant_number::text AS grant_number,
           g.title::text AS grant_title,
           'report'::text AS item_type,
           r.status::text AS status,
           r.due_at::date AS due_at,
           NULL::numeric AS amount,
           ro.name::text AS recipient_name,
           gp.name::text AS program_name
         FROM grant_reports r
         INNER JOIN grants g ON g.id = r.grant_id
         LEFT JOIN recipient_organizations ro ON ro.id = g.recipient_organization_id
         LEFT JOIN grant_programs gp ON gp.id = g.program_id
         WHERE g.organization_id = $1
           AND r.status IN ('draft', 'due', 'overdue')

         UNION ALL

         SELECT
           d.id::text AS id,
           d.grant_id::text AS grant_id,
           g.grant_number::text AS grant_number,
           g.title::text AS grant_title,
           'disbursement'::text AS item_type,
           d.status::text AS status,
           COALESCE(d.scheduled_date, d.paid_at)::date AS due_at,
           d.amount,
           ro.name::text AS recipient_name,
           gp.name::text AS program_name
         FROM grant_disbursements d
         INNER JOIN grants g ON g.id = d.grant_id
         LEFT JOIN recipient_organizations ro ON ro.id = g.recipient_organization_id
         LEFT JOIN grant_programs gp ON gp.id = g.program_id
         WHERE g.organization_id = $1
           AND d.status IN ('scheduled', 'pending')

         UNION ALL

         SELECT
           a.id::text AS id,
           COALESCE(a.grant_id::text, a.id::text) AS grant_id,
           COALESCE(g.grant_number, a.application_number)::text AS grant_number,
           COALESCE(g.title, a.title)::text AS grant_title,
           'application'::text AS item_type,
           a.status::text AS status,
           COALESCE(a.due_at, a.created_at::date)::date AS due_at,
           a.requested_amount AS amount,
           ro.name::text AS recipient_name,
           gp.name::text AS program_name
         FROM grant_applications a
         LEFT JOIN grants g ON g.application_id = a.id
         LEFT JOIN recipient_organizations ro ON ro.id = a.recipient_organization_id
         LEFT JOIN grant_programs gp ON gp.id = a.program_id
         WHERE a.organization_id = $1
           AND a.status IN ('draft', 'submitted', 'under_review')
       ) AS items
       WHERE ${outerConditions.join(' AND ')}
       ORDER BY due_at ASC, grant_number ASC
       LIMIT $${values.length + 1}`,
      [...values, limit]
    );

    return result.rows.map((row) => this.mapCalendarItem(row));
  }

  async exportGrants(
    organizationId: string,
    filters: GrantListFilters = {},
    format: 'csv' | 'xlsx' = 'csv'
  ): Promise<GeneratedTabularFile> {
    const grants = await this.listGrants(organizationId, {
      ...filters,
      limit: filters.limit ?? 1000,
      page: 1,
    });

    return buildTabularExport({
      format,
      fallbackBaseName: `grants-${organizationId}`,
      sheets: [
        {
          name: 'Grants',
          columns: [
            { key: 'grant_number', header: 'Grant Number', width: 18 },
            { key: 'title', header: 'Grant Title', width: 28 },
            { key: 'funder_name', header: 'Funder', width: 24 },
            { key: 'program_name', header: 'Program', width: 24 },
            { key: 'recipient_name', header: 'Recipient', width: 24 },
            { key: 'funded_program_name', header: 'Funded Program', width: 24 },
            { key: 'status', header: 'Status', width: 16 },
            { key: 'amount', header: 'Amount', width: 16 },
            { key: 'committed_amount', header: 'Committed', width: 16 },
            { key: 'disbursed_amount', header: 'Disbursed', width: 16 },
            { key: 'currency', header: 'Currency', width: 12 },
            { key: 'award_date', header: 'Award Date', width: 16 },
            { key: 'expiry_date', header: 'Expiry Date', width: 16 },
            { key: 'next_report_due_at', header: 'Next Report Due', width: 18 },
          ],
          rows: grants.data.map((grant) => ({
            ...grant,
            amount: grant.amount,
            committed_amount: grant.committed_amount,
            disbursed_amount: grant.disbursed_amount,
          })),
        },
      ],
    });
  }
}

export const grantService = new GrantsService(pool);
