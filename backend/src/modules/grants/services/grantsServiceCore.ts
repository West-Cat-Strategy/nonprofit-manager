import { Pool } from 'pg';
import type {
  CreateGrantActivityLogDTO,
  FundedProgram,
  GrantActivityLog,
  GrantApplication,
  GrantAward,
  GrantCalendarItem,
  GrantDisbursement,
  GrantDocument,
  GrantFunder,
  GrantProgram,
  GrantProgramStatus,
  GrantRecipientStatus,
  GrantReport,
  PaginatedGrantResult,
  RecipientOrganization,
} from '@app-types/grant';
import {
  buildPagination,
  toIsoString,
  toJsonObject,
  toNullableIsoString,
  toNullableNumber,
  toNullableString,
  toNumber,
  type GrantPaginateOptions,
  type GrantQueryClient,
  type GrantRow,
} from './grantsShared';
import { getOffset } from '@utils/queryHelpers';

export class GrantsServiceCore {
  constructor(readonly db: Pool) {}

  async withTransaction<T>(callback: (client: GrantQueryClient) => Promise<T>): Promise<T> {
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

  async fetchById<T>(
    query: GrantQueryClient,
    sql: string,
    values: unknown[],
    mapper: (row: GrantRow) => T
  ): Promise<T | null> {
    const result = await query.query<GrantRow>(sql, values);
    if (result.rows.length === 0) {
      return null;
    }

    return mapper(result.rows[0]);
  }

  async paginate<T>(options: GrantPaginateOptions<T>): Promise<PaginatedGrantResult<T>> {
    const query = options.client ?? this.db;
    const whereSql = options.conditions.length > 0 ? `WHERE ${options.conditions.join(' AND ')}` : '';

    const countResult = await query.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM ${options.baseFrom} ${whereSql}`,
      options.values
    );
    const total = Number(countResult.rows[0]?.count ?? 0);

    const offset = getOffset(options.page, options.limit);
    const rows = await query.query<GrantRow>(
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

  async deleteById(table: string, organizationId: string, id: string): Promise<boolean> {
    const result = await this.db.query(
      `DELETE FROM ${table}
       WHERE organization_id = $1
         AND id = $2`,
      [organizationId, id]
    );

    return result.rowCount !== null && result.rowCount > 0;
  }

  async recordActivity(
    client: GrantQueryClient,
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

  async refreshGrantRollup(
    client: GrantQueryClient,
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

  mapFunder(row: GrantRow): GrantFunder {
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

  mapProgram(row: GrantRow): GrantProgram {
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

  mapRecipient(row: GrantRow): RecipientOrganization {
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

  mapFundedProgram(row: GrantRow): FundedProgram {
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

  mapApplication(row: GrantRow): GrantApplication {
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

  mapGrant(row: GrantRow): GrantAward {
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

  mapDisbursement(row: GrantRow): GrantDisbursement {
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

  mapReport(row: GrantRow): GrantReport {
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

  mapDocument(row: GrantRow): GrantDocument {
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

  mapActivity(row: GrantRow): GrantActivityLog {
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

  mapCalendarItem(row: GrantRow): GrantCalendarItem {
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
}
