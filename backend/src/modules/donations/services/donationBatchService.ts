import { Pool, PoolClient, QueryResultRow } from 'pg';
import pool from '@config/database';
import { logger } from '@config/logger';
import type {
  CreateDonationBatchDTO,
  DonationBatch,
  DonationBatchAuditEvent,
  DonationBatchAuditEventType,
  DonationBatchControlSummary,
  DonationBatchExceptionPreview,
  DonationBatchRestrictedFundSummary,
  DonationBatchStatus,
} from '@app-types/donation';
import { activityEventService } from '@services/activityEventService';

type Queryable = Pick<Pool, 'query'> | Pick<PoolClient, 'query'>;

interface DonationBatchRow extends QueryResultRow {
  id: string;
  organization_id: string;
  name: string;
  date_from: string | Date;
  date_to: string | Date;
  expected_count: number | string;
  expected_amount: number | string;
  currency: string;
  status: DonationBatchStatus;
  notes: string | null;
  closed_at: string | Date | null;
  reviewed_at: string | Date | null;
  approved_at: string | Date | null;
  posted_at: string | Date | null;
  reopened_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
  created_by: string | null;
  modified_by: string | null;
}

interface DonationBatchAuditEventRow extends QueryResultRow {
  id: string;
  batch_id: string;
  event_type: DonationBatchAuditEventType;
  from_status: DonationBatchStatus | null;
  to_status: DonationBatchStatus;
  actor_user_id: string | null;
  metadata: Record<string, unknown> | string | null;
  created_at: string | Date;
}

interface BatchDonationRow extends QueryResultRow {
  donation_id: string;
  donation_number: string | null;
  amount: number | string;
  currency: string;
  payment_status: string | null;
  account_id: string | null;
  contact_id: string | null;
  designation_id: string | null;
  designation_label: string | null;
  designation_code: string | null;
  restriction_type: DonationBatchRestrictedFundSummary['restriction_type'] | null;
}

const BATCH_SELECT = `
  id,
  organization_id,
  name,
  date_from,
  date_to,
  expected_count,
  expected_amount,
  currency,
  status,
  notes,
  closed_at,
  reviewed_at,
  approved_at,
  posted_at,
  reopened_at,
  created_at,
  updated_at,
  created_by,
  modified_by
`;

const toDateString = (value: string | Date): string => {
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }
  return value.toISOString().slice(0, 10);
};

const toIsoOrNull = (value: string | Date | null): string | null => {
  if (!value) return null;
  return typeof value === 'string' ? new Date(value).toISOString() : value.toISOString();
};

const toIso = (value: string | Date): string =>
  typeof value === 'string' ? new Date(value).toISOString() : value.toISOString();

const toNumber = (value: number | string | null | undefined): number => Number(value || 0);

const parseJsonObject = (value: Record<string, unknown> | string | null): Record<string, unknown> => {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return value;
};

export class DonationBatchService {
  constructor(private readonly db: Pool) {}

  async listBatches(organizationId: string): Promise<DonationBatch[]> {
    const result = await this.db.query<DonationBatchRow>(
      `SELECT ${BATCH_SELECT}
       FROM donation_batches
       WHERE organization_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [organizationId]
    );

    return Promise.all(result.rows.map((row) => this.hydrateBatch(row)));
  }

  async getBatch(batchId: string, organizationId: string): Promise<DonationBatch | null> {
    const row = await this.loadBatchRow(batchId, organizationId);
    return row ? this.hydrateBatch(row) : null;
  }

  async createBatch(
    input: CreateDonationBatchDTO,
    userId: string,
    organizationId: string
  ): Promise<DonationBatch> {
    const result = await this.db.query<DonationBatchRow>(
      `INSERT INTO donation_batches (
         organization_id,
         name,
         date_from,
         date_to,
         expected_count,
         expected_amount,
         currency,
         notes,
         created_by,
         modified_by
       )
       VALUES ($1, $2, $3::date, $4::date, $5, $6, upper($7), $8, $9, $9)
       RETURNING ${BATCH_SELECT}`,
      [
        organizationId,
        input.name.trim(),
        input.date_from,
        input.date_to,
        input.expected_count,
        input.expected_amount,
        input.currency || 'CAD',
        input.notes || null,
        userId,
      ]
    );

    const row = result.rows[0];
    await this.recordAuditEvent({
      batchId: row.id,
      organizationId,
      eventType: 'created',
      fromStatus: null,
      toStatus: row.status,
      userId,
      metadata: {
        expectedCount: input.expected_count,
        expectedAmount: input.expected_amount,
        dateFrom: input.date_from,
        dateTo: input.date_to,
      },
    });

    return this.hydrateBatch(row);
  }

  async closeForReview(
    batchId: string,
    organizationId: string,
    userId: string
  ): Promise<DonationBatch | null> {
    return this.transitionWithSnapshot({
      batchId,
      organizationId,
      userId,
      allowed: ['open'],
      toStatus: 'under_review',
      eventType: 'closed_for_review',
    });
  }

  async reopen(
    batchId: string,
    organizationId: string,
    userId: string
  ): Promise<DonationBatch | null> {
    return this.transitionWithSnapshot({
      batchId,
      organizationId,
      userId,
      allowed: ['under_review', 'approved'],
      toStatus: 'open',
      eventType: 'reopened',
      clearSnapshot: true,
    });
  }

  async approve(
    batchId: string,
    organizationId: string,
    userId: string
  ): Promise<DonationBatch | null> {
    const row = await this.loadBatchRow(batchId, organizationId);
    if (!row) return null;
    if (row.status !== 'under_review') {
      throw new Error('Only batches under review can be approved');
    }

    const summary = await this.buildBatchSummary(row);
    if (summary.exception_preview.some((exception) => exception.severity === 'blocking')) {
      throw new Error('Donation batch cannot be approved while blocking exceptions remain');
    }

    return this.transitionWithSnapshot({
      batchId,
      organizationId,
      userId,
      allowed: ['under_review'],
      toStatus: 'approved',
      eventType: 'approved',
    });
  }

  async post(
    batchId: string,
    organizationId: string,
    userId: string
  ): Promise<DonationBatch | null> {
    return this.transitionWithSnapshot({
      batchId,
      organizationId,
      userId,
      allowed: ['approved'],
      toStatus: 'posted',
      eventType: 'posted',
    });
  }

  private async transitionWithSnapshot(input: {
    batchId: string;
    organizationId: string;
    userId: string;
    allowed: DonationBatchStatus[];
    toStatus: DonationBatchStatus;
    eventType: DonationBatchAuditEventType;
    clearSnapshot?: boolean;
  }): Promise<DonationBatch | null> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const row = await this.loadBatchRow(input.batchId, input.organizationId, client, true);
      if (!row) {
        await client.query('ROLLBACK');
        return null;
      }
      if (!input.allowed.includes(row.status)) {
        throw new Error(
          `Donation batch cannot transition from ${row.status} to ${input.toStatus}`
        );
      }

      if (input.clearSnapshot) {
        await client.query('DELETE FROM donation_batch_items WHERE batch_id = $1', [row.id]);
      } else {
        await this.refreshBatchItems(row, client);
      }

      const timestampColumn = this.timestampColumnFor(input.eventType);
      const result = await client.query<DonationBatchRow>(
        `UPDATE donation_batches
         SET status = $1,
             ${timestampColumn} = CURRENT_TIMESTAMP,
             modified_by = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
           AND organization_id = $4
         RETURNING ${BATCH_SELECT}`,
        [input.toStatus, input.userId, row.id, input.organizationId]
      );

      await this.recordAuditEvent(
        {
          batchId: row.id,
          organizationId: input.organizationId,
          eventType: input.eventType,
          fromStatus: row.status,
          toStatus: input.toStatus,
          userId: input.userId,
          metadata: { policy: this.policySummary(input.eventType) },
        },
        client
      );

      await client.query('COMMIT');
      return this.hydrateBatch(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private timestampColumnFor(eventType: DonationBatchAuditEventType): string {
    switch (eventType) {
      case 'closed_for_review':
        return 'closed_at';
      case 'approved':
        return 'approved_at';
      case 'posted':
        return 'posted_at';
      case 'reopened':
        return 'reopened_at';
      default:
        return 'updated_at';
    }
  }

  private policySummary(eventType: DonationBatchAuditEventType): string {
    switch (eventType) {
      case 'closed_for_review':
        return 'Close snapshots the batch donation membership for staff review.';
      case 'approved':
        return 'Approve requires a reviewed batch with no blocking control exceptions.';
      case 'posted':
        return 'Post records finance approval state only; GL posting remains out of scope.';
      case 'reopened':
        return 'Reopen is allowed before posting and clears the review snapshot.';
      default:
        return 'Batch audit event recorded.';
    }
  }

  private async loadBatchRow(
    batchId: string,
    organizationId: string,
    queryable: Queryable = this.db,
    forUpdate = false
  ): Promise<DonationBatchRow | null> {
    const result = await queryable.query<DonationBatchRow>(
      `SELECT ${BATCH_SELECT}
       FROM donation_batches
       WHERE id = $1
         AND organization_id = $2
       ${forUpdate ? 'FOR UPDATE' : ''}`,
      [batchId, organizationId]
    );
    return result.rows[0] || null;
  }

  private async refreshBatchItems(row: DonationBatchRow, queryable: Queryable): Promise<void> {
    await queryable.query('DELETE FROM donation_batch_items WHERE batch_id = $1', [row.id]);
    await queryable.query(
      `INSERT INTO donation_batch_items (batch_id, donation_id, amount_snapshot, currency_snapshot)
       SELECT $1, d.id, d.amount, d.currency
       FROM donations d
       LEFT JOIN contacts c ON c.id = d.contact_id
       WHERE COALESCE(d.account_id, c.account_id) = $2
         AND d.donation_date::date BETWEEN $3::date AND $4::date
       ORDER BY d.donation_date ASC, d.created_at ASC
       ON CONFLICT (batch_id, donation_id) DO UPDATE
       SET amount_snapshot = EXCLUDED.amount_snapshot,
           currency_snapshot = EXCLUDED.currency_snapshot`,
      [row.id, row.organization_id, toDateString(row.date_from), toDateString(row.date_to)]
    );
  }

  private async hydrateBatch(row: DonationBatchRow): Promise<DonationBatch> {
    const summary = await this.buildBatchSummary(row);
    const auditEvents = await this.listAuditEvents(row.id);

    return {
      batch_id: row.id,
      organization_id: row.organization_id,
      name: row.name,
      date_from: toDateString(row.date_from),
      date_to: toDateString(row.date_to),
      expected_count: toNumber(row.expected_count),
      expected_amount: toNumber(row.expected_amount),
      currency: row.currency,
      status: row.status,
      notes: row.notes,
      closed_at: toIsoOrNull(row.closed_at),
      reviewed_at: toIsoOrNull(row.reviewed_at),
      approved_at: toIsoOrNull(row.approved_at),
      posted_at: toIsoOrNull(row.posted_at),
      reopened_at: toIsoOrNull(row.reopened_at),
      created_at: toIso(row.created_at),
      updated_at: toIso(row.updated_at),
      created_by: row.created_by,
      modified_by: row.modified_by,
      ...summary,
      audit_events: auditEvents,
    };
  }

  private async buildBatchSummary(row: DonationBatchRow): Promise<{
    control_summary: DonationBatchControlSummary;
    restricted_fund_summary: DonationBatchRestrictedFundSummary[];
    exception_preview: DonationBatchExceptionPreview[];
  }> {
    const donations = await this.loadBatchDonations(row);
    const actualAmount = donations.reduce((sum, donation) => sum + toNumber(donation.amount), 0);
    const actualCount = donations.length;
    const expectedAmount = toNumber(row.expected_amount);
    const expectedCount = toNumber(row.expected_count);

    const restrictedFundSummary = this.buildRestrictedFundSummary(donations);
    const exceptions = this.buildExceptionPreview(row, donations, actualCount, actualAmount);

    return {
      control_summary: {
        expected_count: expectedCount,
        expected_amount: expectedAmount,
        actual_count: actualCount,
        actual_amount: actualAmount,
        difference_count: actualCount - expectedCount,
        difference_amount: Number((actualAmount - expectedAmount).toFixed(2)),
        currency: row.currency,
      },
      restricted_fund_summary: restrictedFundSummary,
      exception_preview: exceptions,
    };
  }

  private async loadBatchDonations(row: DonationBatchRow): Promise<BatchDonationRow[]> {
    const isOpen = row.status === 'open';
    const query = isOpen
      ? `SELECT
           d.id AS donation_id,
           d.donation_number,
           d.amount,
           d.currency,
           d.payment_status,
           d.account_id,
           d.contact_id,
           d.designation_id,
           COALESCE(fd.name, d.designation, 'Unrestricted') AS designation_label,
           fd.code AS designation_code,
           COALESCE(fd.restriction_type, 'unrestricted') AS restriction_type
         FROM donations d
         LEFT JOIN contacts c ON c.id = d.contact_id
         LEFT JOIN fund_designations fd ON fd.id = d.designation_id
         WHERE COALESCE(d.account_id, c.account_id) = $1
           AND d.donation_date::date BETWEEN $2::date AND $3::date
         ORDER BY d.donation_date ASC, d.created_at ASC`
      : `SELECT
           d.id AS donation_id,
           d.donation_number,
           dbi.amount_snapshot AS amount,
           dbi.currency_snapshot AS currency,
           d.payment_status,
           d.account_id,
           d.contact_id,
           d.designation_id,
           COALESCE(fd.name, d.designation, 'Unrestricted') AS designation_label,
           fd.code AS designation_code,
           COALESCE(fd.restriction_type, 'unrestricted') AS restriction_type
         FROM donation_batch_items dbi
         JOIN donations d ON d.id = dbi.donation_id
         LEFT JOIN fund_designations fd ON fd.id = d.designation_id
         WHERE dbi.batch_id = $1
         ORDER BY dbi.created_at ASC`;

    const params = isOpen
      ? [row.organization_id, toDateString(row.date_from), toDateString(row.date_to)]
      : [row.id];
    const result = await this.db.query<BatchDonationRow>(query, params);
    return result.rows;
  }

  private buildRestrictedFundSummary(
    donations: BatchDonationRow[]
  ): DonationBatchRestrictedFundSummary[] {
    const grouped = new Map<string, DonationBatchRestrictedFundSummary>();

    donations.forEach((donation) => {
      const restrictionType = donation.restriction_type || 'unknown';
      const designationLabel = donation.designation_label || 'Unrestricted';
      const key = `${restrictionType}:${donation.designation_id || designationLabel}`;
      const existing =
        grouped.get(key) ||
        ({
          restriction_type: restrictionType,
          designation_id: donation.designation_id,
          designation_label: designationLabel,
          designation_code: donation.designation_code,
          count: 0,
          amount: 0,
        } satisfies DonationBatchRestrictedFundSummary);

      existing.count += 1;
      existing.amount = Number((existing.amount + toNumber(donation.amount)).toFixed(2));
      grouped.set(key, existing);
    });

    return Array.from(grouped.values()).sort((left, right) =>
      left.designation_label.localeCompare(right.designation_label)
    );
  }

  private buildExceptionPreview(
    row: DonationBatchRow,
    donations: BatchDonationRow[],
    actualCount: number,
    actualAmount: number
  ): DonationBatchExceptionPreview[] {
    const exceptions: DonationBatchExceptionPreview[] = [];
    const expectedCount = toNumber(row.expected_count);
    const expectedAmount = toNumber(row.expected_amount);

    if (actualCount !== expectedCount) {
      exceptions.push({
        code: 'control_count_mismatch',
        severity: 'blocking',
        message: `Expected ${expectedCount} donations but found ${actualCount}.`,
      });
    }

    if (Number(actualAmount.toFixed(2)) !== Number(expectedAmount.toFixed(2))) {
      exceptions.push({
        code: 'control_amount_mismatch',
        severity: 'blocking',
        message: `Expected ${row.currency} ${expectedAmount.toFixed(2)} but found ${row.currency} ${actualAmount.toFixed(2)}.`,
      });
    }

    donations.forEach((donation) => {
      if (donation.currency !== row.currency) {
        exceptions.push({
          code: 'currency_mismatch',
          severity: 'blocking',
          message: `${donation.donation_number || donation.donation_id} uses ${donation.currency}, not ${row.currency}.`,
          donation_id: donation.donation_id,
          donation_number: donation.donation_number,
          amount: toNumber(donation.amount),
        });
      }

      if (donation.payment_status !== 'completed') {
        exceptions.push({
          code: 'non_completed_payment',
          severity: 'blocking',
          message: `${donation.donation_number || donation.donation_id} is ${donation.payment_status || 'missing status'}.`,
          donation_id: donation.donation_id,
          donation_number: donation.donation_number,
          amount: toNumber(donation.amount),
        });
      }

      if (!donation.account_id && !donation.contact_id) {
        exceptions.push({
          code: 'missing_donor_link',
          severity: 'warning',
          message: `${donation.donation_number || donation.donation_id} has no donor link.`,
          donation_id: donation.donation_id,
          donation_number: donation.donation_number,
          amount: toNumber(donation.amount),
        });
      }
    });

    return exceptions;
  }

  private async listAuditEvents(batchId: string): Promise<DonationBatchAuditEvent[]> {
    const result = await this.db.query<DonationBatchAuditEventRow>(
      `SELECT id, batch_id, event_type, from_status, to_status, actor_user_id, metadata, created_at
       FROM donation_batch_audit_events
       WHERE batch_id = $1
       ORDER BY created_at ASC`,
      [batchId]
    );

    return result.rows.map((row) => ({
      audit_event_id: row.id,
      batch_id: row.batch_id,
      event_type: row.event_type,
      from_status: row.from_status,
      to_status: row.to_status,
      actor_user_id: row.actor_user_id,
      metadata: parseJsonObject(row.metadata),
      created_at: toIso(row.created_at),
    }));
  }

  private async recordAuditEvent(
    input: {
      batchId: string;
      organizationId: string;
      eventType: DonationBatchAuditEventType;
      fromStatus: DonationBatchStatus | null;
      toStatus: DonationBatchStatus;
      userId: string;
      metadata: Record<string, unknown>;
    },
    queryable: Queryable = this.db
  ): Promise<void> {
    await queryable.query(
      `INSERT INTO donation_batch_audit_events (
         batch_id,
         organization_id,
         event_type,
         from_status,
         to_status,
         actor_user_id,
         metadata
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        input.batchId,
        input.organizationId,
        input.eventType,
        input.fromStatus,
        input.toStatus,
        input.userId,
        JSON.stringify(input.metadata),
      ]
    );

    try {
      await activityEventService.recordEvent(
        {
          organizationId: input.organizationId,
          type: 'donation_updated',
          title: `Donation batch ${input.eventType.replace(/_/g, ' ')}`,
          description: `Donation batch moved to ${input.toStatus}.`,
          userId: input.userId,
          entityType: 'donation',
          entityId: input.batchId,
          sourceTable: 'donation_batches',
          sourceRecordId: input.batchId,
          metadata: {
            eventType: input.eventType,
            fromStatus: input.fromStatus,
            toStatus: input.toStatus,
          },
        },
        queryable
      );
    } catch (error) {
      logger.warn('Failed to record donation batch activity event', {
        error,
        batchId: input.batchId,
        eventType: input.eventType,
      });
    }
  }
}

export default new DonationBatchService(pool);
