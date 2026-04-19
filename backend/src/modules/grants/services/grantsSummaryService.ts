import { deleteCachedPattern, getCached, setCached } from '@config/redis';
import type {
  GrantJurisdiction,
  GrantStatusBreakdownItem,
  GrantSummary,
} from '@app-types/grant';
import { toNumber, type GrantRow } from './grantsShared';
import { GrantsServiceCore } from './grantsServiceCore';

export type GrantSummaryFilters = {
  jurisdiction?: GrantJurisdiction;
  fiscal_year?: string;
};

export class GrantsSummaryService {
  constructor(private readonly core: GrantsServiceCore) {}

  private buildSummaryCacheKey(
    organizationId: string,
    filters: GrantSummaryFilters = {}
  ): string {
    return `grants:summary:v1:${organizationId}:${filters.jurisdiction ?? 'all'}:${filters.fiscal_year ?? 'all'}`;
  }

  async invalidateSummaryCache(organizationId: string): Promise<void> {
    try {
      await deleteCachedPattern(`grants:summary:v1:${organizationId}:*`);
    } catch {
      // Redis failures should not block grants mutations.
    }
  }

  private async buildSummaryUncached(
    organizationId: string,
    filters: GrantSummaryFilters = {}
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
      overdueReportCount,
      upcomingReportCount,
      upcomingDisbursementCount,
    ] = await Promise.all([
      this.core.db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM grant_funders WHERE organization_id = $1`,
        [organizationId]
      ),
      this.core.db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM grant_programs WHERE organization_id = $1`,
        [organizationId]
      ),
      this.core.db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM recipient_organizations WHERE organization_id = $1`,
        [organizationId]
      ),
      this.core.db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM funded_programs WHERE organization_id = $1`,
        [organizationId]
      ),
      this.core.db.query<{
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
      this.core.db.query<{
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
      this.core.db.query<GrantStatusBreakdownItem>(
        `SELECT status, COUNT(*)::text AS count, COALESCE(SUM(amount), 0)::text AS amount
         FROM grants g
         ${grantWhere}
         GROUP BY status
         ORDER BY status ASC`,
        values
      ),
      this.core.db.query<GrantStatusBreakdownItem>(
        `SELECT jurisdiction AS status, COUNT(*)::text AS count, COALESCE(SUM(amount), 0)::text AS amount
         FROM grants g
         ${grantWhere}
         GROUP BY jurisdiction
         ORDER BY jurisdiction ASC`,
        values
      ),
      this.core.db.query<GrantRow>(
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
      this.core.db.query<GrantRow>(
        `SELECT *
         FROM (
           SELECT
             r.id,
             r.grant_id::text AS grant_id,
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
             d.grant_id::text AS grant_id,
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
             COALESCE(a.grant_id::text, '') AS grant_id,
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
      this.getOverdueReportCount(organizationId),
      this.getUpcomingReportCount(organizationId),
      this.getUpcomingDisbursementCount(organizationId),
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
      overdue_reports: overdueReportCount,
      upcoming_reports: upcomingReportCount,
      upcoming_disbursements: upcomingDisbursementCount,
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
      recent_activity: recentActivityResult.rows.map((row) => this.core.mapActivity(row)),
      upcoming_items: upcomingItemsResult.rows.map((row) => this.core.mapCalendarItem(row)),
    };
  }

  async getSummary(
    organizationId: string,
    filters: GrantSummaryFilters = {}
  ): Promise<GrantSummary> {
    const cacheKey = this.buildSummaryCacheKey(organizationId, filters);

    try {
      const cached = await getCached<GrantSummary>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch {
      // Redis failures should not block summary reads.
    }

    const summary = await this.buildSummaryUncached(organizationId, filters);

    try {
      await setCached(cacheKey, summary, 60);
    } catch {
      // Redis failures should not block summary reads.
    }

    return summary;
  }

  private async getOverdueReportCount(organizationId: string): Promise<number> {
    const result = await this.core.db.query<{ count: string }>(
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
    const result = await this.core.db.query<{ count: string }>(
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
    const result = await this.core.db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM grant_disbursements
       WHERE organization_id = $1
         AND COALESCE(scheduled_date, paid_at) BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')
         AND status IN ('scheduled', 'pending')`,
      [organizationId]
    );
    return toNumber(result.rows[0]?.count);
  }
}
