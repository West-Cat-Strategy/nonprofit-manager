import pool from '@config/database';
import type {
  CommunicationCampaignActionResult,
  CommunicationCampaignRun,
  CommunicationCampaignRunStatus,
  CommunicationProvider,
} from '@app-types/communications';

interface CampaignRunRow {
  id: string;
  provider: CommunicationProvider;
  provider_campaign_id: string | null;
  title: string;
  list_id: string | null;
  include_audience_id: string | null;
  exclusion_audience_ids: string[];
  suppression_snapshot: unknown[];
  test_recipients: string[];
  audience_snapshot: Record<string, unknown>;
  content_snapshot: Record<string, unknown> | null;
  requested_send_time: Date | null;
  status: CommunicationCampaignRunStatus;
  counts: Record<string, unknown>;
  scope_account_ids: string[] | null;
  failure_message: string | null;
  requested_by: string | null;
  created_at: Date;
  updated_at: Date;
}

class CampaignRunActionValidationError extends Error {
  statusCode = 400;
}

const uniqueStrings = (values: readonly string[] = []): string[] =>
  Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)));

const mapRunRow = (row: CampaignRunRow): CommunicationCampaignRun => ({
  id: row.id,
  provider: row.provider,
  providerCampaignId: row.provider_campaign_id,
  title: row.title,
  listId: row.list_id,
  includeAudienceId: row.include_audience_id,
  exclusionAudienceIds: row.exclusion_audience_ids ?? [],
  suppressionSnapshot: row.suppression_snapshot ?? [],
  testRecipients: row.test_recipients ?? [],
  audienceSnapshot: row.audience_snapshot ?? {},
  contentSnapshot: row.content_snapshot ?? {},
  requestedSendTime: row.requested_send_time,
  status: row.status,
  counts: row.counts ?? {},
  scopeAccountIds: row.scope_account_ids ?? [],
  failureMessage: row.failure_message,
  requestedBy: row.requested_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const getCampaignRun = async (
  runId: string,
  requesterScopeAccountIds?: string[]
): Promise<CommunicationCampaignRun | null> => {
  const scopeAccountIds = uniqueStrings(requesterScopeAccountIds ?? []);
  const result = await pool.query<CampaignRunRow>(
    `SELECT id, provider, provider_campaign_id, title, list_id, include_audience_id,
            exclusion_audience_ids, suppression_snapshot, test_recipients, audience_snapshot,
            COALESCE(content_snapshot, '{}'::jsonb) AS content_snapshot,
            requested_send_time, status, counts, scope_account_ids, failure_message,
            requested_by, created_at, updated_at
       FROM campaign_runs
      WHERE id = $1
        AND ($2::uuid[] IS NULL OR scope_account_ids && $2::uuid[])`,
    [runId, scopeAccountIds.length > 0 ? scopeAccountIds : null]
  );
  return result.rows[0] ? mapRunRow(result.rows[0]) : null;
};

export const unsupportedMailchimpRunAction = (
  run: CommunicationCampaignRun,
  message: string
): CommunicationCampaignActionResult => ({
  run,
  action: 'unsupported',
  message,
});

export const retryFailedCampaignRunRecipients = async (
  runId: string,
  requesterScopeAccountIds?: string[]
): Promise<CommunicationCampaignActionResult | null> => {
  const run = await getCampaignRun(runId, requesterScopeAccountIds);
  if (!run) {
    return null;
  }
  if (run.provider === 'mailchimp') {
    return unsupportedMailchimpRunAction(
      run,
      'Failed-recipient retry is only supported for local email campaign runs'
    );
  }
  if (run.status === 'canceled') {
    throw new CampaignRunActionValidationError('Canceled campaign runs cannot be retried');
  }

  const requeuedRecipients = await pool.query<{ id: string }>(
    `UPDATE campaign_run_recipients
        SET status = 'queued',
            provider_message_id = NULL,
            failure_message = NULL,
            sent_at = NULL,
            updated_at = CURRENT_TIMESTAMP
      WHERE campaign_run_id = $1
        AND status = 'failed'
      RETURNING id`,
    [run.id]
  );
  const requeuedRecipientCount = requeuedRecipients.rows.length;

  const result = await pool.query<CampaignRunRow>(
    `UPDATE campaign_runs
        SET counts = COALESCE(counts, '{}'::jsonb) || jsonb_build_object(
              'lastFailedRecipientRetry',
              jsonb_build_object(
                'requestedAt', CURRENT_TIMESTAMP,
                'requeuedRecipientCount', $2::integer,
                'source', 'operator'
              ),
              'failedRecipientRetryCount',
              COALESCE((counts->>'failedRecipientRetryCount')::integer, 0) + 1,
              'queuedRecipientCount',
              COALESCE((counts->>'queuedRecipientCount')::integer, 0) + $2::integer,
              'failedRecipientCount',
              GREATEST(COALESCE((counts->>'failedRecipientCount')::integer, 0) - $2::integer, 0)
            ),
            status = CASE WHEN $2::integer > 0 THEN 'sending' ELSE status END,
            failure_message = CASE WHEN $2::integer > 0 THEN NULL ELSE failure_message END,
            updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, provider, provider_campaign_id, title, list_id, include_audience_id,
                exclusion_audience_ids, suppression_snapshot, test_recipients, audience_snapshot,
                content_snapshot, requested_send_time, status, counts, scope_account_ids,
                failure_message, requested_by, created_at, updated_at`,
    [run.id, requeuedRecipientCount]
  );
  if (!result.rows[0]) {
    throw new CampaignRunActionValidationError('Campaign run was not found');
  }
  const updated = mapRunRow(result.rows[0]);

  return {
    run: updated,
    action: requeuedRecipientCount > 0 ? 'queued' : 'refreshed',
    message:
      requeuedRecipientCount > 0
        ? 'Failed local recipients requeued; send the campaign run again to retry delivery'
        : 'No failed local recipients were available to retry',
  };
};
