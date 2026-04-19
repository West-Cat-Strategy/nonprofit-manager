import type {
  CreateGrantDocumentDTO,
  CreateGrantReportDTO,
  GrantActivityLog,
  GrantCalendarItem,
  GrantDocument,
  GrantListFilters,
  GrantReport,
  PaginatedGrantResult,
  UpdateGrantDocumentDTO,
  UpdateGrantReportDTO,
} from '@app-types/grant';
import { resolveSort } from '@utils/queryHelpers';
import { addSearchCondition, type GrantRow } from './grantsShared';
import { GrantsServiceCore } from './grantsServiceCore';

type SummaryInvalidationPort = {
  invalidateSummaryCache(organizationId: string): Promise<void>;
};

export class GrantsReportingService {
  constructor(
    private readonly core: GrantsServiceCore,
    private readonly summaryService: SummaryInvalidationPort
  ) {}

  async listReports(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<GrantReport>> {
    const values: unknown[] = [organizationId];
    const conditions = ['r.organization_id = $1'];
    addSearchCondition(
      conditions,
      values,
      ['g.grant_number', 'g.title', 'r.report_type', 'r.summary'],
      filters.search
    );

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

    return this.core.paginate({
      baseFrom:
        'grant_reports r INNER JOIN grants g ON g.id = r.grant_id LEFT JOIN grant_funders f ON f.id = g.funder_id LEFT JOIN grant_programs gp ON gp.id = g.program_id LEFT JOIN recipient_organizations ro ON ro.id = g.recipient_organization_id',
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
      mapper: (row) => this.core.mapReport(row),
    });
  }

  async getReportById(organizationId: string, id: string): Promise<GrantReport | null> {
    return this.core.fetchById(
      this.core.db,
      `SELECT
         r.*,
         g.grant_number,
         g.title AS grant_title
       FROM grant_reports r
       INNER JOIN grants g ON g.id = r.grant_id
       WHERE r.organization_id = $1
         AND r.id = $2`,
      [organizationId, id],
      (row) => this.core.mapReport(row)
    );
  }

  async createReport(
    organizationId: string,
    userId: string,
    data: CreateGrantReportDTO
  ): Promise<GrantReport> {
    const report = await this.core.withTransaction(async (client) => {
      const result = await client.query<GrantRow>(
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

      const report = this.core.mapReport(result.rows[0]);
      await this.core.refreshGrantRollup(client, organizationId, data.grant_id, userId);
      await this.core.recordActivity(client, organizationId, userId, {
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
    await this.summaryService.invalidateSummaryCache(organizationId);
    return report;
  }

  async updateReport(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateGrantReportDTO
  ): Promise<GrantReport | null> {
    const report = await this.core.withTransaction(async (client) => {
      const result = await client.query<GrantRow>(
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

      const report = this.core.mapReport(result.rows[0]);
      await this.core.refreshGrantRollup(client, organizationId, report.grant_id, userId);
      await this.core.recordActivity(client, organizationId, userId, {
        grant_id: report.grant_id,
        entity_type: 'report',
        entity_id: report.id,
        action: 'updated',
        notes: `Updated report due ${report.due_at}`,
        metadata: { report_id: report.id },
      });
      return report;
    });
    if (report) {
      await this.summaryService.invalidateSummaryCache(organizationId);
    }
    return report;
  }

  async deleteReport(
    organizationId: string,
    id: string,
    userId: string | null
  ): Promise<boolean> {
    const deleted = await this.core.withTransaction(async (client) => {
      const current = await this.getReportById(organizationId, id);
      if (!current) {
        return false;
      }

      const deleteResult = await client.query(
        `DELETE FROM grant_reports
         WHERE organization_id = $1
           AND id = $2`,
        [organizationId, id]
      );

      if (deleteResult.rowCount && deleteResult.rowCount > 0) {
        await this.core.refreshGrantRollup(client, organizationId, current.grant_id, userId);
        await this.core.recordActivity(client, organizationId, userId, {
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
    if (deleted) {
      await this.summaryService.invalidateSummaryCache(organizationId);
    }
    return deleted;
  }

  async listDocuments(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<GrantDocument>> {
    const values: unknown[] = [organizationId];
    const conditions = ['d.organization_id = $1'];
    addSearchCondition(
      conditions,
      values,
      ['d.file_name', 'd.document_type', 'g.grant_number', 'g.title'],
      filters.search
    );

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

    return this.core.paginate({
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
      mapper: (row) => this.core.mapDocument(row),
    });
  }

  async getDocumentById(organizationId: string, id: string): Promise<GrantDocument | null> {
    return this.core.fetchById(
      this.core.db,
      `SELECT
         d.*,
         g.grant_number,
         g.title AS grant_title
       FROM grant_documents d
       LEFT JOIN grants g ON g.id = d.grant_id
       WHERE d.organization_id = $1
         AND d.id = $2`,
      [organizationId, id],
      (row) => this.core.mapDocument(row)
    );
  }

  async createDocument(
    organizationId: string,
    userId: string,
    data: CreateGrantDocumentDTO
  ): Promise<GrantDocument> {
    const result = await this.core.db.query<GrantRow>(
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

    const document = this.core.mapDocument(result.rows[0]);
    await this.core.recordActivity(this.core.db, organizationId, userId, {
      grant_id: data.grant_id ?? null,
      entity_type: 'document',
      entity_id: document.id,
      action: 'created',
      notes: `Uploaded document ${document.file_name}`,
      metadata: {
        document_type: document.document_type,
      },
    });
    await this.summaryService.invalidateSummaryCache(organizationId);
    return document;
  }

  async updateDocument(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateGrantDocumentDTO
  ): Promise<GrantDocument | null> {
    const result = await this.core.db.query<GrantRow>(
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

    const document = this.core.mapDocument(result.rows[0]);
    await this.core.recordActivity(this.core.db, organizationId, userId, {
      grant_id: document.grant_id,
      entity_type: 'document',
      entity_id: id,
      action: 'updated',
      notes: `Updated document ${document.file_name}`,
      metadata: { document_id: id },
    });
    await this.summaryService.invalidateSummaryCache(organizationId);
    return document;
  }

  async deleteDocument(
    organizationId: string,
    id: string,
    userId: string | null
  ): Promise<boolean> {
    const existing = await this.getDocumentById(organizationId, id);
    const deleted = await this.core.deleteById('grant_documents', organizationId, id);
    if (deleted) {
      await this.core.recordActivity(this.core.db, organizationId, userId, {
        grant_id: existing?.grant_id ?? null,
        entity_type: 'document',
        entity_id: id,
        action: 'deleted',
        notes: existing ? `Deleted document ${existing.file_name}` : 'Deleted document',
        metadata: { document_id: id },
      });
      await this.summaryService.invalidateSummaryCache(organizationId);
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

    return this.core.paginate({
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
      mapper: (row) => this.core.mapActivity(row),
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

    const result = await this.core.db.query<GrantRow>(
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

    return result.rows.map((row) => this.core.mapCalendarItem(row));
  }
}
